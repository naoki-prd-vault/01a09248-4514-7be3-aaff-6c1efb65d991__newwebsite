import React, { useState, useRef } from 'react'
import { FileUp, Link2, Edit3, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import type { SourceType, BookMetadata, Chapter } from '../types'
import { parsePdfFile } from '../services/pdfParser'
import { fetchWebArticle } from '../services/webArticleFetcher'

interface SourceSelectorProps {
  onDataLoaded: (data: {
    metadata: BookMetadata
    chapters: Chapter[]
    suggestedTag: string
  }) => void
}

export const SourceSelector: React.FC<SourceSelectorProps> = ({ onDataLoaded }) => {
  const [activeTab, setActiveTab] = useState<SourceType>('pdf')
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [dragOver, setDragOver] = useState(false)

  // URL state
  const [urlInput, setUrlInput] = useState('')

  // Manual state
  const [manualTitle, setManualTitle] = useState('')
  const [manualAuthor, setManualAuthor] = useState('')
  const [manualSubtitle, setManualSubtitle] = useState('')
  const [manualContent, setManualContent] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePdfUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Por favor selecciona un archivo con extensión .pdf')
      return
    }

    setErrorMessage('')
    setIsProcessing(true)
    setStatusMessage('Iniciando lectura del PDF...')

    try {
      const result = await parsePdfFile(file, (progress) => {
        setStatusMessage(progress.stage)
      })

      onDataLoaded({
        metadata: {
          title: result.metadata.title || file.name.replace(/\.pdf$/i, ''),
          author: result.metadata.author || 'Autor del PDF',
          publisher: 'Edición Digital',
          language: 'es',
          originalFilename: file.name,
        },
        chapters: result.chapters,
        suggestedTag: result.pageCount > 15 ? 'RESEARCH PAPER' : 'DOCUMENTO PDF',
      })
      setStatusMessage('')
    } catch (err: unknown) {
      console.error(err)
      setErrorMessage('Error al procesar el archivo PDF. Asegúrate de que no esté protegido con contraseña.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUrlFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!urlInput.trim()) return

    setErrorMessage('')
    setIsProcessing(true)
    setStatusMessage('Extrayendo contenido del enlace...')

    try {
      const result = await fetchWebArticle(urlInput, (status) => setStatusMessage(status))
      onDataLoaded({
        metadata: result.metadata,
        chapters: result.chapters,
        suggestedTag: 'BLOG & ARTÍCULO',
      })
      setStatusMessage('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al descargar la página.'
      setErrorMessage(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTitle.trim()) {
      setErrorMessage('Ingresa al menos un título para el libro.')
      return
    }
    setErrorMessage('')

    // Divide content by double linebreaks or headings
    const paras = manualContent
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean)

    const chapters: Chapter[] = [
      {
        id: 'manual-1',
        title: manualTitle,
        content: paras.length > 0
          ? paras.map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('\n')
          : '<p>Documento preparado para Apple Books.</p>',
      },
    ]

    onDataLoaded({
      metadata: {
        title: manualTitle.trim(),
        author: manualAuthor.trim() || 'Autor',
        subtitle: manualSubtitle.trim(),
        publisher: 'Edición Personal',
        language: 'es',
      },
      chapters,
      suggestedTag: 'PAPER / ENSAYO',
    })
  }

  return (
    <section className="source-card">
      <div className="source-tabs-header">
        <button
          type="button"
          className={`source-tab-btn ${activeTab === 'pdf' ? 'active' : ''}`}
          onClick={() => { setActiveTab('pdf'); setErrorMessage('') }}
        >
          <FileUp size={18} />
          <span>Subir PDF</span>
        </button>

        <button
          type="button"
          className={`source-tab-btn ${activeTab === 'url' ? 'active' : ''}`}
          onClick={() => { setActiveTab('url'); setErrorMessage('') }}
        >
          <Link2 size={18} />
          <span>Enlace de Blog / Paper</span>
        </button>

        <button
          type="button"
          className={`source-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => { setActiveTab('manual'); setErrorMessage('') }}
        >
          <Edit3 size={18} />
          <span>Texto o Markdown</span>
        </button>
      </div>

      <div className="source-tab-content">
        {errorMessage && (
          <div className="alert-box error">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {isProcessing && (
          <div className="processing-overlay">
            <Loader2 size={32} className="spin-icon" />
            <p className="processing-text">{statusMessage || 'Procesando documento...'}</p>
          </div>
        )}

        {activeTab === 'pdf' && (
          <div
            className={`dropzone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handlePdfUpload(e.dataTransfer.files[0])
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handlePdfUpload(e.target.files[0])
                }
              }}
            />
            <div className="dropzone-icon-circle">
              <FileUp size={32} />
            </div>
            <h3 className="dropzone-title">Arrastra tu archivo PDF aquí</h3>
            <p className="dropzone-subtitle">o haz clic para buscar en tus carpetas (papers, reportes, libros)</p>
            <span className="dropzone-tag">Convierte automáticamente texto y estructura a formato EPUB</span>
          </div>
        )}

        {activeTab === 'url' && (
          <form className="url-form" onSubmit={handleUrlFetch}>
            <p className="tab-explainer">
              Introduce la URL de un post de Substack, Medium, blog personal, paper de arXiv o artículo web.
            </p>
            <div className="url-input-group">
              <input
                type="url"
                className="text-input"
                placeholder="https://paulgraham.com/greatwork.html o link de blog/paper..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                required
              />
              <button
                type="submit"
                className="primary-btn"
                disabled={isProcessing || !urlInput.trim()}
              >
                {isProcessing ? <Loader2 size={16} className="spin-icon" /> : <ArrowRight size={16} />}
                <span>Convertir Enlace</span>
              </button>
            </div>
            <div className="url-examples">
              <span className="url-examples-title">Ejemplos rápidos:</span>
              <button
                type="button"
                className="chip-btn"
                onClick={() => setUrlInput('https://paulgraham.com/greatwork.html')}
              >
                Paul Graham: Great Work
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={() => setUrlInput('https://arxiv.org/abs/1706.03762')}
              >
                arXiv: Transformers
              </button>
            </div>
          </form>
        )}

        {activeTab === 'manual' && (
          <form className="manual-form" onSubmit={handleManualSubmit}>
            <div className="form-grid-2">
              <div className="form-field">
                <label className="field-label">Título del libro / paper *</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="Ej: Principios de Computación Cuántica"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="field-label">Autor(a)</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="Ej: Richard Feynman"
                  value={manualAuthor}
                  onChange={(e) => setManualAuthor(e.target.value)}
                />
              </div>
            </div>
            <div className="form-field">
              <label className="field-label">Subtítulo o descripción breve</label>
              <input
                type="text"
                className="text-input"
                placeholder="Ej: Introducción para desarrolladores y científicos"
                value={manualSubtitle}
                onChange={(e) => setManualSubtitle(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="field-label">Contenido (Texto o Markdown)</label>
              <textarea
                className="textarea-input"
                rows={6}
                placeholder="Pega aquí el contenido de tu paper, ensayo o notas..."
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
              />
            </div>
            <button type="submit" className="primary-btn">
              <CheckCircle2 size={16} />
              <span>Preparar libro y diseñar portada</span>
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
