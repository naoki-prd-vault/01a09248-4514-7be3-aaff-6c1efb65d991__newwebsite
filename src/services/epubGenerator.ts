import JSZip from 'jszip'
import type { BookMetadata, Chapter } from '../types'

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export interface ExtractedImageResource {
  id: string
  originalSrc: string
  epubPath: string // e.g. "images/img_1.png"
  zipPath: string // e.g. "OEBPS/images/img_1.png"
  mediaType: string
  data: Uint8Array
}

function parseDataUrl(dataUrl: string): { mediaType: string; data: Uint8Array } | null {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/)
    if (match) {
      const mediaType = match[1].toLowerCase()
      const binary = atob(match[2])
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return { mediaType, data: bytes }
    }

    const svgMatch = dataUrl.match(/^data:image\/svg\+xml;?(?:utf8|charset=utf-8)?,(.*)$/i)
    if (svgMatch) {
      const text = decodeURIComponent(svgMatch[1])
      const encoder = new TextEncoder()
      return { mediaType: 'image/svg+xml', data: encoder.encode(text) }
    }
  } catch (err) {
    console.warn('Failed to parse data URL', err)
  }
  return null
}

async function fetchRemoteImage(url: string): Promise<{ mediaType: string; data: Uint8Array } | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const blob = await res.blob()
    const buffer = await blob.arrayBuffer()
    let mediaType = blob.type
    if (!mediaType || mediaType === 'application/octet-stream') {
      const lower = url.toLowerCase()
      if (lower.endsWith('.png')) mediaType = 'image/png'
      else if (lower.endsWith('.gif')) mediaType = 'image/gif'
      else if (lower.endsWith('.webp')) mediaType = 'image/webp'
      else if (lower.endsWith('.svg')) mediaType = 'image/svg+xml'
      else mediaType = 'image/jpeg'
    }
    return { mediaType, data: new Uint8Array(buffer) }
  } catch (err) {
    console.warn('Could not fetch external image for EPUB:', url, err)
    return null
  }
}

function getExtensionForMediaType(mediaType: string): string {
  switch (mediaType) {
    case 'image/png':
      return 'png'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    case 'image/jpeg':
    case 'image/jpg':
    default:
      return 'jpg'
  }
}

function cleanHtmlForEpub(html: string): string {
  if (!html) return '<p></p>'

  // If plain text without tags, wrap paragraphs
  if (!html.includes('<p>') && !html.includes('<div>') && !html.includes('<h') && !html.includes('<img') && !html.includes('<ul') && !html.includes('<ol')) {
    const paragraphs = html
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
    return paragraphs.map((p) => `<p>${escapeXml(p).replace(/\n/g, '<br/>')}</p>`).join('\n')
  }

  // Ensure self-closing tags for strict XHTML compatibility (<br/>, <hr/>, <img ... />)
  let clean = html
    .replace(/<br(\s*)>/gi, '<br/>')
    .replace(/<br(\s*)\/?>/gi, '<br/>')
    .replace(/<hr([^>]*?)(?<!\/)>/gi, '<hr$1 />')
    .replace(/<img([^>]*?)(?<!\/)>/gi, '<img$1 />')

  // Remove unsafe event attributes
  clean = clean.replace(/on\w+="[^"]*"/gi, '')

  return clean
}

export async function generateEpubBlob({
  metadata,
  chapters,
  coverImageBlob,
}: {
  metadata: BookMetadata
  chapters: Chapter[]
  coverImageBlob: Blob
}): Promise<Blob> {
  const zip = new JSZip()
  const uuid = 'urn:uuid:' + (crypto.randomUUID ? crypto.randomUUID() : 'b' + Math.random().toString(36).substring(2))
  const modifiedDate = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const lang = metadata.language || 'es'
  const safeTitle = escapeXml(metadata.title || 'Sin Título')
  const safeAuthor = escapeXml(metadata.author || 'Autor Desconocido')
  const safePublisher = escapeXml(metadata.publisher || 'EpubCraft for Apple Books')

  // 1. mimetype (Must be first, stored uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  zip.file('META-INF/container.xml', containerXml)

  // 3. Extract all images embedded in chapters
  const validChapters = chapters.length > 0
    ? chapters
    : [{ id: 'chap-1', title: 'Contenido', content: '<p>Documento convertido con EpubCraft.</p>' }]

  const imageResources: ExtractedImageResource[] = []
  const srcToResourceMap = new Map<string, ExtractedImageResource>()
  let imgCounter = 1

  // Collect all unique image src in chapters
  for (const chapter of validChapters) {
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    let match: RegExpExecArray | null
    while ((match = imgRegex.exec(chapter.content)) !== null) {
      const src = match[1]
      if (src && !srcToResourceMap.has(src)) {
        let extracted: { mediaType: string; data: Uint8Array } | null = null

        if (src.startsWith('data:')) {
          extracted = parseDataUrl(src)
        } else if (src.startsWith('http://') || src.startsWith('https://')) {
          extracted = await fetchRemoteImage(src)
        } else if (src.startsWith('blob:')) {
          try {
            const blobRes = await fetch(src)
            const buf = await blobRes.arrayBuffer()
            extracted = {
              mediaType: blobRes.type || 'image/jpeg',
              data: new Uint8Array(buf),
            }
          } catch {
            extracted = null
          }
        }

        if (extracted) {
          const ext = getExtensionForMediaType(extracted.mediaType)
          const imgId = `img_${imgCounter++}`
          const epubPath = `images/${imgId}.${ext}`
          const zipPath = `OEBPS/${epubPath}`

          const resource: ExtractedImageResource = {
            id: imgId,
            originalSrc: src,
            epubPath,
            zipPath,
            mediaType: extracted.mediaType,
            data: extracted.data,
          }
          srcToResourceMap.set(src, resource)
          imageResources.push(resource)
        }
      }
    }
  }

  // Add all extracted chapter images to ZIP
  for (const res of imageResources) {
    zip.file(res.zipPath, res.data)
  }

  // 4. OEBPS/style.css (Apple Books optimized typography, dividers, code blocks, lists, figures, spaces)
  const styleCss = `
@charset "utf-8";
body {
  margin: 5%;
  font-family: -apple-system, "Baskerville", "Georgia", "Iowan Old Style", "Times New Roman", serif;
  font-size: 1.05em;
  line-height: 1.7;
  color: #1a1a1a;
  background-color: transparent;
  text-align: justify;
  text-justify: inter-word;
}

/* Headings & Section Titles */
h1, h2, h3, h4, h5, h6 {
  font-family: -apple-system, "Charter", "Helvetica Neue", "Arial", sans-serif;
  font-weight: 700;
  line-height: 1.25;
  color: #111111;
  text-align: left;
  page-break-after: avoid;
}
h1 {
  font-size: 1.85em;
  border-bottom: 1px solid #e5e5ea;
  padding-bottom: 0.4em;
  margin-top: 1.5em;
  margin-bottom: 1em;
  letter-spacing: -0.02em;
}
h2 {
  font-size: 1.45em;
  margin-top: 1.9em;
  margin-bottom: 0.6em;
  border-bottom: 1px solid #f2f2f7;
  padding-bottom: 0.3em;
  letter-spacing: -0.01em;
}
h3 {
  font-size: 1.22em;
  margin-top: 1.5em;
  margin-bottom: 0.45em;
  color: #242426;
}
h4 {
  font-size: 1.08em;
  font-weight: 600;
  margin-top: 1.3em;
  margin-bottom: 0.35em;
  color: #3a3a3c;
}

/* Paragraphs & Spacing */
p {
  margin-top: 0;
  margin-bottom: 1.2em;
  text-indent: 1.2em;
}
p:first-of-type,
h1 + p,
h2 + p,
h3 + p,
h4 + p,
blockquote + p,
figure + p,
hr + p,
ul + p,
ol + p,
pre + p {
  text-indent: 0;
}

/* Dividers & Separators */
hr, .epub-divider {
  border: 0;
  height: 1px;
  background: #d1d1d6;
  background: linear-gradient(to right, transparent, #c7c7cc 25%, #c7c7cc 75%, transparent);
  margin: 2.4em auto;
  width: 65%;
  clear: both;
  page-break-inside: avoid;
}

/* Blockquotes */
blockquote {
  margin: 1.6em 0.8em;
  padding: 0.8em 1.2em;
  border-left: 3px solid #0071e3;
  color: #333336;
  font-style: italic;
  background-color: #fbfbfd;
  border-radius: 0 8px 8px 0;
}
blockquote p {
  text-indent: 0;
  margin-bottom: 0.6em;
}
blockquote p:last-child {
  margin-bottom: 0;
}

/* Lists */
ul, ol, .epub-list {
  margin: 1em 0 1.4em 1.5em;
  padding-left: 1.2em;
}
li {
  margin-bottom: 0.45em;
  line-height: 1.6;
}

/* Code Blocks & Inline Code */
pre, .epub-code-block {
  font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 0.88em;
  line-height: 1.55;
  background-color: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  padding: 1.1em 1.3em;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 1.6em 0;
}
code, .epub-inline-code {
  font-family: "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.9em;
  background-color: #f2f2f7;
  padding: 0.15em 0.35em;
  border-radius: 4px;
}
pre code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
}

/* Links */
a, .epub-link {
  color: #0071e3;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Tables */
table, .epub-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.8em 0;
  font-size: 0.92em;
}
th, td {
  border: 1px solid #e5e5ea;
  padding: 8px 12px;
  text-align: left;
}
th {
  background-color: #f2f2f7;
  font-weight: 600;
}

/* Figures, Images & Captions */
figure, .epub-figure {
  margin: 2.2em 0;
  text-align: center;
  page-break-inside: avoid;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.5em auto;
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}
figcaption {
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: 0.85em;
  color: #6e6e73;
  margin-top: 0.6em;
  font-style: italic;
  text-align: center;
  line-height: 1.4;
}

/* Chapter Presentation */
.chapter-header {
  margin-bottom: 2.6em;
  text-align: center;
  page-break-after: avoid;
}
.chapter-num {
  font-size: 0.82em;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: #86868b;
  margin-bottom: 0.4em;
  font-weight: 600;
}
`
  zip.file('OEBPS/style.css', styleCss)

  // 5. Add cover image binary
  const coverArrayBuffer = await coverImageBlob.arrayBuffer()
  zip.file('OEBPS/cover.png', coverArrayBuffer)

  // 6. OEBPS/cover.xhtml
  const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <title>Portada</title>
  <style type="text/css">
    @page { margin: 0; padding: 0; }
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      background-color: #000000;
      text-align: center;
    }
    .cover-wrap {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    img {
      max-width: 100%;
      max-height: 100%;
      height: auto;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="cover-wrap">
    <img src="cover.png" alt="${safeTitle}" />
  </div>
</body>
</html>`
  zip.file('OEBPS/cover.xhtml', coverXhtml)

  // 7. Chapters XHTML (with replaced image paths)
  validChapters.forEach((ch, idx) => {
    const chapTitle = escapeXml(ch.title || `Capítulo ${idx + 1}`)
    let chapRawHtml = ch.content

    // Replace original image src with the internal epub path (e.g. images/img_1.png)
    srcToResourceMap.forEach((res) => {
      // Replace exact matches
      chapRawHtml = chapRawHtml.split(res.originalSrc).join(res.epubPath)
    })

    const chapHtml = cleanHtmlForEpub(chapRawHtml)
    const contentDoc = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <title>${chapTitle}</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <section epub:type="chapter" role="doc-chapter">
    <div class="chapter-header">
      <div class="chapter-num">Capítulo ${idx + 1}</div>
      <h1>${chapTitle}</h1>
    </div>
    <div class="chapter-body">
      ${chapHtml}
    </div>
  </section>
</body>
</html>`
    zip.file(`OEBPS/chapter-${idx + 1}.xhtml`, contentDoc)
  })

  // 8. OEBPS/nav.xhtml (EPUB 3 Navigation Document)
  const navItems = validChapters
    .map((ch, idx) => `      <li><a href="chapter-${idx + 1}.xhtml">${escapeXml(ch.title || `Capítulo ${idx + 1}`)}</a></li>`)
    .join('\n')

  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <title>Índice de Contenido</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <nav epub:type="toc" id="toc" role="doc-toc">
    <h1>Índice de Contenidos</h1>
    <ol>
${navItems}
    </ol>
  </nav>
</body>
</html>`
  zip.file('OEBPS/nav.xhtml', navXhtml)

  // 9. OEBPS/toc.ncx (EPUB 2 / Backwards compatibility for Apple Books & e-readers)
  const navPoints = validChapters
    .map(
      (ch, idx) => `    <navPoint id="navPoint-${idx + 1}" playOrder="${idx + 1}">
      <navLabel><text>${escapeXml(ch.title || `Capítulo ${idx + 1}`)}</text></navLabel>
      <content src="chapter-${idx + 1}.xhtml"/>
    </navPoint>`
    )
    .join('\n')

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${safeTitle}</text>
  </docTitle>
  <docAuthor>
    <text>${safeAuthor}</text>
  </docAuthor>
  <navMap>
${navPoints}
  </navMap>
</ncx>`
  zip.file('OEBPS/toc.ncx', tocNcx)

  // 10. OEBPS/content.opf (The Package Document)
  const manifestChapters = validChapters
    .map(
      (_, idx) =>
        `    <item id="chapter-${idx + 1}" href="chapter-${idx + 1}.xhtml" media-type="application/xhtml+xml"/>`
    )
    .join('\n')

  const manifestImages = imageResources
    .map(
      (res) =>
        `    <item id="${res.id}" href="${res.epubPath}" media-type="${res.mediaType}"/>`
    )
    .join('\n')

  const spineRefs = validChapters
    .map((_, idx) => `    <itemref idref="chapter-${idx + 1}"/>`)
    .join('\n')

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0" prefix="rendition: http://www.idpf.org/vocab/rendition/#">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="BookId">${uuid}</dc:identifier>
    <dc:title>${safeTitle}</dc:title>
    <dc:creator id="creator">${safeAuthor}</dc:creator>
    <meta refines="#creator" property="role" scheme="marc:relators">aut</meta>
    <dc:language>${lang}</dc:language>
    <dc:publisher>${safePublisher}</dc:publisher>
    <dc:description>${escapeXml(metadata.description || metadata.subtitle || 'Convertido con EpubCraft')}</dc:description>
    <meta property="dcterms:modified">${modifiedDate}</meta>
    <!-- Apple Books cover meta -->
    <meta name="cover" content="cover-image"/>
  </metadata>
  <manifest>
    <item id="cover-image" href="cover.png" media-type="image/png" properties="cover-image"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
${manifestChapters}
${manifestImages ? manifestImages : ''}
  </manifest>
  <spine toc="toc">
    <itemref idref="cover" linear="yes"/>
    <itemref idref="nav" linear="no"/>
${spineRefs}
  </spine>
  <guide>
    <reference type="cover" title="Cover" href="cover.xhtml"/>
    <reference type="toc" title="Table of Contents" href="nav.xhtml"/>
  </guide>
</package>`
  zip.file('OEBPS/content.opf', contentOpf)

  // Generate EPUB binary
  const epubBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  })

  return epubBlob
}
