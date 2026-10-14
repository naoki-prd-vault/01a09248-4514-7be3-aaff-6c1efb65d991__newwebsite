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
}

interface ValidPdfTextItem {
  str: string
  transform: number[]
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

  const pagesText: { pageNumber: number; text: string; lines: string[] }[] = []
  let fullText = ''

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.({
      current: i,
      total: pageCount,
      stage: `Extrayendo página ${i} de ${pageCount}...`,
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
    
    // Simple line grouping by Y-coordinate
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
    pagesText.push({ pageNumber: i, text: pageJoined, lines })
    fullText += pageJoined + '\n\n'
  }

  // Detect chapters:
  const chapters: Chapter[] = []
  const chapterRegex = /^(cap[ií]tulo\s+\d+|chapter\s+\d+|secci[oó]n\s+\d+|\d+\.\s+[A-ZÁÉÍÓÚÑ]|resumen|abstract|introducci[oó]n|conclusi[oó]n|referencias|references)/i

  let currentChapTitle = 'Inicio'
  let currentChapParas: string[] = []

  // Split full text into paragraphs
  const allParagraphs = fullText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)

  for (const para of allParagraphs) {
    const firstLine = para.split('\n')[0].trim()
    const isHeading = firstLine.length < 90 && chapterRegex.test(firstLine)

    if (isHeading && currentChapParas.length > 0) {
      chapters.push({
        id: 'chap-' + (chapters.length + 1),
        title: currentChapTitle,
        content: currentChapParas.map(p => `<p>${escapeText(p)}</p>`).join('\n'),
      })
      currentChapTitle = firstLine.replace(/^[#\s]+/, '')
      const rest = para.substring(firstLine.length).trim()
      currentChapParas = rest ? [rest] : []
    } else {
      currentChapParas.push(para)
    }
  }

  if (currentChapParas.length > 0) {
    chapters.push({
      id: 'chap-' + (chapters.length + 1),
      title: currentChapTitle,
      content: currentChapParas.map(p => `<p>${escapeText(p)}</p>`).join('\n'),
    })
  }

  // Fallback: If heuristic detected only 1 huge chapter or 0 chapters and pageCount > 2, group by pages
  let finalChapters = chapters
  if (chapters.length <= 1 && pageCount > 2) {
    const pagesPerChapter = pageCount > 20 ? 5 : 2
    finalChapters = []
    for (let i = 0; i < pagesText.length; i += pagesPerChapter) {
      const slice = pagesText.slice(i, i + pagesPerChapter)
      const startPage = i + 1
      const endPage = Math.min(i + pagesPerChapter, pageCount)
      const title = startPage === endPage ? `Página ${startPage}` : `Páginas ${startPage} - ${endPage}`
      const content = slice
        .map(p => {
          const paras = p.text.split(/\n\s*\n/).filter(Boolean)
          return paras.map(para => `<p>${escapeText(para)}</p>`).join('\n')
        })
        .join('\n<hr/>\n')

      finalChapters.push({
        id: `page-group-${i + 1}`,
        title,
        content,
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
        content: allParagraphs.map(p => `<p>${escapeText(p)}</p>`).join('\n') || '<p>Sin texto extraído.</p>',
      }
    ],
    pageCount,
    rawText: fullText,
  }
}

function escapeText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
