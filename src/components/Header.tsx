import React from 'react'
import { BookOpen, Apple, FileText, Globe } from 'lucide-react'

interface HeaderProps {
  onLoadSample: (type: 'paper' | 'blog') => void
}

export const Header: React.FC<HeaderProps> = ({ onLoadSample }) => {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-brand">
          <div className="brand-icon-wrapper">
            <BookOpen className="brand-icon" size={26} />
            <span className="brand-badge">EPUB 3</span>
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">EpubCraft</h1>
              <span className="apple-compatibility-pill">
                <Apple size={14} className="apple-icon" /> Optimizado para Apple Books
              </span>
            </div>
            <p className="brand-tagline">
              Convierte PDFs, enlaces de blogs y papers científicos en libros EPUB con portadas personalizadas.
            </p>
          </div>
        </div>

        <div className="header-actions">
          <span className="samples-label">Probar con ejemplos:</span>
          <button
            type="button"
            className="sample-btn"
            onClick={() => onLoadSample('paper')}
            title="Cargar paper 'Attention Is All You Need'"
          >
            <FileText size={15} />
            <span>Paper IA</span>
          </button>
          <button
            type="button"
            className="sample-btn"
            onClick={() => onLoadSample('blog')}
            title="Cargar ensayo de Paul Graham"
          >
            <Globe size={15} />
            <span>Blog Essay</span>
          </button>
        </div>
      </div>
    </header>
  )
}
