import React, { useState } from 'react'
import { Download, Share2, Loader2, CheckCircle2, BookCheck } from 'lucide-react'
import confetti from 'canvas-confetti'
import type { BookMetadata, Chapter, CoverConfig } from '../types'
import { generateEpubBlob } from '../services/epubGenerator'
import { exportCanvasAsBlob } from '../services/coverRenderer'

interface ExportBarProps {
  metadata: BookMetadata
  chapters: Chapter[]
  coverConfig: CoverConfig
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

export const ExportBar: React.FC<ExportBarProps> = ({
  metadata,
  chapters,
  coverConfig,
  canvasRef,
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [lastFileSize, setLastFileSize] = useState<string | null>(null)
  const [lastEpubBlob, setLastEpubBlob] = useState<Blob | null>(null)

  const canWebShare = typeof navigator !== 'undefined' && !!navigator.share

  const totalImages = chapters.reduce((acc, ch) => {
    const matches = ch.content.match(/<img[^>]+>/gi)
    return acc + (matches ? matches.length : 0)
  }, 0)

  const handleGenerateAndDownload = async () => {
    if (!canvasRef.current) return

    setIsGenerating(true)
    setDownloadSuccess(false)

    try {
      // 1. Export cover canvas to blob
      const coverBlob = await exportCanvasAsBlob(canvasRef.current)

      // 2. Compile EPUB with standard structure, all embedded chapter images, and custom cover
      const epubBlob = await generateEpubBlob({
        metadata,
        chapters,
        coverImageBlob: coverBlob,
      })

      setLastEpubBlob(epubBlob)
      const sizeKb = (epubBlob.size / 1024).toFixed(1)
      setLastFileSize(`${sizeKb} KB`)

      // 3. Trigger download
      const safeFilename = (metadata.title || 'libro')
        .replace(/[/\\?%*:|"<>]/g, '-')
        .trim() + '.epub'

      const url = URL.createObjectURL(epubBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = safeFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 1000)

      setDownloadSuccess(true)

      // Fire celebratory confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#0071e3', '#34c759', '#ff9500', '#af52de'],
      })
    } catch (err) {
      console.error('Error generating EPUB', err)
      alert('Hubo un error al generar el EPUB. Por favor revisa los datos.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleShareToAppleBooks = async () => {
    try {
      let blob = lastEpubBlob
      if (!blob && canvasRef.current) {
        setIsGenerating(true)
        const coverBlob = await exportCanvasAsBlob(canvasRef.current)
        blob = await generateEpubBlob({
          metadata,
          chapters,
          coverImageBlob: coverBlob,
        })
        setLastEpubBlob(blob)
        setIsGenerating(false)
      }

      if (!blob) return

      const safeFilename = (metadata.title || 'libro')
        .replace(/[/\\?%*:|"<>]/g, '-')
        .trim() + '.epub'

      const file = new File([blob], safeFilename, { type: 'application/epub+zip' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: metadata.title,
          text: `Lee "${metadata.title}" en Apple Books`,
        })
      } else {
        alert('Tu navegador no soporta compartir archivos directamente. Usa el botón de descarga regular.')
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('Share failed', err)
      }
    }
  }

  return (
    <div className="export-dock">
      <div className="export-dock-inner">
        <div className="export-summary">
          <div className="export-book-icon">
            <BookCheck size={28} className="text-apple-blue" />
          </div>
          <div>
            <h4 className="export-title">
              {metadata.title || 'Documento sin título'}
            </h4>
            <p className="export-meta">
              Por {metadata.author || 'Autor'} · {chapters.length} {chapters.length === 1 ? 'sección' : 'secciones'}
              {totalImages > 0 && ` · ${totalImages} ${totalImages === 1 ? 'imagen empaquetada' : 'imágenes empaquetadas'}`}
              {` · Portada: ${coverConfig.fontFamily}`}
            </p>
          </div>
        </div>

        <div className="export-buttons-group">
          {canWebShare && (
            <button
              type="button"
              className="share-btn"
              onClick={handleShareToAppleBooks}
              disabled={isGenerating}
              title="Abrir hoja de compartir en iOS / macOS para enviar a Libros"
            >
              <Share2 size={17} />
              <span>Compartir en iOS / iPad</span>
            </button>
          )}

          <button
            type="button"
            className="download-epub-btn"
            onClick={handleGenerateAndDownload}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="spin-icon" />
                <span>Empaquetando EPUB e imágenes...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Descargar EPUB para Apple Books</span>
              </>
            )}
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="download-feedback-banner">
          <CheckCircle2 size={18} className="text-emerald" />
          <span>
            ¡EPUB generado con éxito ({lastFileSize}) con {totalImages} {totalImages === 1 ? 'imagen' : 'imágenes'} empaquetadas! Haz doble clic en Mac o ábrelo en iPhone/iPad para disfrutarlo en <strong>Apple Books</strong>.
          </span>
        </div>
      )}
    </div>
  )
}
