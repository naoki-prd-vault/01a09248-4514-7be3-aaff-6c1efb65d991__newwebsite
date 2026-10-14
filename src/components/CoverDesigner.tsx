import React, { useEffect, useRef, useState } from 'react'
import {
  Palette,
  Type,
  Layout,
  Sparkles,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RefreshCw,
  Eye,
} from 'lucide-react'
import type {
  CoverConfig,
  CoverFontFamily,
  CoverFrameStyle,
} from '../types'
import { PRESET_THEMES } from '../services/sampleData'
import { renderCoverToCanvas } from '../services/coverRenderer'

interface CoverDesignerProps {
  config: CoverConfig
  onChange: (newConfig: CoverConfig) => void
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

const FONTS: { id: CoverFontFamily; label: string; sample: string; category: string }[] = [
  { id: 'Playfair Display', label: 'Playfair Display', sample: 'Elegante y literario', category: 'Serif' },
  { id: 'Cinzel', label: 'Cinzel Roman', sample: 'Clásico académico imperial', category: 'Serif' },
  { id: 'Cormorant Garamond', label: 'Cormorant', sample: 'Distinguido y refinado', category: 'Serif' },
  { id: 'Bodoni Moda', label: 'Bodoni Moda', sample: 'Editorial de prestigio', category: 'Serif' },
  { id: 'Newsreader', label: 'Newsreader', sample: 'Periodismo y ensayos profundos', category: 'Serif' },
  { id: 'Georgia', label: 'Georgia', sample: 'Lectura tradicional', category: 'Serif' },
  { id: 'Inter', label: 'San Francisco / Inter', sample: 'Minimalismo moderno estilo Apple', category: 'Sans-Serif' },
  { id: 'Montserrat', label: 'Montserrat', sample: 'Geométrico e imponente', category: 'Sans-Serif' },
  { id: 'Space Grotesk', label: 'Space Grotesk', sample: 'Vanguardista y tecnológico', category: 'Sans-Serif' },
  { id: 'JetBrains Mono', label: 'JetBrains Mono', sample: 'Papers de código y ciencia', category: 'Mono' },
]

const COLOR_SWATCHES = [
  { name: 'Blanco Puro', bg1: '#ffffff', bg2: '#f3f4f6', text: '#111827', accent: '#0071e3' },
  { name: 'Apple Dark', bg1: '#1c1c1e', bg2: '#2c2c2e', text: '#f5f5f7', accent: '#2997ff' },
  { name: 'Azul Oxford', bg1: '#0a192f', bg2: '#172a45', text: '#ffffff', accent: '#64ffda' },
  { name: 'Sepia Cálido', bg1: '#fbf0d9', bg2: '#eedec2', text: '#3c2a1a', accent: '#9a3412' },
  { name: 'Esmeralda', bg1: '#064e3b', bg2: '#047857', text: '#ecfdf5', accent: '#34d399' },
  { name: 'Borgoña Real', bg1: '#4a0404', bg2: '#831843', text: '#fff1f2', accent: '#fbcfe8' },
  { name: 'Índigo Violeta', bg1: '#311068', bg2: '#5b21b6', text: '#f5f3ff', accent: '#c084fc' },
  { name: 'Terracota', bg1: '#7c2d12', bg2: '#c2410c', text: '#fff7ed', accent: '#fdba74' },
]

export const CoverDesigner: React.FC<CoverDesignerProps> = ({
  config,
  onChange,
  canvasRef,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'typography' | 'colors' | 'layout'>('presets')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Re-render canvas whenever config changes
  useEffect(() => {
    if (canvasRef.current) {
      renderCoverToCanvas(canvasRef.current, config)
    }
  }, [config, canvasRef])

  const handleImageUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      onChange({
        ...config,
        backgroundType: 'image',
        customImage: dataUrl,
      })
    }
    reader.readAsDataURL(file)
  }

  const applyPalette = (swatch: typeof COLOR_SWATCHES[0]) => {
    onChange({
      ...config,
      backgroundColor: swatch.bg1,
      backgroundColorEnd: swatch.bg2,
      textColor: swatch.text,
      accentColor: swatch.accent,
    })
  }

  return (
    <div className="cover-designer-container">
      {/* Visual Live Preview Column */}
      <div className="preview-column">
        <div className="preview-sticky">
          <div className="preview-header">
            <span className="preview-badge">
              <Eye size={14} /> Vista previa de Portada (Apple Books)
            </span>
            <span className="resolution-indicator">1200 × 1800 px</span>
          </div>

          <div className="book-stage">
            <div className="book-3d-wrapper">
              <div className="book-spine-effect" />
              <canvas
                ref={canvasRef}
                className="cover-canvas"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
              <div className="book-gloss-overlay" />
            </div>
          </div>

          <div className="preview-actions">
            <button
              type="button"
              className="secondary-btn small"
              onClick={() => {
                if (canvasRef.current) {
                  renderCoverToCanvas(canvasRef.current, config)
                }
              }}
            >
              <RefreshCw size={14} />
              <span>Refrescar portada</span>
            </button>
            <label className="apple-toggle">
              <input
                type="checkbox"
                checked={config.showAppleBadge !== false}
                onChange={(e) => onChange({ ...config, showAppleBadge: e.target.checked })}
              />
              <span>Sello  Libros en pie de página</span>
            </label>
          </div>
        </div>
      </div>

      {/* Customization Controls Column */}
      <div className="controls-column">
        <div className="controls-nav">
          <button
            type="button"
            className={`control-nav-tab ${activeTab === 'presets' ? 'active' : ''}`}
            onClick={() => setActiveTab('presets')}
          >
            <Sparkles size={16} />
            <span>Estilos</span>
          </button>
          <button
            type="button"
            className={`control-nav-tab ${activeTab === 'typography' ? 'active' : ''}`}
            onClick={() => setActiveTab('typography')}
          >
            <Type size={16} />
            <span>Tipografía</span>
          </button>
          <button
            type="button"
            className={`control-nav-tab ${activeTab === 'colors' ? 'active' : ''}`}
            onClick={() => setActiveTab('colors')}
          >
            <Palette size={16} />
            <span>Colores</span>
          </button>
          <button
            type="button"
            className={`control-nav-tab ${activeTab === 'layout' ? 'active' : ''}`}
            onClick={() => setActiveTab('layout')}
          >
            <Layout size={16} />
            <span>Marcos & Textos</span>
          </button>
        </div>

        {/* TAB 1: PRESETS */}
        {activeTab === 'presets' && (
          <div className="control-pane">
            <h4 className="pane-section-title">Temas y estilos predefinidos</h4>
            <p className="pane-section-desc">Selecciona una plantilla diseñada para libros de Apple Books:</p>
            <div className="presets-grid">
              {PRESET_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className="preset-card"
                  onClick={() => onChange({ ...config, ...theme.cover })}
                >
                  <div
                    className="preset-swatch-preview"
                    style={{
                      background: theme.cover.backgroundType === 'gradient'
                        ? `linear-gradient(${theme.cover.gradientAngle || 135}deg, ${theme.cover.backgroundColor}, ${theme.cover.backgroundColorEnd})`
                        : theme.cover.backgroundColor,
                      borderColor: theme.cover.accentColor,
                    }}
                  >
                    <span
                      style={{
                        color: theme.cover.textColor,
                        fontFamily: theme.cover.fontFamily,
                        fontSize: '11px',
                        fontWeight: 'bold',
                      }}
                    >
                      Aa
                    </span>
                  </div>
                  <div className="preset-info">
                    <span className="preset-name">{theme.name}</span>
                    <span className="preset-desc">{theme.description}</span>
                  </div>
                </button>
              ))}
            </div>

            <h4 className="pane-section-title" style={{ marginTop: '24px' }}>
              Paletas de Color de 1 Clic
            </h4>
            <div className="swatches-grid">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.name}
                  type="button"
                  className="swatch-btn"
                  onClick={() => applyPalette(swatch)}
                  title={swatch.name}
                >
                  <span
                    className="swatch-circle"
                    style={{
                      background: `linear-gradient(135deg, ${swatch.bg1}, ${swatch.bg2})`,
                      boxShadow: `0 0 0 2px ${swatch.accent}`,
                    }}
                  />
                  <span className="swatch-label">{swatch.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: TYPOGRAPHY */}
        {activeTab === 'typography' && (
          <div className="control-pane">
            <h4 className="pane-section-title">Familia Tipográfica</h4>
            <p className="pane-section-desc">Fuentes renderizadas con máxima nitidez para portadas:</p>

            <div className="fonts-list">
              {FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  className={`font-option-btn ${config.fontFamily === font.id ? 'selected' : ''}`}
                  onClick={() => onChange({ ...config, fontFamily: font.id })}
                >
                  <div className="font-option-header">
                    <span className="font-name" style={{ fontFamily: font.id }}>
                      {font.label}
                    </span>
                    <span className="font-tag">{font.category}</span>
                  </div>
                  <span className="font-sample" style={{ fontFamily: font.id }}>
                    {font.sample}
                  </span>
                </button>
              ))}
            </div>

            <div className="sliders-section">
              <h4 className="pane-section-title">Ajustes de Tamaño</h4>
              <div className="slider-group">
                <div className="slider-header">
                  <span className="slider-label">Tamaño del Título</span>
                  <span className="slider-val">{config.titleFontSize}px</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={96}
                  value={config.titleFontSize}
                  onChange={(e) => onChange({ ...config, titleFontSize: Number(e.target.value) })}
                  className="custom-range"
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span className="slider-label">Tamaño del Autor</span>
                  <span className="slider-val">{config.authorFontSize}px</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={52}
                  value={config.authorFontSize}
                  onChange={(e) => onChange({ ...config, authorFontSize: Number(e.target.value) })}
                  className="custom-range"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COLORS & BACKGROUNDS */}
        {activeTab === 'colors' && (
          <div className="control-pane">
            <h4 className="pane-section-title">Tipo de Fondo</h4>
            <div className="bg-type-toggle">
              <button
                type="button"
                className={`toggle-option ${config.backgroundType === 'solid' ? 'active' : ''}`}
                onClick={() => onChange({ ...config, backgroundType: 'solid' })}
              >
                Color Sólido
              </button>
              <button
                type="button"
                className={`toggle-option ${config.backgroundType === 'gradient' ? 'active' : ''}`}
                onClick={() => onChange({ ...config, backgroundType: 'gradient' })}
              >
                Degradado
              </button>
              <button
                type="button"
                className={`toggle-option ${config.backgroundType === 'pattern' ? 'active' : ''}`}
                onClick={() => onChange({ ...config, backgroundType: 'pattern' })}
              >
                Patrón
              </button>
              <button
                type="button"
                className={`toggle-option ${config.backgroundType === 'image' ? 'active' : ''}`}
                onClick={() => {
                  onChange({ ...config, backgroundType: 'image' })
                  fileInputRef.current?.click()
                }}
              >
                Subir Imagen
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImageUpload(e.target.files[0])
                }
              }}
            />

            {config.backgroundType === 'image' && (
              <div className="upload-box-notice">
                <Upload size={18} />
                <span>
                  {config.customImage ? 'Imagen personalizada cargada' : 'Haz clic para elegir una imagen de tu equipo'}
                </span>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ marginLeft: 'auto' }}
                >
                  Cambiar
                </button>
              </div>
            )}

            {config.backgroundType === 'pattern' && (
              <div className="pattern-selector">
                <span className="slider-label">Estilo del patrón de fondo:</span>
                <div className="chips-row">
                  {(['dots', 'grid', 'circles'] as const).map((pat) => (
                    <button
                      key={pat}
                      type="button"
                      className={`chip-btn ${config.patternType === pat ? 'active' : ''}`}
                      onClick={() => onChange({ ...config, patternType: pat })}
                    >
                      {pat === 'dots' && 'Puntos sutiles'}
                      {pat === 'grid' && 'Cuadrícula Blueprint'}
                      {pat === 'circles' && 'Círculos concéntricos'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="color-pickers-grid">
              <div className="color-field">
                <label className="field-label">Color de Fondo {config.backgroundType === 'gradient' ? '1' : ''}</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={config.backgroundColor}
                    onChange={(e) => onChange({ ...config, backgroundColor: e.target.value })}
                  />
                  <span className="color-code">{config.backgroundColor}</span>
                </div>
              </div>

              {config.backgroundType === 'gradient' && (
                <div className="color-field">
                  <label className="field-label">Color de Fondo 2 (Final)</label>
                  <div className="color-input-wrapper">
                    <input
                      type="color"
                      value={config.backgroundColorEnd || '#3b82f6'}
                      onChange={(e) => onChange({ ...config, backgroundColorEnd: e.target.value })}
                    />
                    <span className="color-code">{config.backgroundColorEnd || '#3b82f6'}</span>
                  </div>
                </div>
              )}

              <div className="color-field">
                <label className="field-label">Color del Texto</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={config.textColor}
                    onChange={(e) => onChange({ ...config, textColor: e.target.value })}
                  />
                  <span className="color-code">{config.textColor}</span>
                </div>
              </div>

              <div className="color-field">
                <label className="field-label">Color de Acento (Marcos / Etiquetas)</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => onChange({ ...config, accentColor: e.target.value })}
                  />
                  <span className="color-code">{config.accentColor}</span>
                </div>
              </div>
            </div>

            {config.backgroundType === 'gradient' && (
              <div className="slider-group" style={{ marginTop: '16px' }}>
                <div className="slider-header">
                  <span className="slider-label">Ángulo del Degradado</span>
                  <span className="slider-val">{config.gradientAngle}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={15}
                  value={config.gradientAngle}
                  onChange={(e) => onChange({ ...config, gradientAngle: Number(e.target.value) })}
                  className="custom-range"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LAYOUT & TEXTS */}
        {activeTab === 'layout' && (
          <div className="control-pane">
            <h4 className="pane-section-title">Alineación del Contenido</h4>
            <div className="alignment-toggle">
              <button
                type="button"
                className={`align-btn ${config.textAlign === 'left' ? 'active' : ''}`}
                onClick={() => onChange({ ...config, textAlign: 'left' })}
              >
                <AlignLeft size={18} />
                <span>Izquierda</span>
              </button>
              <button
                type="button"
                className={`align-btn ${config.textAlign === 'center' ? 'active' : ''}`}
                onClick={() => onChange({ ...config, textAlign: 'center' })}
              >
                <AlignCenter size={18} />
                <span>Centro</span>
              </button>
              <button
                type="button"
                className={`align-btn ${config.textAlign === 'right' ? 'active' : ''}`}
                onClick={() => onChange({ ...config, textAlign: 'right' })}
              >
                <AlignRight size={18} />
                <span>Derecha</span>
              </button>
            </div>

            <h4 className="pane-section-title" style={{ marginTop: '20px' }}>
              Estilo de Marco / Orla
            </h4>
            <div className="frames-grid">
              {(
                [
                  { id: 'none', label: 'Sin Marco' },
                  { id: 'minimal', label: 'Línea Fina' },
                  { id: 'double', label: 'Doble Editorial' },
                  { id: 'classic-box', label: 'Académico Box' },
                  { id: 'vintage', label: 'Esquinas Vintage' },
                  { id: 'modern-accent', label: 'Cinta Lateral' },
                ] as { id: CoverFrameStyle; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`frame-btn ${config.frameStyle === f.id ? 'active' : ''}`}
                  onClick={() => onChange({ ...config, frameStyle: f.id })}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <h4 className="pane-section-title" style={{ marginTop: '24px' }}>
              Textos de la Portada
            </h4>
            <div className="texts-inputs-stack">
              <div className="form-field">
                <label className="field-label">Título</label>
                <input
                  type="text"
                  className="text-input"
                  value={config.title}
                  onChange={(e) => onChange({ ...config, title: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Subtítulo</label>
                <input
                  type="text"
                  className="text-input"
                  value={config.subtitle}
                  onChange={(e) => onChange({ ...config, subtitle: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Autor(es)</label>
                <input
                  type="text"
                  className="text-input"
                  value={config.author}
                  onChange={(e) => onChange({ ...config, author: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Etiqueta Superior (Badge)</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="Ej: RESEARCH PAPER, BLOG, ENSAYO..."
                  value={config.tag}
                  onChange={(e) => onChange({ ...config, tag: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
