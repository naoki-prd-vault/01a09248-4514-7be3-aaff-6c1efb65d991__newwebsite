import React, { useState, useRef } from 'react'
import type { Chapter, BookMetadata } from '../types'
import {
  BookOpen,
  Plus,
  Trash2,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  X,
} from 'lucide-react'

interface ChapterEditorProps {
  chapters: Chapter[]
  metadata: BookMetadata
  onUpdateChapters: (chapters: Chapter[]) => void
  onUpdateMetadata: (metadata: BookMetadata) => void
}

interface ImageInfo {
  src: string
  alt: string
  caption?: string
}

function extractImagesFromContent(html: string): ImageInfo[] {
  const images: ImageInfo[] = []
  if (!html) return images

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const figures = doc.querySelectorAll('figure')

    figures.forEach((fig) => {
      const img = fig.querySelector('img')
      if (img) {
        const src = img.getAttribute('src') || ''
        const alt = img.getAttribute('alt') || 'Imagen'
        const caption = fig.querySelector('figcaption')?.textContent?.trim()
        if (src) {
          images.push({ src, alt, caption })
        }
      }
    })

    const standaloneImgs = doc.querySelectorAll('img')
    standaloneImgs.forEach((img) => {
      if (img.closest('figure')) return
      const src = img.getAttribute('src') || ''
      const alt = img.getAttribute('alt') || 'Imagen'
      if (src && !images.some((i) => i.src === src)) {
        images.push({ src, alt })
      }
    })
  } catch {
    // Regex fallback
    const regex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    let match: RegExpExecArray | null
    while ((match = regex.exec(html)) !== null) {
      const src = match[1]
      if (src && !images.some((i) => i.src === src)) {
        images.push({ src, alt: 'Imagen detectada' })
      }
    }
  }

  return images
}

export const ChapterEditor: React.FC<ChapterEditorProps> = ({
  chapters,
  metadata,
  onUpdateChapters,
  onUpdateMetadata,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(chapters[0]?.id || null)

  // Image insertion modal/drawer state
  const [insertModalChapterId, setInsertModalChapterId] = useState<string | null>(null)
  const [insertMode, setInsertMode] = useState<'upload' | 'url'>('upload')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newImageCaption, setNewImageCaption] = useState('')
  const [newImageAlt, setNewImageAlt] = useState('')
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)
  const imageFileInputRef = useRef<HTMLInputElement>(null)

  // Calculate statistics
  const totalWords = chapters.reduce((acc, ch) => {
    const text = ch.content.replace(/<[^>]+>/g, ' ')
    const words = text.trim().split(/\s+/).filter(Boolean).length
    return acc + words
  }, 0)
  const estimatedReadingMinutes = Math.max(1, Math.round(totalWords / 200))

  const totalImages = chapters.reduce((acc, ch) => {
    return acc + extractImagesFromContent(ch.content).length
  }, 0)

  const handleTitleChange = (id: string, newTitle: string) => {
    onUpdateChapters(
      chapters.map((ch) => (ch.id === id ? { ...ch, title: newTitle } : ch))
    )
  }

  const handleContentChange = (id: string, newContent: string) => {
    onUpdateChapters(
      chapters.map((ch) => (ch.id === id ? { ...ch, content: newContent } : ch))
    )
  }

  const handleDeleteChapter = (id: string) => {
    if (chapters.length <= 1) return
    onUpdateChapters(chapters.filter((ch) => ch.id !== id))
  }

  const handleAddChapter = () => {
    const newId = 'chap-' + Date.now()
    const newChap: Chapter = {
      id: newId,
      title: `Capítulo ${chapters.length + 1}`,
      content: '<p>Nuevo contenido del capítulo...</p>',
    }
    onUpdateChapters([...chapters, newChap])
    setExpandedId(newId)
  }

  // Handle image upload from computer
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setPreviewDataUrl(dataUrl)
      if (!newImageAlt) {
        setNewImageAlt(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
    reader.readAsDataURL(file)
  }

  // Insert image into chapter
  const handleConfirmInsertImage = () => {
    if (!insertModalChapterId) return
    const src = previewDataUrl || newImageUrl.trim()
    if (!src) return

    const altText = newImageAlt.trim() || 'Ilustración'
    const captionText = newImageCaption.trim()

    const figureSnippet = `
<figure class="epub-figure">
  <img src="${src}" alt="${altText}" />
  ${captionText ? `<figcaption>${captionText}</figcaption>` : ''}
</figure>
`

    onUpdateChapters(
      chapters.map((ch) => {
        if (ch.id === insertModalChapterId) {
          return {
            ...ch,
            content: ch.content + '\n' + figureSnippet,
          }
        }
        return ch
      })
    )

    // Reset modal
    setInsertModalChapterId(null)
    setPreviewDataUrl(null)
    setNewImageUrl('')
    setNewImageCaption('')
    setNewImageAlt('')
  }

  // Remove specific image from chapter
  const handleRemoveImageFromChapter = (chapterId: string, imageSrc: string) => {
    onUpdateChapters(
      chapters.map((ch) => {
        if (ch.id !== chapterId) return ch
        // Remove figure or img containing this src
        let newContent = ch.content
        const parser = new DOMParser()
        const doc = parser.parseFromString(newContent, 'text/html')
        const imgs = doc.querySelectorAll('img')
        imgs.forEach((img) => {
          if (img.getAttribute('src') === imageSrc) {
            const fig = img.closest('figure')
            if (fig) fig.remove()
            else img.remove()
          }
        })
        newContent = doc.body.innerHTML
        return { ...ch, content: newContent }
      })
    )
  }

  return (
    <div className="chapter-editor-card">
      <div className="chapter-editor-header">
        <div>
          <h3 className="section-title">Estructura, Capítulos e Imágenes</h3>
          <p className="section-subtitle">
            Revisa el texto y las ilustraciones detectadas que se compilarán dentro del EPUB
          </p>
        </div>

        <div className="stats-badges">
          <span className="stat-pill">
            <FileText size={14} /> {chapters.length} {chapters.length === 1 ? 'sección' : 'secciones'}
          </span>
          <span className="stat-pill highlight-pill">
            <ImageIcon size={14} /> {totalImages} {totalImages === 1 ? 'imagen detectada' : 'imágenes detectadas'}
          </span>
          <span className="stat-pill">
            <BookOpen size={14} /> ~{totalWords.toLocaleString()} palabras
          </span>
          <span className="stat-pill">
            <Clock size={14} /> ~{estimatedReadingMinutes} min
          </span>
        </div>
      </div>

      <div className="metadata-edit-row">
        <div className="form-field flex-1">
          <label className="field-label">Título para el EPUB</label>
          <input
            type="text"
            className="text-input"
            value={metadata.title}
            onChange={(e) => onUpdateMetadata({ ...metadata, title: e.target.value })}
          />
        </div>
        <div className="form-field flex-1">
          <label className="field-label">Autor(a)</label>
          <input
            type="text"
            className="text-input"
            value={metadata.author}
            onChange={(e) => onUpdateMetadata({ ...metadata, author: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label className="field-label">Idioma</label>
          <select
            className="select-input"
            value={metadata.language}
            onChange={(e) => onUpdateMetadata({ ...metadata, language: e.target.value })}
          >
            <option value="es">Español (es)</option>
            <option value="en">Inglés (en)</option>
            <option value="fr">Francés (fr)</option>
            <option value="pt">Portugués (pt)</option>
            <option value="de">Alemán (de)</option>
          </select>
        </div>
      </div>

      <div className="chapters-list">
        {chapters.map((ch, idx) => {
          const isExpanded = expandedId === ch.id
          const chapterImages = extractImagesFromContent(ch.content)

          return (
            <div key={ch.id} className={`chapter-item ${isExpanded ? 'expanded' : ''}`}>
              <div
                className="chapter-item-bar"
                onClick={() => setExpandedId(isExpanded ? null : ch.id)}
              >
                <div className="chapter-title-group">
                  <span className="chapter-index">#{idx + 1}</span>
                  <input
                    type="text"
                    className="chapter-title-input"
                    value={ch.title}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleTitleChange(ch.id, e.target.value)}
                    placeholder="Título del capítulo..."
                  />
                  {chapterImages.length > 0 && (
                    <span className="chapter-img-badge" title={`${chapterImages.length} imágenes en este capítulo`}>
                      <ImageIcon size={12} />
                      <span>{chapterImages.length} img</span>
                    </span>
                  )}
                </div>

                <div className="chapter-item-actions">
                  <button
                    type="button"
                    className="icon-action-btn add-img-btn"
                    title="Insertar imagen en este capítulo"
                    onClick={(e) => {
                      e.stopPropagation()
                      setInsertModalChapterId(ch.id)
                      setExpandedId(ch.id)
                    }}
                  >
                    <Plus size={14} />
                    <ImageIcon size={14} />
                  </button>

                  {chapters.length > 1 && (
                    <button
                      type="button"
                      className="icon-action-btn danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteChapter(ch.id)
                      }}
                      title="Eliminar capítulo"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  <button type="button" className="icon-action-btn">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="chapter-body-editor">
                  {/* Gallery of detected images */}
                  {chapterImages.length > 0 && (
                    <div className="detected-images-strip">
                      <div className="strip-title-row">
                        <span className="strip-title">
                          <ImageIcon size={14} /> Imágenes detectadas en este capítulo ({chapterImages.length}):
                        </span>
                        <button
                          type="button"
                          className="secondary-btn small"
                          onClick={() => setInsertModalChapterId(ch.id)}
                        >
                          <Plus size={13} /> Añadir otra
                        </button>
                      </div>
                      <div className="images-thumbnails-row">
                        {chapterImages.map((img, imgIdx) => (
                          <div key={imgIdx} className="image-thumb-card">
                            <img src={img.src} alt={img.alt} className="thumb-preview-img" />
                            <div className="thumb-info">
                              <span className="thumb-caption">{img.caption || img.alt || `Imagen ${imgIdx + 1}`}</span>
                              <button
                                type="button"
                                className="thumb-remove-btn"
                                title="Eliminar del capítulo"
                                onClick={() => handleRemoveImageFromChapter(ch.id, img.src)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {chapterImages.length === 0 && (
                    <div className="no-images-banner">
                      <span>Este capítulo no tiene imágenes insertadas.</span>
                      <button
                        type="button"
                        className="secondary-btn small"
                        onClick={() => setInsertModalChapterId(ch.id)}
                      >
                        <Plus size={13} /> Insertar imagen
                      </button>
                    </div>
                  )}

                  <label className="field-label" style={{ marginBottom: '6px' }}>
                    Texto HTML / Contenido del capítulo:
                  </label>
                  <textarea
                    className="textarea-input mono-font"
                    rows={8}
                    value={ch.content}
                    onChange={(e) => handleContentChange(ch.id, e.target.value)}
                  />

                  <div className="chapter-preview-rendered">
                    <span className="preview-rendered-label">Previsualización de lectura (Apple Books layout):</span>
                    <div
                      className="rendered-prose"
                      dangerouslySetInnerHTML={{ __html: ch.content }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="chapters-footer-actions">
        <button type="button" className="secondary-btn" onClick={handleAddChapter}>
          <Plus size={16} />
          <span>Añadir nuevo capítulo</span>
        </button>
      </div>

      {/* Insert Image Modal */}
      {insertModalChapterId && (
        <div className="image-modal-overlay" onClick={() => setInsertModalChapterId(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <ImageIcon size={20} className="text-apple-blue" />
                <h4>Insertar Imagen en el Capítulo</h4>
              </div>
              <button
                type="button"
                className="icon-action-btn"
                onClick={() => setInsertModalChapterId(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-tabs">
                <button
                  type="button"
                  className={`modal-tab-btn ${insertMode === 'upload' ? 'active' : ''}`}
                  onClick={() => setInsertMode('upload')}
                >
                  <Upload size={14} />
                  <span>Subir desde el equipo</span>
                </button>
                <button
                  type="button"
                  className={`modal-tab-btn ${insertMode === 'url' ? 'active' : ''}`}
                  onClick={() => setInsertMode('url')}
                >
                  <LinkIcon size={14} />
                  <span>URL Web</span>
                </button>
              </div>

              {insertMode === 'upload' ? (
                <div
                  className="modal-upload-area"
                  onClick={() => imageFileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={imageFileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={handleImageFileSelect}
                  />
                  {previewDataUrl ? (
                    <div className="modal-preview-wrapper">
                      <img src={previewDataUrl} alt="Vista previa" className="modal-img-preview" />
                      <span className="change-img-text">Haz clic para cambiar de imagen</span>
                    </div>
                  ) : (
                    <div className="modal-upload-placeholder">
                      <Upload size={32} className="text-apple-blue" />
                      <p className="placeholder-primary">Selecciona una imagen (PNG, JPG, WebP, SVG)</p>
                      <p className="placeholder-sub">Se convertirá e incluirá internamente en el EPUB</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-field">
                  <label className="field-label">URL de la imagen (HTTPS)</label>
                  <input
                    type="url"
                    className="text-input"
                    placeholder="https://ejemplo.com/grafico.png"
                    value={newImageUrl}
                    onChange={(e) => {
                      setNewImageUrl(e.target.value)
                      setPreviewDataUrl(null)
                    }}
                  />
                </div>
              )}

              <div className="form-grid-2" style={{ marginTop: '16px' }}>
                <div className="form-field">
                  <label className="field-label">Texto Alternativo (Alt)</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Descripción de la imagen"
                    value={newImageAlt}
                    onChange={(e) => setNewImageAlt(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="field-label">Pie de foto (Caption opcional)</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Figura 1: ..."
                    value={newImageCaption}
                    onChange={(e) => setNewImageCaption(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setInsertModalChapterId(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={!previewDataUrl && !newImageUrl.trim()}
                onClick={handleConfirmInsertImage}
              >
                <Plus size={16} />
                <span>Insertar en el capítulo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
