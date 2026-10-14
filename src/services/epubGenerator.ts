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

function cleanHtmlForEpub(html: string): string {
  if (!html) return '<p></p>'
  // If it's plain text without tags, wrap paragraphs
  if (!html.includes('<p>') && !html.includes('<div>') && !html.includes('<h')) {
    const paragraphs = html
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0)
    return paragraphs.map(p => `<p>${escapeXml(p).replace(/\n/g, '<br/>')}</p>`).join('\n')
  }

  // Ensure self-closing tags for XHTML compatibility (<br/>, <hr/>, <img ... />)
  let clean = html
    .replace(/<br(\s*)>/gi, '<br/>')
    .replace(/<hr(\s*)>/gi, '<hr/>')
    .replace(/<img([^>]*?)(?<!\/)>/gi, '<img$1 />')

  // Remove unsafe attributes like onclick, etc.
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

  // 3. OEBPS/style.css (Apple Books optimized typography)
  const styleCss = `
@charset "utf-8";
body {
  margin: 5%;
  font-family: -apple-system, "Baskerville", "Georgia", "Iowan Old Style", "Times New Roman", serif;
  font-size: 1.05em;
  line-height: 1.65;
  color: #111111;
  background-color: transparent;
  text-align: justify;
}
h1, h2, h3, h4, h5, h6 {
  font-family: -apple-system, "Charter", "Helvetica Neue", "Arial", sans-serif;
  font-weight: 700;
  line-height: 1.25;
  margin-top: 1.8em;
  margin-bottom: 0.6em;
  text-align: left;
}
h1 {
  font-size: 1.8em;
  border-bottom: 1px solid #e5e5ea;
  padding-bottom: 0.4em;
  margin-bottom: 1em;
}
h2 { font-size: 1.4em; }
h3 { font-size: 1.2em; }
p {
  margin-top: 0;
  margin-bottom: 1.1em;
  text-indent: 1.2em;
}
p:first-of-type, h1 + p, h2 + p, h3 + p, blockquote + p {
  text-indent: 0;
}
blockquote {
  margin: 1.5em 1em;
  padding: 0.5em 1em;
  border-left: 3px solid #0071e3;
  color: #333336;
  font-style: italic;
  background: #fbfbfd;
}
code, pre {
  font-family: "SF Mono", "Menlo", "Monaco", "Courier New", monospace;
  font-size: 0.9em;
  background-color: #f2f2f7;
  border-radius: 4px;
}
pre {
  padding: 1em;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
code {
  padding: 0.15em 0.3em;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.5em auto;
  border-radius: 6px;
}
hr {
  border: 0;
  border-top: 1px solid #d1d1d6;
  margin: 2em 0;
}
.chapter-header {
  margin-bottom: 2.5em;
  text-align: center;
}
.chapter-num {
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #86868b;
  margin-bottom: 0.3em;
}
.meta-box {
  margin: 1.5em 0;
  padding: 1em;
  background-color: #f5f5f7;
  border-radius: 8px;
  font-size: 0.9em;
}
`
  zip.file('OEBPS/style.css', styleCss)

  // 4. Add cover image binary
  const coverArrayBuffer = await coverImageBlob.arrayBuffer()
  zip.file('OEBPS/cover.png', coverArrayBuffer)

  // 5. OEBPS/cover.xhtml
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

  // 6. Chapters XHTML
  const validChapters = chapters.length > 0
    ? chapters
    : [{ id: 'chap-1', title: 'Contenido', content: '<p>Documento convertido con EpubCraft.</p>' }]

  validChapters.forEach((ch, idx) => {
    const chapTitle = escapeXml(ch.title || `Capítulo ${idx + 1}`)
    const chapHtml = cleanHtmlForEpub(ch.content)
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

  // 7. OEBPS/nav.xhtml (EPUB 3 Navigation Document)
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

  // 8. OEBPS/toc.ncx (EPUB 2 / Backwards compatibility for Apple Books & e-readers)
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

  // 9. OEBPS/content.opf (The Package Document)
  const manifestItems = validChapters
    .map(
      (_, idx) =>
        `    <item id="chapter-${idx + 1}" href="chapter-${idx + 1}.xhtml" media-type="application/xhtml+xml"/>`
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
${manifestItems}
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
