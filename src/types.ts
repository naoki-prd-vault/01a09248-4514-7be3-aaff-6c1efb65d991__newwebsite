export type SourceType = 'pdf' | 'url' | 'manual'

export interface Chapter {
  id: string
  title: string
  content: string // HTML or clean text
}

export interface BookMetadata {
  title: string
  author: string
  subtitle?: string
  publisher?: string
  description?: string
  language: string
  category?: string
  sourceUrl?: string
  originalFilename?: string
}

export type CoverFontFamily =
  | 'Playfair Display'
  | 'Cinzel'
  | 'Cormorant Garamond'
  | 'Bodoni Moda'
  | 'Inter'
  | 'Montserrat'
  | 'Space Grotesk'
  | 'Newsreader'
  | 'JetBrains Mono'
  | 'Georgia'

export type CoverFrameStyle = 'none' | 'minimal' | 'double' | 'classic-box' | 'vintage' | 'modern-accent'

export type CoverBackgroundType = 'solid' | 'gradient' | 'pattern' | 'image'

export interface CoverConfig {
  title: string
  author: string
  subtitle: string
  tag: string
  fontFamily: CoverFontFamily
  titleFontSize: number // in px (for 1200x1800 canvas)
  authorFontSize: number
  textColor: string
  accentColor: string
  backgroundColor: string
  backgroundColorEnd?: string // for gradient
  gradientAngle: number // degrees
  backgroundType: CoverBackgroundType
  patternType: 'dots' | 'grid' | 'stripes' | 'circles' | 'noise'
  frameStyle: CoverFrameStyle
  textAlign: 'left' | 'center' | 'right'
  customImage?: string // dataURL
  showAppleBadge?: boolean
}

export interface PresetTheme {
  id: string
  name: string
  description: string
  cover: Partial<CoverConfig>
}
