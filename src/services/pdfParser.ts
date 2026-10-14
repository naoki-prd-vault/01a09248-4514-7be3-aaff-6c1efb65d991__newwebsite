import * as pdfjsLib from 'pdfjs-dist'
import type { BookMetadata, Chapter } from '../types'

// Set up worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`
} catch {
  // Fallback will use main thread if worker fails
}

export interface PdfParseResult {
  metadata: Partial<BookMetadata>
  chapters: Chapter[]
  pageCount: number
  rawText: string
  extractedImagesCount: number
}

interface PdfTextToken {
  str: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontName: string
  isBold: boolean
}

interface PdfLine {
  text: string
  y: number
  x: number
  fontSize: number
  isBold: boolean
  isCentered?: boolean
  tokens: PdfTextToken[]
}

function convertPdfImageToDataUrl(imgData: any): string | null {
  try {
    if (!imgData) return null

    // Case 1: ImageBitmap, HTMLImageElement or Canvas
    if (
      (typeof ImageBitmap !== 'undefined' && imgData instanceof ImageBitmap) ||
      (typeof HTMLImageElement !== 'undefined' && imgData instanceof HTMLImageElement) ||
      (typeof HTMLCanvasElement !== 'undefined' && imgData instanceof HTMLCanvasElement)
    ) {
      if (imgData.width < 25 || imgData.height < 25) return null
      const canvas = document.createElement('canvas')
      canvas.width = imgData.width
      canvas.height = imgData.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(imgData, 0, 0)
      return canvas.toDataURL('image/jpeg', 0.85)
    }

    // Case 2: Object with { width, height, data }
    const width = imgData.width
    const height = imgData.height
    const data = imgData.data

    if (!width || !height || !data || width < 25 || height < 25) {
      return null
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const imgDataObj = ctx.createImageData(width, height)
    const target = imgDataObj.data
    const totalPixels = width * height

    if (data.length === totalPixels * 4) {
      target.set(data)
    } else if (data.length === totalPixels * 3) {
      let j = 0
      for (let i = 0; i < data.length; i += 3) {
        target[j] = data[i]
        target[j + 1] = data[i + 1]
        target[j + 2] = data[i + 2]
        target[j + 3] = 255
        j += 4
      }
    } else if (data.length === totalPixels) {
      let j = 0
      for (let i = 0; i < data.length; i++) {
        const val = data[i]
        target[j] = val
        target[j + 1] = val
        target[j + 2] = val
        target[j + 3] = 255
        j += 4
      }
    } else {
      return null
    }

    ctx.putImageData(imgDataObj, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch (err) {
    console.warn('Error converting PDF image to data URL', err)
    return null
  }
}

async function extractImagesFromPdfPage(
  page: pdfjsLib.PDFPageProxy,
  pageNumber: number
): Promise<string[]> {
  const images: string[] = []

  try {
    const operatorList = await page.getOperatorList()
    const imageNames: string[] = []

    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fn = operatorList.fnArray[i]
      if (
        fn === pdfjsLib.OPS.paintImageXObject ||
        fn === pdfjsLib.OPS.paintImageMaskXObject
      ) {
        const name = operatorList.argsArray[i]?.[0]
        if (typeof name === 'string' && !imageNames.includes(name)) {
          imageNames.push(name)
        }
      }
    }

    for (const name of imageNames) {
      try {
        const imgObj = await new Promise<any>((resolve) => {
          let resolved = false
          const timer = setTimeout(() => {
            if (!resolved) {
              resolved = true
              resolve(null)
            }
          }, 800)

          try {
            if (page.objs && typeof (page.objs as any).get === 'function') {
              ;(page.objs as any).get(name, (obj: any) => {
                if (!resolved) {
                  resolved = true
                  clearTimeout(timer)
                  resolve(obj)
                }
              })
            } else {
              clearTimeout(timer)
              resolve(null)
            }
          } catch {
            if (!resolved) {
              resolved = true
              clearTimeout(timer)
              resolve(null)
            }
          }
        })

        if (imgObj) {
          const dataUrl = convertPdfImageToDataUrl(imgObj)
          if (dataUrl) {
            images.push(dataUrl)
          }
        }
      } catch (err) {
        console.warn(`Failed to extract image ${name} on page ${pageNumber}:`, err)
      }
    }
  } catch (err) {
    console.warn(`Error scanning operator list on page ${pageNumber}:`, err)
  }

  return images
}

export async function parsePdfFile(
  file: File,
  onProgress?: (progress: { current: number; total: number; stage: string }) => void
): Promise<PdfParseResult> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  })

  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages

  let docTitle = file.name.replace(/\.[^/.]+$/, '')
  let docAuthor = ''

  try {
    const meta = await pdf.getMetadata()
    const info = meta.info as Record<string, unknown> | undefined
    if (info) {
      if (typeof info.Title === 'string' && info.Title.trim()) {
        docTitle = info.Title.trim()
      }
      if (typeof info.Author === 'string' && info.Author.trim()) {
        docAuthor = info.Author.trim()
      }
    }
  } catch (err) {
    console.warn('Could not read PDF metadata', err)
  }

  interface PageData {
    pageNumber: number
    lines: PdfLine[]
    images: string[]
    pageWidth: number
    pageHeight: number
  }

  const pagesData: PageData[] = []
  let fullText = ''
  let totalExtractedImages = 0
  const allFontSizes: number[] = []

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.({
      current: i,
      total: pageCount,
      stage: `Analizando estructura y tipografía de página ${i} de ${pageCount}...`,
    })

    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.0 })
    const textContent = await page.getTextContent()

    // 1. Extract tokens with spatial coordinates and font size
    const tokens: PdfTextToken[] = []
    for (const item of textContent.items) {
      if ('str' in item && 'transform' in item && Array.isArray(item.transform)) {
        const text = item.str
        if (!text) continue

        // transform: [scaleX, skewY, skewX, scaleY, tx, ty]
        const tx = item.transform[4]
        const ty = item.transform[5]
        const scaleX = Math.hypot(item.transform[0], item.transform[1])
        const scaleY = Math.hypot(item.transform[2], item.transform[3])
        const fontSize = Math.max(scaleX, scaleY) || item.height || 10
        const fontName = ('fontName' in item && typeof item.fontName === 'string') ? item.fontName : ''
        const isBold = /bold|black|heavy|semibold/i.test(fontName)

        if (text.trim().length > 0) {
          allFontSizes.push(fontSize)
        }

        tokens.push({
          str: text,
          x: tx,
          y: ty,
          width: item.width || text.length * (fontSize * 0.5),
          height: item.height || fontSize,
          fontSize,
          fontName,
          isBold,
        })
      }
    }

    // 2. Sort tokens top-to-bottom (y descending), left-to-right (x ascending)
    tokens.sort((a, b) => {
      const dy = Math.abs(a.y - b.y)
      if (dy < 4) {
        return a.x - b.x
      }
      return b.y - a.y // higher Y in PDF is higher on page
    })

    // 3. Group tokens into lines based on Y-proximity
    const lines: PdfLine[] = []
    let currentLineTokens: PdfTextToken[] = []
    let currentLineY: number | null = null

    for (const token of tokens) {
      if (currentLineY === null || Math.abs(token.y - currentLineY) < Math.max(4, token.fontSize * 0.45)) {
        currentLineTokens.push(token)
        if (currentLineY === null) currentLineY = token.y
      } else {
        if (currentLineTokens.length > 0) {
          lines.push(buildPdfLine(currentLineTokens, currentLineY!))
        }
        currentLineTokens = [token]
        currentLineY = token.y
      }
    }
    if (currentLineTokens.length > 0 && currentLineY !== null) {
      lines.push(buildPdfLine(currentLineTokens, currentLineY))
    }

    // 4. Extract embedded images
    let pageImages = await extractImagesFromPdfPage(page, i)

    // Fallback: graphical page render if page has virtually no text
    const pagePlainText = lines.map(l => l.text).join(' ').trim()
    if (pagePlainText.length < 35 && pageImages.length === 0) {
      try {
        const renderViewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        canvas.width = renderViewport.width
        canvas.height = renderViewport.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport: renderViewport, canvas }).promise
          const pageImg = canvas.toDataURL('image/jpeg', 0.85)
          pageImages = [pageImg]
        }
      } catch (err) {
        console.warn('Page canvas render fallback failed', err)
      }
    }

    totalExtractedImages += pageImages.length

    pagesData.push({
      pageNumber: i,
      lines,
      images: pageImages,
      pageWidth: viewport.width,
      pageHeight: viewport.height,
    })

    fullText += lines.map(l => l.text).join('\n') + '\n\n'
  }

  // 5. Determine base font size (median/mode) to reliably recognize titles, headings, and subtitles
  allFontSizes.sort((a, b) => a - b)
  const baseFontSize = allFontSizes.length > 0
    ? allFontSizes[Math.floor(allFontSizes.length * 0.5)]
    : 11

  // 6. Format pages into structured HTML blocks with titles, dividers, lists and proper spacing
  const formattedSections = processPdfPagesToSections(pagesData, baseFontSize, docTitle)

  return {
    metadata: {
      title: docTitle,
      author: docAuthor || 'Autor del Documento',
      originalFilename: file.name,
    },
    chapters: formattedSections.length > 0 ? formattedSections : [
      {
        id: 'chap-1',
        title: docTitle,
        content: '<p>Documento procesado con éxito.</p>',
      },
    ],
    pageCount,
    rawText: fullText,
    extractedImagesCount: totalExtractedImages,
  }
}

function buildPdfLine(tokens: PdfTextToken[], y: number): PdfLine {
  // Sort tokens horizontally
  tokens.sort((a, b) => a.x - b.x)

  let lineText = ''
  let lastXEnd = 0
  let maxFontSize = 0
  let hasBold = false

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.fontSize > maxFontSize) maxFontSize = t.fontSize
    if (t.isBold) hasBold = true

    if (i === 0) {
      lineText += t.str
    } else {
      const spaceWidth = t.fontSize * 0.28
      const gap = t.x - lastXEnd
      if (gap > spaceWidth && !lineText.endsWith(' ') && !t.str.startsWith(' ')) {
        lineText += ' '
      }
      lineText += t.str
    }
    lastXEnd = t.x + t.width
  }

  return {
    text: lineText.trim(),
    y,
    x: tokens[0]?.x || 0,
    fontSize: maxFontSize,
    isBold: hasBold,
    tokens,
  }
}

/**
 * Parses lines across all pages into clean, semantic HTML with:
 * - Proper Titles (H1), Headings (H2), Subheadings (H3, H4)
 * - Section Dividers (<hr class="epub-divider"/>)
 * - Bullet / Numbered Lists (<ul><li>, <ol><li>)
 * - Paragraph breaks with spacing preserved
 * - De-hyphenated lines (e.g. "connec- \n tion" -> "connection")
 * - Filtered running headers / footers / page numbers
 */
function processPdfPagesToSections(
  pages: { pageNumber: number; lines: PdfLine[]; images: string[]; pageWidth: number; pageHeight: number }[],
  baseFontSize: number,
  fallbackTitle: string
): Chapter[] {
  const chapters: Chapter[] = []
  const majorHeadingRegex = /^(cap[ií]tulo\s+\d+|chapter\s+\d+|secci[oó]n\s+\d+|\d+\.?\s+[A-ZÁÉÍÓÚÑ]{2,}|resumen|abstract|introducci[oó]n|conclusi[oó]n|conclusiones|referencias|references|agradecimientos|acknowledgements|ap[eé]ndice|appendix)/i

  let currentChapterTitle = fallbackTitle || 'Inicio'
  let currentHtmlBlocks: string[] = []

  // Check if we have detected headings that qualify as chapter boundaries
  let detectedChapterCount = 0
  for (const page of pages) {
    for (const line of page.lines) {
      const text = line.text.trim()
      const isLargeHeading = line.fontSize >= baseFontSize * 1.35 && text.length < 80
      const isPatternHeading = majorHeadingRegex.test(text) && text.length < 90
      if (isLargeHeading || isPatternHeading) {
        detectedChapterCount++
      }
    }
  }

  // Iterate over each page
  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const page = pages[pIdx]
    const filteredLines: PdfLine[] = []

    // 1. Suppress running header & footer (e.g. single digit page number alone at bottom/top)
    for (let lIdx = 0; lIdx < page.lines.length; lIdx++) {
      const line = page.lines[lIdx]
      const text = line.text.trim()
      if (!text) continue

      // Solitary page number check: e.g. "1" or "- 1 -" or "Página 1"
      const isPageNum = /^(\d+|-\s*\d+\s*-|p[aá]g\.?\s*\d+|page\s*\d+)$/i.test(text)
      const isAtEdge = lIdx === 0 || lIdx === page.lines.length - 1
      if (isPageNum && isAtEdge) {
        continue
      }
      filteredLines.push(line)
    }

    // 2. Process lines into paragraphs, headings, lists, dividers
    let currentParagraphText = ''
    let inList = false
    let listItems: string[] = []
    let lastLineY: number | null = null
    let lastLineFontSize = baseFontSize

    const flushList = () => {
      if (inList && listItems.length > 0) {
        currentHtmlBlocks.push(
          `<ul class="epub-list">\n${listItems.map((item) => `  <li>${escapeText(item)}</li>`).join('\n')}\n</ul>`
        )
        listItems = []
        inList = false
      }
    }

    const flushParagraph = () => {
      if (currentParagraphText.trim()) {
        flushList()
        currentHtmlBlocks.push(`<p>${formatInlineTypography(currentParagraphText.trim())}</p>`)
        currentParagraphText = ''
      }
    }

    for (let lIdx = 0; lIdx < filteredLines.length; lIdx++) {
      const line = filteredLines[lIdx]
      const text = line.text.trim()
      if (!text) continue

      const isLargeFont = line.fontSize >= baseFontSize * 1.3
      const isMediumHeading = line.fontSize >= baseFontSize * 1.15 || (line.isBold && text.length < 70)
      const isNumberedSection = /^(\d+(\.\d+)*)\s+([A-ZÁÉÍÓÚÑ].{2,65})$/.test(text)
      const isMajorHeadingPattern = majorHeadingRegex.test(text) && text.length < 90

      // Check if this line is an explicit Divider (e.g., "* * *", "---", "___", "•••")
      if (/^(\*{3,}|-{3,}|_{3,}|•{3,}|(\*\s*){3,})$/.test(text)) {
        flushParagraph()
        flushList()
        currentHtmlBlocks.push('<hr class="epub-divider" />')
        lastLineY = line.y
        continue
      }

      // Check if this is a List Item (bullet, hyphen, or "1. ", "a) ")
      const listBulletMatch = text.match(/^([•\-\–\*\u2022]|\d+[\.\)]|[a-zA-Z][\.\)])\s+(.+)$/)
      if (listBulletMatch) {
        flushParagraph()
        inList = true
        listItems.push(listBulletMatch[2].trim())
        lastLineY = line.y
        continue
      } else if (inList) {
        // If still in list and indented or short line, continue list item or flush
        const prevItem = listItems[listItems.length - 1]
        if (prevItem && !text.endsWith('.') && text.length < 80 && !isLargeFont && !isMediumHeading) {
          listItems[listItems.length - 1] = prevItem + ' ' + text
          lastLineY = line.y
          continue
        } else {
          flushList()
        }
      }

      // Check if this is a Major Chapter Heading
      if ((isLargeFont && text.length < 75) || isMajorHeadingPattern) {
        flushParagraph()
        flushList()

        if (detectedChapterCount >= 2 && currentHtmlBlocks.length > 0) {
          // Commit previous chapter
          chapters.push({
            id: `chap-${chapters.length + 1}`,
            title: currentChapterTitle,
            content: currentHtmlBlocks.join('\n\n'),
          })
          currentHtmlBlocks = []
          currentChapterTitle = text.replace(/^[#\s]+/, '').replace(/^cap[ií]tulo\s+\d+[:\.\s]*/i, '') || text
        } else {
          currentHtmlBlocks.push(`<h2>${escapeText(text)}</h2>`)
        }
        lastLineY = line.y
        continue
      }

      // Check if this is a Subheading (H3 or H4)
      if (isMediumHeading || isNumberedSection) {
        flushParagraph()
        flushList()
        const tag = line.fontSize >= baseFontSize * 1.2 ? 'h3' : 'h4'
        currentHtmlBlocks.push(`<${tag}>${escapeText(text)}</${tag}>`)
        lastLineY = line.y
        continue
      }

      // Regular paragraph line
      // Check for paragraph gap spacing (empty line or vertical jump in PDF)
      const isVerticalGap = lastLineY !== null && Math.abs(lastLineY - line.y) > (lastLineFontSize * 1.7)
      if (isVerticalGap && currentParagraphText.trim()) {
        flushParagraph()
      }

      // De-hyphenate line wrap (e.g. "impor-" + "tante" -> "importante")
      if (currentParagraphText.endsWith('-') && !currentParagraphText.endsWith(' -')) {
        currentParagraphText = currentParagraphText.slice(0, -1) + text
      } else {
        currentParagraphText += (currentParagraphText ? ' ' : '') + text
      }

      lastLineY = line.y
      lastLineFontSize = line.fontSize
    }

    flushParagraph()
    flushList()

    // 3. Attach images detected on this page
    if (page.images.length > 0) {
      for (let imgIdx = 0; imgIdx < page.images.length; imgIdx++) {
        const imgUrl = page.images[imgIdx]
        currentHtmlBlocks.push(
          `<figure class="epub-figure">
  <img src="${imgUrl}" alt="Figura pág. ${page.pageNumber}" />
  <figcaption>Figura ilustrativa (Pág. ${page.pageNumber})</figcaption>
</figure>`
        )
      }
    }

    // Insert an elegant subtle section divider between pages if chapter has substantial content
    if (pIdx < pages.length - 1 && detectedChapterCount < 2 && page.lines.length > 3) {
      currentHtmlBlocks.push('<hr class="epub-divider" />')
    }
  }

  // Push remaining content
  if (currentHtmlBlocks.length > 0) {
    chapters.push({
      id: `chap-${chapters.length + 1}`,
      title: currentChapterTitle,
      content: currentHtmlBlocks.join('\n\n'),
    })
  }

  // If only 1 huge chapter resulted from a multi-page document without headings,
  // group logically by pages to keep reading comfortable:
  if (chapters.length <= 1 && pages.length > 6) {
    const pPerChap = pages.length > 20 ? 5 : 3
    const groupedChapters: Chapter[] = []
    for (let i = 0; i < pages.length; i += pPerChap) {
      const slice = pages.slice(i, i + pPerChap)
      const start = i + 1
      const end = Math.min(i + pPerChap, pages.length)
      const title = start === end ? `Sección (Pág. ${start})` : `Sección ${Math.floor(i / pPerChap) + 1} (Págs. ${start} - ${end})`

      const parts: string[] = []
      for (const p of slice) {
        // extract paras
        const linesText = p.lines.map(l => l.text)
        const paras = linesText.join('\n').split(/\n\s*\n/).filter(Boolean)
        paras.forEach(para => parts.push(`<p>${formatInlineTypography(para.trim())}</p>`))
        p.images.forEach(img => {
          parts.push(
            `<figure class="epub-figure"><img src="${img}" alt="Figura" /><figcaption>Ilustración (Pág. ${p.pageNumber})</figcaption></figure>`
          )
        })
      }

      groupedChapters.push({
        id: `chap-${groupedChapters.length + 1}`,
        title,
        content: parts.join('\n\n'),
      })
    }
    return groupedChapters
  }

  return chapters
}

function escapeText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatInlineTypography(text: string): string {
  let escaped = escapeText(text)
  // Preserve bold quotes or citations
  escaped = escaped.replace(/"([^"]{4,})"/g, '«$1»')
  return escaped
}
