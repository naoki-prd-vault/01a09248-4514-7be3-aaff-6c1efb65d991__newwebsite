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

interface ValidPdfTextItem {
  str: string
  transform: number[]
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
      // RGBA
      target.set(data)
    } else if (data.length === totalPixels * 3) {
      // RGB
      let j = 0
      for (let i = 0; i < data.length; i += 3) {
        target[j] = data[i]
        target[j + 1] = data[i + 1]
        target[j + 2] = data[i + 2]
        target[j + 3] = 255
        j += 4
      }
    } else if (data.length === totalPixels) {
      // Grayscale
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
      // Unknown format or 1-bit mask
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

    // Attempt to retrieve images from page.objs or commonObjs
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

  // Attempt to read metadata from PDF
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

  const pagesData: {
    pageNumber: number
    text: string
    lines: string[]
    images: string[]
  }[] = []
  let fullText = ''
  let totalExtractedImages = 0

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.({
      current: i,
      total: pageCount,
      stage: `Procesando página ${i} de ${pageCount} (texto e imágenes)...`,
    })

    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()

    // Collect valid text items
    const items: ValidPdfTextItem[] = []
    for (const rawItem of textContent.items) {
      if ('str' in rawItem && 'transform' in rawItem && Array.isArray(rawItem.transform)) {
        items.push({ str: rawItem.str, transform: rawItem.transform })
      }
    }

    // Line grouping by Y-coordinate
    let lastY: number | null = null
    const lines: string[] = []
    let currentLine = ''

    for (const item of items) {
      const y = item.transform[5]
      if (lastY === null || Math.abs(y - lastY) < 4) {
        currentLine += (currentLine ? ' ' : '') + item.str
      } else {
        if (currentLine.trim()) {
          lines.push(currentLine.trim())
        }
        currentLine = item.str
      }
      lastY = y
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim())
    }

    const pageJoined = lines.join('\n')

    // Extract images from this page
    let pageImages = await extractImagesFromPdfPage(page, i)

    // Fallback: If page has essentially no text (e.g. scanned page or full graphic), render page as visual image
    if (pageJoined.trim().length < 35 && pageImages.length === 0) {
      try {
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport, canvas }).promise
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
      text: pageJoined,
      lines,
      images: pageImages,
    })
    fullText += pageJoined + '\n\n'
  }

  // Detect chapters and integrate their respective images:
  const chapters: Chapter[] = []
  const chapterRegex = /^(cap[ií]tulo\s+\d+|chapter\s+\d+|secci[oó]n\s+\d+|\d+\.\s+[A-ZÁÉÍÓÚÑ]|resumen|abstract|introducci[oó]n|conclusi[oó]n|referencias|references)/i

  // If group by pages (short document or uniform distribution):
  const pagesPerChapter = pageCount > 20 ? 5 : (pageCount > 8 ? 3 : 1)
  
  // First test if headings exist
  let foundHeadings = 0
  for (const p of pagesData) {
    for (const l of p.lines) {
      if (l.length < 80 && chapterRegex.test(l)) {
        foundHeadings++
      }
    }
  }

  if (foundHeadings >= 2) {
    // Build chapters by headings, carrying over images from pages
    let currentChapTitle = 'Inicio'
    let currentChapHtmlParts: string[] = []

    for (const p of pagesData) {
      // Paragraphs in page
      const pageParas = p.text.split(/\n\s*\n/).map(t => t.trim()).filter(Boolean)

      for (const para of pageParas) {
        const firstLine = para.split('\n')[0].trim()
        const isHeading = firstLine.length < 85 && chapterRegex.test(firstLine)

        if (isHeading && currentChapHtmlParts.length > 0) {
          chapters.push({
            id: 'chap-' + (chapters.length + 1),
            title: currentChapTitle,
            content: currentChapHtmlParts.join('\n'),
          })
          currentChapTitle = firstLine.replace(/^[#\s]+/, '')
          const rest = para.substring(firstLine.length).trim()
          currentChapHtmlParts = rest ? [`<p>${escapeText(rest)}</p>`] : []
        } else {
          currentChapHtmlParts.push(`<p>${escapeText(para)}</p>`)
        }
      }

      // Add images found on this page into the chapter body
      if (p.images.length > 0) {
        for (let imgIdx = 0; imgIdx < p.images.length; imgIdx++) {
          const imgUrl = p.images[imgIdx]
          currentChapHtmlParts.push(
            `<figure class="epub-figure"><img src="${imgUrl}" alt="Figura pág. ${p.pageNumber}" /><figcaption>Figura ilustrativa (Pág. ${p.pageNumber})</figcaption></figure>`
          )
        }
      }
    }

    if (currentChapHtmlParts.length > 0) {
      chapters.push({
        id: 'chap-' + (chapters.length + 1),
        title: currentChapTitle,
        content: currentChapHtmlParts.join('\n'),
      })
    }
  }

  // Fallback: group by pages if headings were sparse or absent
  let finalChapters = chapters
  if (finalChapters.length <= 1) {
    finalChapters = []
    for (let i = 0; i < pagesData.length; i += pagesPerChapter) {
      const slice = pagesData.slice(i, i + pagesPerChapter)
      const startPage = i + 1
      const endPage = Math.min(i + pagesPerChapter, pageCount)
      const title = startPage === endPage ? `Página ${startPage}` : `Páginas ${startPage} - ${endPage}`

      const parts: string[] = []
      for (const p of slice) {
        const paras = p.text.split(/\n\s*\n/).map(t => t.trim()).filter(Boolean)
        paras.forEach(para => parts.push(`<p>${escapeText(para)}</p>`))

        // Embed images
        p.images.forEach((imgUrl, imgIdx) => {
          parts.push(
            `<figure class="epub-figure"><img src="${imgUrl}" alt="Figura pág. ${p.pageNumber}" /><figcaption>Figura ${imgIdx + 1} (Pág. ${p.pageNumber})</figcaption></figure>`
          )
        })
      }

      finalChapters.push({
        id: `page-group-${i + 1}`,
        title,
        content: parts.join('\n') || '<p>Contenido extraído del documento.</p>',
      })
    }
  }

  return {
    metadata: {
      title: docTitle,
      author: docAuthor || 'Autor del Documento',
      originalFilename: file.name,
    },
    chapters: finalChapters.length > 0 ? finalChapters : [
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

function escapeText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
