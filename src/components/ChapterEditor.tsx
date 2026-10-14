import React, { useState } from 'react'
import type { Chapter, BookMetadata } from '../types'
import { BookOpen, Plus, Trash2, Clock, FileText, ChevronDown, ChevronUp } from 'lucide-react'

interface ChapterEditorProps {
  chapters: Chapter[]
  metadata: BookMetadata
  onUpdateChapters: (chapters: Chapter[]) => void
  onUpdateMetadata: (metadata: BookMetadata) => void
}

export const ChapterEditor: React.FC<ChapterEditorProps> = ({
  chapters,
  metadata,
  onUpdateChapters,
  onUpdateMetadata,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(chapters[0]?.id || null)

  // Calculate statistics
  const totalWords = chapters.reduce((acc, ch) => {
    const text = ch.content.replace(/<[^>]+>/g, ' ')
    const words = text.trim().split(/\s+/).filter(Boolean).length
    return acc + words
  }, 0)
  const estimatedReadingMinutes = Math.max(1, Math.round(totalWords / 200))

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

  return (
    <div className="chapter-editor-card">
      <div className="chapter-editor-header">
        <div>
          <h3 className="section-title">Estructura y Capítulos del Libro</h3>
          <p className="section-subtitle">
            Revisa el texto extraído que se compilará dentro del archivo EPUB
          </p>
        </div>

        <div className="stats-badges">
          <span className="stat-pill">
            <FileText size={14} /> {chapters.length} {chapters.length === 1 ? 'sección' : 'secciones'}
          </span>
          <span className="stat-pill">
            <BookOpen size={14} /> ~{totalWords.toLocaleString()} palabras
          </span>
          <span className="stat-pill">
            <Clock size={14} /> ~{estimatedReadingMinutes} min de lectura
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
                </div>

                <div className="chapter-item-actions">
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
                    <span className="preview-rendered-label">Previsualización de lectura:</span>
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
    </div>
  )
}
