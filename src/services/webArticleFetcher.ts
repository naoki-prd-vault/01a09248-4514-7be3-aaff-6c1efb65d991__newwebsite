import type { BookMetadata, Chapter } from '../types'

export interface FetchResult {
  metadata: BookMetadata
  chapters: Chapter[]
  rawContent: string
  imageCount: number
}

export async function fetchWebArticle(
  url: string,
  onStatus?: (status: string) => void
): Promise<FetchResult> {
  let targetUrl = url.trim()
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl
  }

  onStatus?.('Conectando y extrayendo contenido del artículo...')

  // Strategy 1: Jina Reader API (optimized for converting web/blogs/papers to clean Markdown with images)
  try {
    const jinaUrl = `https://r.jina.ai/${targetUrl}`
    const response = await fetch(jinaUrl, {
      headers: {
        Accept: 'text/markdown',
      },
    })

    if (response.ok) {
      const text = await response.text()
      if (text && text.trim().length > 100) {
        return parseMarkdownArticle(text, targetUrl)
      }
    }
  } catch (err) {
    console.warn('Jina fetch failed, trying fallback...', err)
  }

  // Strategy 2: CORS proxy fallback
  onStatus?.('Intentando vía proxy secundario...')
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`
    const res = await fetch(proxyUrl)
    if (res.ok) {
      const data = await res.json()
      const html = data.contents
      if (html && typeof html === 'string' && html.length > 200) {
        return parseHtmlArticle(html, targetUrl)
      }
    }
  } catch (err) {
    console.warn('AllOrigins proxy failed', err)
  }

  throw new Error('No se pudo extraer el contenido automáticamente debido a restricciones del sitio. Puedes usar la pestaña "Texto o Markdown" para importar el texto.')
}

function parseMarkdownArticle(markdown: string, originalUrl: string): FetchResult {
  const lines = markdown.split('\n')
  let title = ''
  let author = ''

  // Look for Title in lines
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i].trim()
    if (line.startsWith('Title:') || line.startsWith('# ')) {
      title = line.replace(/^(Title:\s*|#\s*)/, '').trim()
      break
    }
  }

  // Look for Author
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const line = lines[i].trim()
    if (line.match(/^(Author|By|Por|Autor):\s*(.+)/i)) {
      author = line.replace(/^(Author|By|Por|Autor):\s*/i, '').trim()
      break
    }
  }

  if (!title) {
    try {
      const parsedUrl = new URL(originalUrl)
      title = parsedUrl.pathname.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ') || 'Artículo Web'
    } catch {
      title = 'Artículo Web'
    }
  }

  // Split into sections by heading (# or ## or ###)
  const chapters: Chapter[] = []
  let currentTitle = 'Introducción'
  let currentLines: string[] = []
  let totalImages = 0

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/)
    if (headingMatch) {
      const headingText = headingMatch[1].trim()
      if (headingText.toLowerCase() !== title.toLowerCase()) {
        if (currentLines.length > 0) {
          const { html, imgCount } = markdownLinesToHtml(currentLines, originalUrl)
          totalImages += imgCount
          chapters.push({
            id: 'sec-' + (chapters.length + 1),
            title: currentTitle,
            content: html,
          })
          currentLines = []
        }
        currentTitle = headingText
        continue
      }
    }
    currentLines.push(line)
  }

  if (currentLines.length > 0) {
    const { html, imgCount } = markdownLinesToHtml(currentLines, originalUrl)
    totalImages += imgCount
    chapters.push({
      id: 'sec-' + (chapters.length + 1),
      title: currentTitle,
      content: html,
    })
  }

  return {
    metadata: {
      title,
      author: author || 'Autor del Blog',
      sourceUrl: originalUrl,
      publisher: new URL(originalUrl).hostname.replace('www.', ''),
      language: 'es',
    },
    chapters: chapters.length > 0 ? chapters : [
      {
        id: 'sec-1',
        title: title,
        content: markdownLinesToHtml(lines, originalUrl).html,
      }
    ],
    rawContent: markdown,
    imageCount: totalImages,
  }
}

function markdownLinesToHtml(lines: string[], baseUrl: string): { html: string; imgCount: number } {
  const parts: string[] = []
  let curPara: string[] = []
  let imgCount = 0

  const flushPara = () => {
    if (curPara.length > 0) {
      const text = curPara.join(' ')
      let formatted = escape(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
      parts.push(`<p>${formatted}</p>`)
      curPara = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushPara()
      continue
    }

    // Check for markdown image: ![alt](url)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      flushPara()
      const alt = imgMatch[1].trim()
      let imgUrl = imgMatch[2].trim()
      // remove optional quotes in url
      imgUrl = imgUrl.split(/\s+"/)[0]

      try {
        imgUrl = new URL(imgUrl, baseUrl).href
      } catch {
        // Keep as is
      }

      imgCount++
      parts.push(
        `<figure class="epub-figure"><img src="${imgUrl}" alt="${escape(alt || 'Ilustración')}" /><figcaption>${escape(alt || 'Ilustración del artículo')}</figcaption></figure>`
      )
      continue
    }

    if (line.startsWith('>')) {
      flushPara()
      parts.push(`<blockquote>${escape(line.replace(/^>\s*/, ''))}</blockquote>`)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      flushPara()
      parts.push(`<li>${escape(line.substring(2))}</li>`)
    } else {
      curPara.push(line)
    }
  }
  flushPara()

  return { html: parts.join('\n'), imgCount }
}

function parseHtmlArticle(html: string, originalUrl: string): FetchResult {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const title =
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    doc.querySelector('h1')?.textContent ||
    doc.title ||
    'Artículo Web'

  const author =
    doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
    doc.querySelector('meta[property="article:author"]')?.getAttribute('content') ||
    doc.querySelector('.author, .byline, [rel="author"]')?.textContent?.trim() ||
    new URL(originalUrl).hostname.replace('www.', '')

  const contentEl =
    doc.querySelector('article') ||
    doc.querySelector('.post-content, .entry-content, .article-content, main') ||
    doc.body

  // Remove scripts, styles, forms, navigation and ads
  contentEl.querySelectorAll('script, style, iframe, nav, footer, header, noscript, .ads, .comments, form').forEach(el => el.remove())

  let imageCount = 0
  const elements = Array.from(contentEl.querySelectorAll('p, h2, h3, blockquote, figure, img'))
  const paragraphs: string[] = []

  elements.forEach((el) => {
    const tag = el.tagName.toLowerCase()

    if (tag === 'img') {
      // If already inside figure, avoid double inclusion
      if (el.closest('figure')) return

      const imgEl = el as HTMLImageElement
      let src = imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original') || imgEl.getAttribute('src') || ''
      if (!src) return

      try {
        src = new URL(src, originalUrl).href
      } catch {
        // Keep as is
      }

      const alt = imgEl.getAttribute('alt') || 'Imagen del artículo'
      if (!src.includes('1x1') && !src.includes('tracking') && !src.includes('pixel')) {
        imageCount++
        paragraphs.push(
          `<figure class="epub-figure"><img src="${src}" alt="${escape(alt)}" /><figcaption>${escape(alt)}</figcaption></figure>`
        )
      }
      return
    }

    if (tag === 'figure') {
      const img = el.querySelector('img')
      if (img) {
        let src = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('src') || ''
        if (src) {
          try {
            src = new URL(src, originalUrl).href
          } catch {
            // Keep as is
          }
          const alt = img.getAttribute('alt') || el.querySelector('figcaption')?.textContent?.trim() || 'Ilustración'
          const caption = el.querySelector('figcaption')?.textContent?.trim() || alt
          imageCount++
          paragraphs.push(
            `<figure class="epub-figure"><img src="${src}" alt="${escape(alt)}" /><figcaption>${escape(caption)}</figcaption></figure>`
          )
        }
      }
      return
    }

    const text = el.textContent?.trim() || ''
    if (!text) return
    if (tag === 'h2' || tag === 'h3') {
      paragraphs.push(`<h3>${escape(text)}</h3>`)
    } else if (tag === 'blockquote') {
      paragraphs.push(`<blockquote>${escape(text)}</blockquote>`)
    } else {
      paragraphs.push(`<p>${escape(text)}</p>`)
    }
  })

  return {
    metadata: {
      title: title.trim(),
      author: author.trim(),
      sourceUrl: originalUrl,
      publisher: new URL(originalUrl).hostname.replace('www.', ''),
      language: 'es',
    },
    chapters: [
      {
        id: 'sec-1',
        title: title.trim(),
        content: paragraphs.join('\n') || '<p>Contenido importado de la web.</p>',
      },
    ],
    rawContent: contentEl.innerHTML,
    imageCount,
  }
}

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
