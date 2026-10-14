import JSZip from 'jszip'
import type { BookMetadata, Chapter } from '../types'

export interface EpubParseResult {
  metadata: BookMetadata
  chapters: Chapter[]
  coverDataUrl?: string
  imageCount: number
}

/**
 * Parses an EPUB file, extracting metadata, cover image, and chapters with all images
 * resolved to inline data URLs so they can be viewed, edited, and re-compiled.
 */
export async function parseEpubFile(
  file: File,
  onProgress?: (status: string) => void
): Promise<EpubParseResult> {
  onProgress?.('Leyendo estructura del archivo EPUB...')
  const zip = await JSZip.loadAsync(file)

  // 1. Locate container.xml to find the rootfile (content.opf)
  const containerXmlStr = await zip.file('META-INF/container.xml')?.async('text')
  if (!containerXmlStr) {
    throw new Error('Archivo EPUB no válido: falta META-INF/container.xml')
  }

  let opfPath = 'OEBPS/content.opf'
  if (typeof DOMParser !== 'undefined') {
    const containerDoc = new DOMParser().parseFromString(containerXmlStr, 'application/xml')
    const rootfile = containerDoc.querySelector('rootfile')
    opfPath = rootfile?.getAttribute('full-path') || opfPath
  } else {
    const match = containerXmlStr.match(/full-path=["']([^"']+)["']/i)
    if (match) opfPath = match[1]
  }
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''

  // 2. Read OPF file
  onProgress?.('Extrayendo metadatos e índice...')
  const opfStr = await zip.file(opfPath)?.async('text')
  if (!opfStr) {
    throw new Error(`Archivo OPF no encontrado en: ${opfPath}`)
  }

  // 3. Extract Metadata & Items
  let title = file.name.replace(/\.epub$/i, '')
  let author = 'Autor Desconocido'
  let publisher = 'Edición Digital'
  let language = 'es'
  let description = ''
  const manifestItems = new Map<string, { href: string; mediaType: string; fullZipPath: string }>()
  const spineItemIds: string[] = []
  let coverItemRefId: string | null = null

  if (typeof DOMParser !== 'undefined') {
    const opfDoc = new DOMParser().parseFromString(opfStr, 'application/xml')
    const getTagText = (tag: string) =>
      opfDoc.querySelector(tag)?.textContent?.trim() || ''

    title =
      getTagText('dc\\:title') ||
      getTagText('title') ||
      title
    author =
      getTagText('dc\\:creator') ||
      getTagText('creator') ||
      author
    publisher =
      getTagText('dc\\:publisher') ||
      getTagText('publisher') ||
      publisher
    language =
      getTagText('dc\\:language') ||
      getTagText('language') ||
      language
    description =
      getTagText('dc\\:description') ||
      getTagText('description') ||
      description

    const manifestElements = opfDoc.querySelectorAll('manifest > item')
    manifestElements.forEach((el) => {
      const id = el.getAttribute('id')
      const href = el.getAttribute('href')
      const mediaType = el.getAttribute('media-type') || ''
      if (id && href) {
        const cleanHref = decodeURIComponent(href)
        const fullZipPath = resolveZipPath(opfDir, cleanHref)
        manifestItems.set(id, { href: cleanHref, mediaType, fullZipPath })
      }
    })

    const coverItemEl =
      opfDoc.querySelector('manifest > item[properties*="cover-image"]') ||
      opfDoc.querySelector('manifest > item[id="cover-image"]') ||
      opfDoc.querySelector('manifest > item[id="cover"]')
    if (coverItemEl) {
      coverItemRefId = coverItemEl.getAttribute('id')
    }
    if (!coverItemRefId) {
      const metaCover = opfDoc.querySelector('meta[name="cover"]')?.getAttribute('content')
      if (metaCover) coverItemRefId = metaCover
    }

    const spineRefs = opfDoc.querySelectorAll('spine > itemref')
    spineRefs.forEach((ref) => {
      const idref = ref.getAttribute('idref')
      if (idref) spineItemIds.push(idref)
    })
  } else {
    // Regex fallback for non-DOM environments
    const titleM = opfStr.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i)
    if (titleM) title = titleM[1].trim()
    const creatorM = opfStr.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i)
    if (creatorM) author = creatorM[1].trim()
    const itemRegex = /<item\s+[^>]*id=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*media-type=["']([^"']+)["'][^>]*\/?>/gi
    let match: RegExpExecArray | null
    while ((match = itemRegex.exec(opfStr)) !== null) {
      const id = match[1]
      const href = decodeURIComponent(match[2])
      const mediaType = match[3]
      const fullZipPath = resolveZipPath(opfDir, href)
      manifestItems.set(id, { href, mediaType, fullZipPath })
    }
    const itemrefRegex = /<itemref\s+[^>]*idref=["']([^"']+)["'][^>]*\/?>/gi
    while ((match = itemrefRegex.exec(opfStr)) !== null) {
      spineItemIds.push(match[1])
    }
  }

  // 5. Extract and resolve all images to Data URLs
  onProgress?.('Detectando y extrayendo imágenes del libro...')
  const imagesMap = new Map<string, string>() // relative path / href -> data URL
  let detectedImagesCount = 0

  for (const [, item] of manifestItems) {
    if (item.mediaType.startsWith('image/')) {
      const imgFile = zip.file(item.fullZipPath)
      if (imgFile) {
        const base64 = await imgFile.async('base64')
        const dataUrl = `data:${item.mediaType};base64,${base64}`
        // Map both full path, bare href, and filename
        imagesMap.set(item.fullZipPath, dataUrl)
        imagesMap.set(item.href, dataUrl)
        const filename = item.href.split('/').pop() || ''
        if (filename) imagesMap.set(filename, dataUrl)
        detectedImagesCount++
      }
    }
  }

  // 6. Find Cover Image
  let coverDataUrl: string | undefined
  if (coverItemRefId && manifestItems.has(coverItemRefId)) {
    const item = manifestItems.get(coverItemRefId)
    if (item && imagesMap.has(item.fullZipPath)) {
      coverDataUrl = imagesMap.get(item.fullZipPath)
    }
  }

  // 7. Spine Chapters
  onProgress?.('Procesando capítulos y contenido...')
  const chapters: Chapter[] = []

  let chapIndex = 1
  for (let i = 0; i < spineItemIds.length; i++) {
    const idref = spineItemIds[i]
    const manifestItem = manifestItems.get(idref)
    if (!manifestItem) continue

    // Skip standalone cover or navigation XHTML
    const lowerHref = manifestItem.href.toLowerCase()
    if (
      (lowerHref.includes('cover') && !lowerHref.includes('chapter')) ||
      lowerHref.includes('nav.xhtml') ||
      lowerHref.includes('toc.xhtml')
    ) {
      continue
    }

    const fileInZip = zip.file(manifestItem.fullZipPath)
    if (!fileInZip) continue

    const xhtmlText = await fileInZip.async('text')
    let chapTitle = `Capítulo ${chapIndex}`
    let innerHtml = ''

    if (typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(xhtmlText, 'text/html')
      chapTitle =
        doc.querySelector('h1, h2, h3, title')?.textContent?.trim() ||
        `Capítulo ${chapIndex}`

      if (chapTitle.length > 80) {
        chapTitle = chapTitle.substring(0, 77) + '...'
      }

      const bodyEl = doc.body || doc.documentElement
      const imgs = bodyEl.querySelectorAll('img, image')
      imgs.forEach((img) => {
        const srcAttr = img.getAttribute('src') || img.getAttribute('xlink:href') || ''
        if (srcAttr) {
          const decodedSrc = decodeURIComponent(srcAttr)
          const resolvedPath = resolveZipPath(
            manifestItem.fullZipPath.substring(0, manifestItem.fullZipPath.lastIndexOf('/') + 1),
            decodedSrc
          )
          const filename = decodedSrc.split('/').pop() || ''
          const matchedDataUrl =
            imagesMap.get(resolvedPath) ||
            imagesMap.get(decodedSrc) ||
            imagesMap.get(filename)

          if (matchedDataUrl) {
            img.setAttribute('src', matchedDataUrl)
          }
        }
      })

      bodyEl.querySelectorAll('script, style, link').forEach((el) => el.remove())
      innerHtml = bodyEl.innerHTML.trim()
    } else {
      // Simple regex fallback for non-browser/test environments
      const tMatch = xhtmlText.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i)
      if (tMatch) chapTitle = tMatch[1].trim()
      let replaced = xhtmlText
      imagesMap.forEach((dataUrl, path) => {
        replaced = replaced.split(path).join(dataUrl)
        const filename = path.split('/').pop() || ''
        if (filename) {
          replaced = replaced.replace(new RegExp('(src=["\'][^"\']*' + filename + '["\'])', 'g'), `src="${dataUrl}"`)
        }
      })
      innerHtml = replaced
    }

    if (innerHtml && innerHtml.length > 20) {
      chapters.push({
        id: `chap-${chapIndex}`,
        title: chapTitle,
        content: innerHtml,
      })
      chapIndex++
    }
  }

  return {
    metadata: {
      title,
      author,
      publisher,
      description,
      language: language.substring(0, 2) || 'es',
      originalFilename: file.name,
    },
    chapters: chapters.length > 0 ? chapters : [
      {
        id: 'chap-1',
        title,
        content: '<p>Contenido importado del archivo EPUB.</p>',
      },
    ],
    coverDataUrl,
    imageCount: detectedImagesCount,
  }
}

function resolveZipPath(baseDir: string, relativePath: string): string {
  if (relativePath.startsWith('/')) {
    return relativePath.substring(1)
  }
  const stack = baseDir ? baseDir.split('/').filter(Boolean) : []
  const parts = relativePath.split('/')
  for (const part of parts) {
    if (part === '.' || part === '') continue
    if (part === '..') {
      stack.pop()
    } else {
      stack.push(part)
    }
  }
  return stack.join('/')
}
