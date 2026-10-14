import { useState, useRef } from 'react'
import { Header } from './components/Header'
import { SourceSelector } from './components/SourceSelector'
import { CoverDesigner } from './components/CoverDesigner'
import { ChapterEditor } from './components/ChapterEditor'
import { AppleBooksGuide } from './components/AppleBooksGuide'
import { ExportBar } from './components/ExportBar'
import type { BookMetadata, Chapter, CoverConfig } from './types'
import { SAMPLE_PAPER, SAMPLE_BLOG } from './services/sampleData'
import { Info } from 'lucide-react'

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Book data state
  const [metadata, setMetadata] = useState<BookMetadata>(SAMPLE_PAPER.metadata)
  const [chapters, setChapters] = useState<Chapter[]>(SAMPLE_PAPER.chapters)
  const [coverConfig, setCoverConfig] = useState<CoverConfig>(SAMPLE_PAPER.cover)

  // Navigation tab state
  const [activeStep, setActiveStep] = useState<'source' | 'cover' | 'chapters' | 'guide'>('cover')

  // Total images across all chapters
  const totalImages = chapters.reduce((acc, ch) => {
    const matches = ch.content.match(/<img[^>]+>/gi)
    return acc + (matches ? matches.length : 0)
  }, 0)

  // Handle new source loaded (from PDF, EPUB, URL or manual text)
  const handleDataLoaded = (data: {
    metadata: BookMetadata
    chapters: Chapter[]
    suggestedTag: string
    coverDataUrl?: string
    imageCount?: number
  }) => {
    setMetadata(data.metadata)
    setChapters(data.chapters)
    setCoverConfig((prev) => ({
      ...prev,
      title: data.metadata.title || prev.title,
      author: data.metadata.author || prev.author,
      subtitle: data.metadata.subtitle || '',
      tag: data.suggestedTag || prev.tag,
      customImage: data.coverDataUrl || prev.customImage,
      backgroundType: data.coverDataUrl ? 'image' : prev.backgroundType,
    }))
    // Transition to chapters to inspect extracted content and images
    setActiveStep('chapters')
  }

  // Handle sample presets loading
  const handleLoadSample = (type: 'paper' | 'blog') => {
    if (type === 'paper') {
      setMetadata(SAMPLE_PAPER.metadata)
      setChapters(SAMPLE_PAPER.chapters)
      setCoverConfig(SAMPLE_PAPER.cover)
    } else {
      setMetadata(SAMPLE_BLOG.metadata)
      setChapters(SAMPLE_BLOG.chapters)
      setCoverConfig(SAMPLE_BLOG.cover)
    }
    setActiveStep('cover')
  }

  // Keep metadata title/author in sync with cover
  const handleCoverChange = (newCover: CoverConfig) => {
    setCoverConfig(newCover)
    setMetadata((prev) => ({
      ...prev,
      title: newCover.title || prev.title,
      author: newCover.author || prev.author,
      subtitle: newCover.subtitle || prev.subtitle,
    }))
  }

  const handleMetadataChange = (newMeta: BookMetadata) => {
    setMetadata(newMeta)
    setCoverConfig((prev) => ({
      ...prev,
      title: newMeta.title,
      author: newMeta.author,
      subtitle: newMeta.subtitle || '',
    }))
  }

  return (
    <div className="app-layout">
      {/* Top Header */}
      <Header onLoadSample={handleLoadSample} />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Step Navigation Bar */}
        <nav className="step-nav-bar">
          <div className="step-nav-inner">
            <button
              type="button"
              className={`step-nav-item ${activeStep === 'source' ? 'active' : ''}`}
              onClick={() => setActiveStep('source')}
            >
              <div className="step-number">1</div>
              <div className="step-text">
                <span className="step-heading">Importar Fuente</span>
                <span className="step-subheading">PDF, EPUB, Web o Texto</span>
              </div>
            </button>

            <div className="step-connector" />

            <button
              type="button"
              className={`step-nav-item ${activeStep === 'cover' ? 'active' : ''}`}
              onClick={() => setActiveStep('cover')}
            >
              <div className="step-number">2</div>
              <div className="step-text">
                <span className="step-heading">Diseñar Portada</span>
                <span className="step-subheading">Fuentes, Colores e Imagen</span>
              </div>
            </button>

            <div className="step-connector" />

            <button
              type="button"
              className={`step-nav-item ${activeStep === 'chapters' ? 'active' : ''}`}
              onClick={() => setActiveStep('chapters')}
            >
              <div className="step-number">3</div>
              <div className="step-text">
                <span className="step-heading">Capítulos e Imágenes</span>
                <span className="step-subheading">
                  {chapters.length} sec · {totalImages} {totalImages === 1 ? 'imagen' : 'imágenes'}
                </span>
              </div>
            </button>

            <div className="step-connector" />

            <button
              type="button"
              className={`step-nav-item ${activeStep === 'guide' ? 'active' : ''}`}
              onClick={() => setActiveStep('guide')}
            >
              <div className="step-number">
                <Info size={14} />
              </div>
              <div className="step-text">
                <span className="step-heading">Guía Apple Books</span>
                <span className="step-subheading">iPhone, iPad & Mac</span>
              </div>
            </button>
          </div>
        </nav>

        {/* Step 1: Source Selector */}
        {activeStep === 'source' && (
          <div className="step-container">
            <SourceSelector onDataLoaded={handleDataLoaded} />
          </div>
        )}

        {/* Step 2: Cover Designer */}
        {activeStep === 'cover' && (
          <div className="step-container">
            <CoverDesigner
              config={coverConfig}
              onChange={handleCoverChange}
              canvasRef={canvasRef}
            />
          </div>
        )}

        {/* Step 3: Chapters & Content */}
        {activeStep === 'chapters' && (
          <div className="step-container">
            <ChapterEditor
              chapters={chapters}
              metadata={metadata}
              onUpdateChapters={setChapters}
              onUpdateMetadata={handleMetadataChange}
            />
          </div>
        )}

        {/* Step 4: Apple Books Guide */}
        {activeStep === 'guide' && (
          <div className="step-container">
            <AppleBooksGuide />
          </div>
        )}
      </main>

      {/* Sticky Bottom Export Dock */}
      <ExportBar
        metadata={metadata}
        chapters={chapters}
        coverConfig={coverConfig}
        canvasRef={canvasRef}
      />
    </div>
  )
}

export default App
