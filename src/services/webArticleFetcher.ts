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

  // Strategy 1: Jina Reader API (optimized for web/blogs/papers to Markdown with images and rich structure)
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
    console.warn('Jina fetch failed, trying fallback proxy...', err)
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

/**
 * Parses Markdown formatted articles with full support for:
 * - Titles (H1, H2) and Subheadings (H3, H4)
 * - Section Dividers (---, ***, ___)
 * - Code Blocks (```) and Inline Code (`)
 * - Blockquotes (>)
 * - Lists (ordered and unordered)
 * - Images (![alt](url))
 * - Formatting (**bold**, *italic*, etc.)
 * - Logical Section / Chapter splitting
 */
export function parseMarkdownArticle(markdown: string, originalUrl: string): FetchResult {
  const lines = markdown.split('\n')
  let title = ''
  let author = ''

  // Look for Title in top lines
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i].trim()
    if (line.startsWith('Title:') || line.startsWith('# ')) {
      title = line.replace(/^(Title:\s*|#\s*)/, '').trim()
      break
    }
  }

  // Look for Author in top lines
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
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

  // Group lines into sections split by top-level headings (# or ##)
  interface SectionDraft {
    title: string
    lines: string[]
  }

  const sections: SectionDraft[] = []
  let currentSecTitle = 'Introducción'
  let currentLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Omit title/author headers from initial body text if already captured in metadata
    if (i < 8 && (trimmed.startsWith('Title:') || trimmed.startsWith('# ') || trimmed.match(/^(Author|By|Por|Autor):/i))) {
      continue
    }

    // Check for H1 or H2 markdown heading
    const majorHeading = line.match(/^#{1,2}\s+(.+)$/)
    if (majorHeading) {
      const headingText = majorHeading[1].trim()
      if (headingText.toLowerCase() !== title.toLowerCase()) {
        if (currentLines.length > 0) {
          sections.push({
            title: currentSecTitle,
            lines: currentLines,
          })
          currentLines = []
        }
        currentSecTitle = headingText
        continue
      }
    }
    currentLines.push(line)
  }

  if (currentLines.length > 0) {
    sections.push({
      title: currentSecTitle,
      lines: currentLines,
    })
  }

  // Convert each section's lines to semantic HTML
  const chapters: Chapter[] = []
  let totalImages = 0

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i]
    const { html, imgCount } = markdownLinesToHtml(sec.lines, originalUrl)
    totalImages += imgCount

    if (html.trim().length > 10) {
      chapters.push({
        id: `sec-${i + 1}`,
        title: sec.title || `Sección ${i + 1}`,
        content: html,
      })
    }
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
        title,
        content: markdownLinesToHtml(lines, originalUrl).html,
      },
    ],
    rawContent: markdown,
    imageCount: totalImages,
  }
}

function markdownLinesToHtml(lines: string[], baseUrl: string): { html: string; imgCount: number } {
  const parts: string[] = []
  let curPara: string[] = []
  let inCodeBlock = false
  let codeBlockLines: string[] = []
  let codeBlockLang = ''
  let inList: 'ul' | 'ol' | null = null
  let listItems: string[] = []
  let inBlockquote = false
  let quoteLines: string[] = []
  let imgCount = 0

  const flushPara = () => {
    if (curPara.length > 0) {
      const text = curPara.join(' ').trim()
      if (text) {
        parts.push(`<p>${formatInlineMarkdown(text)}</p>`)
      }
      curPara = []
    }
  }

  const flushList = () => {
    if (inList && listItems.length > 0) {
      const tag = inList
      const itemsHtml = listItems
        .map((item) => `  <li>${formatInlineMarkdown(item)}</li>`)
        .join('\n')
      parts.push(`<${tag} class="epub-list">\n${itemsHtml}\n</${tag}>`)
      listItems = []
      inList = null
    }
  }

  const flushBlockquote = () => {
    if (inBlockquote && quoteLines.length > 0) {
      const quoteText = quoteLines.join(' ')
      parts.push(`<blockquote>${formatInlineMarkdown(quoteText)}</blockquote>`)
      quoteLines = []
      inBlockquote = false
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    // 1. Code block handling: ```lang
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const escapedCode = escapeXml(codeBlockLines.join('\n'))
        parts.push(
          `<pre class="epub-code-block"><code class="${codeBlockLang ? `language-${codeBlockLang}` : ''}">${escapedCode}</code></pre>`
        )
        codeBlockLines = []
        codeBlockLang = ''
        inCodeBlock = false
      } else {
        // Start code block
        flushPara()
        flushList()
        flushBlockquote()
        inCodeBlock = true
        codeBlockLang = line.replace(/^```/, '').trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine) // preserve indent inside code
      continue
    }

    // 2. Empty line / Paragraph gap
    if (!line) {
      flushPara()
      flushList()
      flushBlockquote()
      continue
    }

    // 3. Section Dividers: ---, ***, ___
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line)) {
      flushPara()
      flushList()
      flushBlockquote()
      parts.push('<hr class="epub-divider" />')
      continue
    }

    // 4. Subheadings: ### H3 or #### H4
    const subHeadingMatch = line.match(/^(#{3,6})\s+(.+)$/)
    if (subHeadingMatch) {
      flushPara()
      flushList()
      flushBlockquote()
      const level = Math.min(4, subHeadingMatch[1].length) // map 3->h3, 4+->h4
      const headingTag = `h${level}`
      parts.push(`<${headingTag}>${formatInlineMarkdown(subHeadingMatch[2].trim())}</${headingTag}>`)
      continue
    }

    // 5. Images: ![alt](url "optional caption")
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      flushPara()
      flushList()
      flushBlockquote()
      const alt = imgMatch[1].trim()
      let imgUrl = imgMatch[2].trim()
      let caption = alt

      // Check for caption inside quotes
      const quoteMatch = imgUrl.match(/^([^\s]+)\s+"([^"]+)"$/)
      if (quoteMatch) {
        imgUrl = quoteMatch[1]
        caption = quoteMatch[2]
      }

      try {
        imgUrl = new URL(imgUrl, baseUrl).href
      } catch {
        // keep as is
      }

      imgCount++
      parts.push(
        `<figure class="epub-figure">
  <img src="${imgUrl}" alt="${escapeXml(alt || 'Ilustración')}" />
  <figcaption>${escapeXml(caption || alt || 'Ilustración del artículo')}</figcaption>
</figure>`
      )
      continue
    }

    // 6. Blockquote: > text
    if (line.startsWith('>')) {
      flushPara()
      flushList()
      inBlockquote = true
      quoteLines.push(line.replace(/^>\s*/, ''))
      continue
    } else if (inBlockquote) {
      flushBlockquote()
    }

    // 7. Unordered Lists: - or * or •
    const ulMatch = line.match(/^([*•\-–])\s+(.+)$/)
    if (ulMatch) {
      flushPara()
      flushBlockquote()
      if (inList !== 'ul') {
        flushList()
        inList = 'ul'
      }
      listItems.push(ulMatch[2].trim())
      continue
    }

    // 8. Ordered Lists: 1. or 1)
    const olMatch = line.match(/^(\d+[\.\)])\s+(.+)$/)
    if (olMatch) {
      flushPara()
      flushBlockquote()
      if (inList !== 'ol') {
        flushList()
        inList = 'ol'
      }
      listItems.push(olMatch[2].trim())
      continue
    }

    // 9. If in list but regular line, check if list continues or flushes
    if (inList) {
      flushList()
    }

    // 10. Regular paragraph text
    curPara.push(line)
  }

  flushPara()
  flushList()
  flushBlockquote()

  return { html: parts.join('\n\n'), imgCount }
}

function formatInlineMarkdown(text: string): string {
  let res = escapeXml(text)

  // Inline code: `code`
  res = res.replace(/`([^`]+)`/g, '<code class="epub-inline-code">$1</code>')

  // Bold + Italic: ***text*** or ___text___
  res = res.replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>')

  // Bold: **text** or __text__
  res = res.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>')

  // Italic: *text* or _text_
  res = res.replace(/(?<!\w)([*_])(.*?)\1(?!\w)/g, '<em>$2</em>')

  // Strikethrough: ~~text~~
  res = res.replace(/~~(.*?)~~/g, '<del>$1</del>')

  return res
}

/**
 * Parses raw HTML with rich support for:
 * - Full heading hierarchy (H1, H2, H3, H4)
 * - Horizontal Dividers (<hr class="epub-divider" />)
 * - Sanitized rich paragraphs (preserving <strong>, <em>, <code>, <mark>, <br/>)
 * - Code blocks (<pre><code>)
 * - Lists (<ul>, <ol>, <li>)
 * - Tables (<table>)
 * - Blockquotes (<blockquote>)
 * - Chapter/Section splitting by major sections
 */
export function parseHtmlArticle(html: string, originalUrl: string): FetchResult {
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

  // Remove scripts, styles, forms, navigation and social noise
  contentEl.querySelectorAll('script, style, iframe, nav, footer, header, noscript, .ads, .comments, form, svg').forEach(el => el.remove())

  // Process elements in order
  const elements = Array.from(contentEl.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, hr, pre, ul, ol, figure, img, table'))

  interface ChapterDraft {
    title: string
    blocks: string[]
  }

  const chaptersDraft: ChapterDraft[] = []
  let currentTitle = 'Introducción'
  let currentBlocks: string[] = []
  let imageCount = 0

  elements.forEach((el) => {
    const tag = el.tagName.toLowerCase()

    // 1. Major Section Headings (H1, H2) -> Chapter splitting
    if (tag === 'h1' || tag === 'h2') {
      const headingText = el.textContent?.trim() || ''
      if (headingText && headingText.toLowerCase() !== title.toLowerCase()) {
        if (currentBlocks.length > 0) {
          chaptersDraft.push({
            title: currentTitle,
            blocks: currentBlocks,
          })
          currentBlocks = []
        }
        currentTitle = headingText
        return
      }
    }

    // 2. Subheadings (H3, H4, H5, H6)
    if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
      const headingText = el.textContent?.trim() || ''
      if (headingText) {
        const mappedTag = tag === 'h3' ? 'h3' : 'h4'
        currentBlocks.push(`<${mappedTag}>${escapeXml(headingText)}</${mappedTag}>`)
      }
      return
    }

    // 3. Dividers (<hr>)
    if (tag === 'hr') {
      currentBlocks.push('<hr class="epub-divider" />')
      return
    }

    // 4. Pre / Code blocks
    if (tag === 'pre') {
      const codeText = el.textContent || ''
      if (codeText.trim()) {
        currentBlocks.push(`<pre class="epub-code-block"><code>${escapeXml(codeText)}</code></pre>`)
      }
      return
    }

    // 5. Blockquotes
    if (tag === 'blockquote') {
      const text = el.textContent?.trim() || ''
      if (text) {
        currentBlocks.push(`<blockquote>${escapeXml(text)}</blockquote>`)
      }
      return
    }

    // 6. Lists (<ol>, <ul>)
    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(el.querySelectorAll('li'))
      if (items.length > 0) {
        const lisHtml = items
          .map((li) => `  <li>${sanitizeInlineHtml(li.innerHTML, originalUrl)}</li>`)
          .join('\n')
        currentBlocks.push(`<${tag} class="epub-list">\n${lisHtml}\n</${tag}>`)
      }
      return
    }

    // 7. Tables
    if (tag === 'table') {
      const cleanTableHtml = sanitizeTableHtml(el as HTMLTableElement)
      if (cleanTableHtml) {
        currentBlocks.push(cleanTableHtml)
      }
      return
    }

    // 8. Images & Figures
    if (tag === 'img') {
      if (el.closest('figure')) return

      const imgEl = el as HTMLImageElement
      let src = imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original') || imgEl.getAttribute('src') || ''
      if (!src) return

      try {
        src = new URL(src, originalUrl).href
      } catch {
        // Keep as is
      }

      const alt = imgEl.getAttribute('alt') || 'Ilustración'
      if (!src.includes('1x1') && !src.includes('tracking') && !src.includes('pixel')) {
        imageCount++
        currentBlocks.push(
          `<figure class="epub-figure">
  <img src="${src}" alt="${escapeXml(alt)}" />
  <figcaption>${escapeXml(alt)}</figcaption>
</figure>`
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
          currentBlocks.push(
            `<figure class="epub-figure">
  <img src="${src}" alt="${escapeXml(alt)}" />
  <figcaption>${escapeXml(caption)}</figcaption>
</figure>`
          )
        }
      }
      return
    }

    // 9. Paragraphs (<p>)
    if (tag === 'p') {
      // If paragraph contains an img
      const imgInside = el.querySelector('img')
      if (imgInside) {
        let src = imgInside.getAttribute('data-src') || imgInside.getAttribute('data-original') || imgInside.getAttribute('src') || ''
        if (src) {
          try {
            src = new URL(src, originalUrl).href
          } catch {
            // Keep as is
          }
          imageCount++
          currentBlocks.push(
            `<figure class="epub-figure">
  <img src="${src}" alt="Ilustración" />
  <figcaption>${escapeXml(imgInside.getAttribute('alt') || 'Ilustración')}</figcaption>
</figure>`
          )
        }
      }

      const cleanHtml = sanitizeInlineHtml(el.innerHTML, originalUrl)
      if (cleanHtml && cleanHtml.replace(/<[^>]+>/g, '').trim().length > 0) {
        currentBlocks.push(`<p>${cleanHtml}</p>`)
      }
    }
  })

  if (currentBlocks.length > 0) {
    chaptersDraft.push({
      title: currentTitle,
      blocks: currentBlocks,
    })
  }

  const finalChapters: Chapter[] = chaptersDraft.map((d, idx) => ({
    id: `sec-${idx + 1}`,
    title: d.title || `Sección ${idx + 1}`,
    content: d.blocks.join('\n\n'),
  }))

  return {
    metadata: {
      title: title.trim(),
      author: author.trim(),
      sourceUrl: originalUrl,
      publisher: new URL(originalUrl).hostname.replace('www.', ''),
      language: 'es',
    },
    chapters: finalChapters.length > 0 ? finalChapters : [
      {
        id: 'sec-1',
        title: title.trim(),
        content: '<p>Contenido importado de la web.</p>',
      },
    ],
    rawContent: contentEl.innerHTML,
    imageCount,
  }
}

/**
 * Preserves safe inline typography: <strong>, <em>, <code>, <a>, <br/>, <del>, <mark>
 * Resolves relative URLs and strips risky tags.
 */
function sanitizeInlineHtml(html: string, baseUrl: string): string {
  if (!html) return ''

  return html
    .replace(/<img[^>]*>/gi, '') // images handled separately
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_, href, text) => {
      let resolved = href
      try {
        resolved = new URL(href, baseUrl).href
      } catch {
        // keep as is
      }
      return `<a href="${escapeXml(resolved)}" class="epub-link">${text}</a>`
    })
    .replace(/<\/?(div|span|section|header|footer|nav)[^>]*>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/style="[^"]*"/gi, '')
    .trim()
}

function sanitizeTableHtml(table: HTMLTableElement): string {
  try {
    const clone = table.cloneNode(true) as HTMLTableElement
    clone.className = 'epub-table'
    clone.removeAttribute('width')
    clone.removeAttribute('height')
    clone.removeAttribute('style')
    clone.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('style')
      el.removeAttribute('width')
      el.removeAttribute('height')
    })
    return clone.outerHTML
  } catch {
    return ''
  }
}

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
