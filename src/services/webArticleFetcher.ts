import type { BookMetadata, Chapter } from '../types'

export interface FetchResult {
  metadata: BookMetadata
  chapters: Chapter[]
  rawContent: string
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

  // Strategy 1: Jina Reader API (optimized for converting web/blogs/papers to clean Markdown)
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

  throw new Error('No se pudo extraer el contenido automáticamente debido a restricciones de seguridad del sitio. Puedes pegar el texto o HTML directamente en la pestaña "Texto / Paper".')
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

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/)
    if (headingMatch) {
      const headingText = headingMatch[1].trim()
      if (headingText.toLowerCase() !== title.toLowerCase()) {
        if (currentLines.length > 0) {
          chapters.push({
            id: 'sec-' + (chapters.length + 1),
            title: currentTitle,
            content: markdownLinesToHtml(currentLines),
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
    chapters.push({
      id: 'sec-' + (chapters.length + 1),
      title: currentTitle,
      content: markdownLinesToHtml(currentLines),
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
        content: markdownLinesToHtml(lines),
      }
    ],
    rawContent: markdown,
  }
}

function markdownLinesToHtml(lines: string[]): string {
  const paras: string[] = []
  let cur: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      if (cur.length > 0) {
        paras.push(cur.join(' '))
        cur = []
      }
    } else if (line.startsWith('>')) {
      if (cur.length > 0) {
        paras.push(cur.join(' '))
        cur = []
      }
      paras.push(`<blockquote>${escape(line.replace(/^>\s*/, ''))}</blockquote>`)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (cur.length > 0) {
        paras.push(cur.join(' '))
        cur = []
      }
      paras.push(`<li>${escape(line.substring(2))}</li>`)
    } else {
      cur.push(line)
    }
  }
  if (cur.length > 0) {
    paras.push(cur.join(' '))
  }

  return paras
    .map(p => {
      if (p.startsWith('<blockquote>') || p.startsWith('<li>')) return p
      let formatted = escape(p)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
      return `<p>${formatted}</p>`
    })
    .join('\n')
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

  contentEl.querySelectorAll('script, style, iframe, nav, footer, header, noscript, .ads, .comments').forEach(el => el.remove())

  const paragraphs = Array.from(contentEl.querySelectorAll('p, h2, h3, blockquote'))
    .map(el => {
      const tag = el.tagName.toLowerCase()
      const text = el.textContent?.trim() || ''
      if (!text) return ''
      if (tag === 'h2' || tag === 'h3') return `<h3>${escape(text)}</h3>`
      if (tag === 'blockquote') return `<blockquote>${escape(text)}</blockquote>`
      return `<p>${escape(text)}</p>`
    })
    .filter(Boolean)

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
  }
}

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
