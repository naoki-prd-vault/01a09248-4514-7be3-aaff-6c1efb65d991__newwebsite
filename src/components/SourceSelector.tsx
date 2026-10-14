import React, { useState, useRef } from 'react'
import { FileUp, Link2, Edit3, Loader2, AlertCircle, CheckCircle2, ArrowRight, BookMarked, Image as ImageIcon } from 'lucide-react'
import type { SourceType, BookMetadata, Chapter } from '../types'
import { parsePdfFile } from '../services/pdfParser'
import { parseEpubFile } from '../services/epubParser'
import { fetchWebArticle, parseMarkdownArticle } from '../services/webArticleFetcher'

interface SourceSelectorProps {
  onDataLoaded: (data: {
    metadata: BookMetadata
    chapters: Chapter[]
    suggestedTag: string
    coverDataUrl?: string
    imageCount?: number
  }) => void
}

export const SourceSelector: React.FC<SourceSelectorProps> = ({ onDataLoaded }) => {
  const [activeTab, setActiveTab] = useState<SourceType | 'epub'>('pdf')
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // URL state
  const [urlInput, setUrlInput] = useState('')

  // Manual state
  const [manualTitle, setManualTitle] = useState('')
  const [manualAuthor, setManualAuthor] = useState('')
  const [manualSubtitle, setManualSubtitle] = useState('')
  const [manualContent, setManualContent] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    const nameLower = file.name.toLowerCase()
    const isEpub = nameLower.endsWith('.epub')
    const isPdf = nameLower.endsWith('.pdf')

    if (!isPdf && !isEpub) {
      setErrorMessage('Por favor selecciona un archivo con extensión .pdf o .epub')
      return
    }

    setErrorMessage('')
    setSuccessNotice(null)
    setIsProcessing(true)

    if (isEpub) {
      setStatusMessage('Analizando estructura del archivo EPUB...')
      try {
        const result = await parseEpubFile(file, (msg) => setStatusMessage(msg))
        setSuccessNotice(
          `EPUB importado con éxito: ${result.chapters.length} secciones y ${result.imageCount} imagen(es) detectada(s).`
        )
        onDataLoaded({
          metadata: result.metadata,
          chapters: result.chapters,
          suggestedTag: 'LIBRO EPUB',
          coverDataUrl: result.coverDataUrl,
          imageCount: result.imageCount,
        })
      } catch (err: unknown) {
        console.error('Error importing EPUB', err)
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'No se pudo leer el archivo EPUB. Comprueba que el archivo no esté dañado.'
        )
      } finally {
        setIsProcessing(false)
        setStatusMessage('')
      }
      return
    }

    // PDF branch
    setStatusMessage('Iniciando lectura y detección de texto e imágenes en PDF...')
    try {
      const result = await parsePdfFile(file, (progress) => {
        setStatusMessage(progress.stage)
      })

      setSuccessNotice(
        `PDF procesado: ${result.chapters.length} secciones y ${result.extractedImagesCount} imágenes detectadas.`
      )

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
        imageCount: result.extractedImagesCount,
      })
    } catch (err: unknown) {
      console.error('Error parsing PDF', err)
      setErrorMessage(
        'Error al procesar el archivo PDF. Asegúrate de que no esté protegido con contraseña.'
      )
    } finally {
      setIsProcessing(false)
      setStatusMessage('')
    }
  }

  const handleUrlFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!urlInput.trim()) return

    setErrorMessage('')
    setSuccessNotice(null)
    setIsProcessing(true)
    setStatusMessage('Extrayendo texto e ilustraciones del enlace...')

    try {
      const result = await fetchWebArticle(urlInput, (status) => setStatusMessage(status))
      setSuccessNotice(
        `Artículo importado: ${result.chapters.length} capítulos y ${result.imageCount} imagen(es) detectada(s).`
      )
      onDataLoaded({
        metadata: result.metadata,
        chapters: result.chapters,
        suggestedTag: 'BLOG & ARTÍCULO',
        imageCount: result.imageCount,
      })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error desconocido al descargar la página.'
      setErrorMessage(message)
    } finally {
      setIsProcessing(false)
      setStatusMessage('')
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTitle.trim()) {
      setErrorMessage('Ingresa al menos un título para el libro.')
      return
    }
    setErrorMessage('')

    let chapters: Chapter[]
    let imageCount = 0

    // If manual content has markdown indicators or HTML tags
    if (
      manualContent.includes('#') ||
      manualContent.includes('---') ||
      manualContent.includes('> ') ||
      manualContent.includes('```') ||
      manualContent.includes('<p>') ||
      manualContent.includes('<figure>')
    ) {
      const parsed = parseMarkdownArticle(manualContent, '')
      chapters = parsed.chapters
      imageCount = parsed.imageCount
      if (chapters.length === 1 && (chapters[0].title === 'Artículo Web' || chapters[0].title === 'Introducción')) {
        chapters[0].title = manualTitle.trim()
      }
    } else {
      const paras = manualContent
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)

      chapters = [
        {
          id: 'manual-1',
          title: manualTitle.trim(),
          content:
            paras.length > 0
              ? paras.map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('\n')
              : '<p>Documento preparado para Apple Books.</p>',
        },
      ]
    }

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
      imageCount,
    })
  }

  return (
    <section className="source-card">
      <div className="source-tabs-header">
        <button
          type="button"
          className={`source-tab-btn ${activeTab === 'pdf' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('pdf')
            setErrorMessage('')
          }}
        >
          <FileUp size={18} />
          <span>Subir PDF o EPUB</span>
        </button>

        <button
          type="button"
          className={`source-tab-btn ${activeTab === 'url' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('url')
            setErrorMessage('')
          }}
        >
          <Link2 size={18} />
          <span>Enlace Web / Blog</span>
        </button>

        <button
          type="button"
          className={`source-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('manual')
            setErrorMessage('')
          }}
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

        {successNotice && (
          <div className="alert-box success">
            <CheckCircle2 size={18} />
            <span>{successNotice}</span>
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
                handleFileUpload(e.dataTransfer.files[0])
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.epub"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0])
                }
              }}
            />
            <div className="dropzone-icon-circle">
              <FileUp size={32} />
            </div>
            <h3 className="dropzone-title">Arrastra tu archivo PDF o EPUB aquí</h3>
            <p className="dropzone-subtitle">
              Soporta libros electrónicos, papers científicos, reportes y artículos con imágenes
            </p>
            <div className="dropzone-features-row">
              <span className="dropzone-tag">
                <ImageIcon size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Detección y extracción automática de imágenes
              </span>
              <span className="dropzone-tag">
                <BookMarked size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Estructura de capítulos e índice
              </span>
            </div>
          </div>
        )}

        {activeTab === 'url' && (
          <form className="url-form" onSubmit={handleUrlFetch}>
            <p className="tab-explainer">
              Introduce la URL de un post de Substack, Medium, blog personal, paper de arXiv o artículo web. Detectamos e importamos automáticamente texto e ilustraciones.
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
                <span>Importar con Imágenes</span>
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
              <label className="field-label">Contenido (Texto, Markdown o HTML con imágenes)</label>
              <textarea
                className="textarea-input"
                rows={6}
                placeholder="Pega aquí el texto, markdown o etiquetas &lt;img src=&quot;...&quot;&gt; de tu contenido..."
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
