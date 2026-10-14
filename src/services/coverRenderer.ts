import type { CoverConfig } from '../types'

export async function renderCoverToCanvas(
  canvas: HTMLCanvasElement,
  config: CoverConfig
): Promise<void> {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = 1200
  const H = 1800

  canvas.width = W
  canvas.height = H

  // 1. Render Background
  if (config.backgroundType === 'image' && config.customImage) {
    await renderBackgroundImage(ctx, config.customImage, W, H)
  } else if (config.backgroundType === 'gradient') {
    renderGradient(ctx, config, W, H)
  } else {
    // Solid background
    ctx.fillStyle = config.backgroundColor || '#ffffff'
    ctx.fillRect(0, 0, W, H)
  }

  // Optional background pattern overlay
  if (config.backgroundType === 'pattern') {
    ctx.fillStyle = config.backgroundColor || '#ffffff'
    ctx.fillRect(0, 0, W, H)
    renderPatternOverlay(ctx, config.patternType, config.accentColor, W, H)
  }

  // 2. Render Frame
  renderFrame(ctx, config, W, H)

  // 3. Render Tag / Category Badge
  renderBadge(ctx, config, W)

  // 4. Render Title
  const titleY = renderTitle(ctx, config, W, H)

  // 5. Render Subtitle
  const subtitleY = renderSubtitle(ctx, config, W, H, titleY)

  // 6. Render Divider / Accent
  renderDivider(ctx, config, W, H, subtitleY)

  // 7. Render Author
  renderAuthor(ctx, config, W, H)

  // 8. Render Apple Books aesthetic footer
  renderFooter(ctx, config, W, H)
}

function renderGradient(
  ctx: CanvasRenderingContext2D,
  config: CoverConfig,
  W: number,
  H: number
) {
  const angleRad = ((config.gradientAngle || 135) * Math.PI) / 180
  const x1 = W / 2 - (Math.cos(angleRad) * W) / 2
  const y1 = H / 2 - (Math.sin(angleRad) * H) / 2
  const x2 = W / 2 + (Math.cos(angleRad) * W) / 2
  const y2 = H / 2 + (Math.sin(angleRad) * H) / 2

  const grad = ctx.createLinearGradient(x1, y1, x2, y2)
  grad.addColorStop(0, config.backgroundColor || '#1e3a8a')
  grad.addColorStop(1, config.backgroundColorEnd || '#3b82f6')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)
}

function renderBackgroundImage(
  ctx: CanvasRenderingContext2D,
  dataUrl: string,
  W: number,
  H: number
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = Math.max(W / img.width, H / img.height)
      const x = (W - img.width * scale) / 2
      const y = (H - img.height * scale) / 2
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale)

      const overlay = ctx.createLinearGradient(0, 0, 0, H)
      overlay.addColorStop(0, 'rgba(0,0,0,0.45)')
      overlay.addColorStop(0.5, 'rgba(0,0,0,0.3)')
      overlay.addColorStop(1, 'rgba(0,0,0,0.75)')
      ctx.fillStyle = overlay
      ctx.fillRect(0, 0, W, H)
      resolve()
    }
    img.onerror = () => {
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, 0, W, H)
      resolve()
    }
    img.src = dataUrl
  })
}

function renderPatternOverlay(
  ctx: CanvasRenderingContext2D,
  pattern: string,
  accentColor: string,
  W: number,
  H: number
) {
  ctx.save()
  ctx.strokeStyle = accentColor || '#64748b'
  ctx.fillStyle = accentColor || '#64748b'
  ctx.globalAlpha = 0.08

  if (pattern === 'dots') {
    const spacing = 40
    for (let x = spacing; x < W; x += spacing) {
      for (let y = spacing; y < H; y += spacing) {
        ctx.beginPath()
        ctx.arc(x, y, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (pattern === 'grid') {
    ctx.lineWidth = 1
    const spacing = 50
    for (let x = spacing; x < W; x += spacing) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    for (let y = spacing; y < H; y += spacing) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }
  } else if (pattern === 'circles') {
    ctx.lineWidth = 2
    for (let r = 80; r < W * 1.2; r += 90) {
      ctx.beginPath()
      ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  config: CoverConfig,
  W: number,
  H: number
) {
  const margin = 70
  ctx.save()

  if (config.frameStyle === 'minimal') {
    ctx.strokeStyle = config.accentColor || '#0071e3'
    ctx.lineWidth = 2.5
    ctx.globalAlpha = 0.5
    ctx.strokeRect(margin, margin, W - margin * 2, H - margin * 2)
  } else if (config.frameStyle === 'double') {
    ctx.strokeStyle = config.accentColor || '#d4af37'
    ctx.lineWidth = 4
    ctx.globalAlpha = 0.8
    ctx.strokeRect(margin, margin, W - margin * 2, H - margin * 2)

    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.4
    ctx.strokeRect(margin + 18, margin + 18, W - (margin + 18) * 2, H - (margin + 18) * 2)
  } else if (config.frameStyle === 'classic-box') {
    ctx.strokeStyle = config.accentColor || '#60a5fa'
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.7
    ctx.strokeRect(margin, margin, W - margin * 2, H - margin * 2)

    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(margin + 40, margin + 35)
    ctx.lineTo(W - margin - 40, margin + 35)
    ctx.moveTo(margin + 40, H - margin - 35)
    ctx.lineTo(W - margin - 40, H - margin - 35)
    ctx.stroke()
  } else if (config.frameStyle === 'vintage') {
    ctx.strokeStyle = config.accentColor || '#965a38'
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.75
    const cornerSize = 60

    const corners = [
      [margin, margin, 1, 1],
      [W - margin, margin, -1, 1],
      [margin, H - margin, 1, -1],
      [W - margin, H - margin, -1, -1],
    ]
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath()
      ctx.moveTo(cx, cy + dy * cornerSize)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx + dx * cornerSize, cy)
      ctx.stroke()
    }
  } else if (config.frameStyle === 'modern-accent') {
    ctx.fillStyle = config.accentColor || '#6366f1'
    ctx.globalAlpha = 0.9
    ctx.fillRect(0, 0, 24, H)
  }

  ctx.restore()
}

function renderBadge(
  ctx: CanvasRenderingContext2D,
  config: CoverConfig,
  W: number
) {
  if (!config.tag) return

  ctx.save()
  ctx.font = `600 24px ${config.fontFamily}, sans-serif`
  ctx.fillStyle = config.accentColor || '#0071e3'
  ctx.letterSpacing = '5px'

  const text = config.tag.toUpperCase()
  const y = 190

  let x = W / 2
  ctx.textAlign = 'center'
  if (config.textAlign === 'left') {
    x = 130
    ctx.textAlign = 'left'
  } else if (config.textAlign === 'right') {
    x = W - 130
    ctx.textAlign = 'right'
  }

  const metrics = ctx.measureText(text)
  const padX = 22
  const h = 42
  const w = metrics.width + padX * 2

  let pillX = x - w / 2
  if (config.textAlign === 'left') pillX = x - padX
  if (config.textAlign === 'right') pillX = x - metrics.width - padX

  ctx.fillStyle = config.accentColor || '#0071e3'
  ctx.globalAlpha = 0.15
  ctx.beginPath()
  ctx.roundRect(pillX, y - 28, w, h, 21)
  ctx.fill()

  ctx.globalAlpha = 1
  ctx.fillStyle = config.accentColor || '#0071e3'
  ctx.fillText(text, x, y)
  ctx.restore()
}

function renderTitle(
  ctx: CanvasRenderingContext2D,
  config: CoverConfig,
  W: number,
  _H: number
): number {
  void _H
  ctx.save()
  const fontSize = config.titleFontSize || 64
  ctx.font = `bold ${fontSize}px "${config.fontFamily}", serif, sans-serif`
  ctx.fillStyle = config.textColor || '#ffffff'

  let x = W / 2
  ctx.textAlign = 'center'
  if (config.textAlign === 'left') {
    x = 130
    ctx.textAlign = 'left'
  } else if (config.textAlign === 'right') {
    x = W - 130
    ctx.textAlign = 'right'
  }

  const maxWidth = W - 260
  const lines = wrapText(ctx, config.title || 'Título del Libro', maxWidth)

  let startY = 560
  if (config.textAlign === 'center') {
    startY = 520 - ((lines.length - 1) * (fontSize * 1.25)) / 2
  }

  const lineHeight = fontSize * 1.25

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight)
  }

  ctx.restore()
  return startY + (lines.length - 1) * lineHeight
}

function renderSubtitle(
  ctx: CanvasRenderingContext2D,
  config: CoverConfig,
  W: number,
  _H: number,
  titleEndY: number
): number {
  if (!config.subtitle) return titleEndY

  ctx.save()
  const fontSize = Math.max(26, Math.floor((config.titleFontSize || 64) * 0.42))
  ctx.font = `normal italic ${fontSize}px "${config.fontFamily}", serif, sans-serif`
  ctx.fillStyle = config.textColor || '#ffffff'
  ctx.globalAlpha = 0.78

  let x = W / 2
  ctx.textAlign = 'center'
  if (config.textAlign === 'left') {
    x = 130
    ctx.textAlign = 'left'
  } else if (config.textAlign === 'right') {
    x = W - 130
    ctx.textAlign = 'right'
  }

  const maxWidth = W - 280
  const lines = wrapText(ctx, config.subtitle, maxWidth)
  const lineHeight = fontSize * 1.35
  const startY = titleEndY + 55

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight)
  }

  ctx.restore()
  return startY + (lines.length - 1) * lineHeight
}

function renderDivider(
  ctx: CanvasRenderingContext2D,
  config: CoverConfig,
  W: number,
  _H: number,
  subtitleEndY: number
) {
  ctx.save()
  ctx.strokeStyle = config.accentColor || '#60a5fa'
  ctx.lineWidth = 3
  ctx.globalAlpha = 0.65

  const y = subtitleEndY + 50
  const len = 120

  let startX = (W - len) / 2
  if (config.textAlign === 'left') startX = 130
  if (config.textAlign === 'right') startX = W - 130 - len

  ctx.beginPath()
  ctx.moveTo(startX, y)
  ctx.lineTo(startX + len, y)
  ctx.stroke()
  ctx.restore()
}

function renderAuthor(
  ctx: CanvasRenderingContext2D,
  config: CoverConfig,
  W: number,
  _H: number
) {
  void _H
  ctx.save()
  const fontSize = config.authorFontSize || 34
  ctx.font = `600 ${fontSize}px "${config.fontFamily}", sans-serif`
  ctx.fillStyle = config.textColor || '#ffffff'

  let x = W / 2
  ctx.textAlign = 'center'
  if (config.textAlign === 'left') {
    x = 130
    ctx.textAlign = 'left'
  } else if (config.textAlign === 'right') {
    x = W - 130
    ctx.textAlign = 'right'
  }

  const y = 1460

  ctx.save()
  ctx.font = `500 20px -apple-system, sans-serif`
  ctx.fillStyle = config.accentColor || '#60a5fa'
  ctx.letterSpacing = '3px'
  ctx.fillText('POR', x, y - 36)
  ctx.restore()

  ctx.fillText(config.author || 'Autor', x, y)
  ctx.restore()
}

function renderFooter(
  ctx: CanvasRenderingContext2D,
  config: CoverConfig,
  W: number,
  H: number
) {
  ctx.save()
  ctx.font = '500 20px -apple-system, sans-serif'
  ctx.fillStyle = config.textColor || '#ffffff'
  ctx.globalAlpha = 0.5
  ctx.letterSpacing = '2px'
  ctx.textAlign = 'center'

  const y = H - 120
  const label = config.showAppleBadge !== false ? ' LIBROS · DIGITAL EDITION' : 'DIGITAL EDITION'
  ctx.fillText(label, W / 2, y)
  ctx.restore()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = words[0] || ''

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const width = ctx.measureText(currentLine + ' ' + word).width
    if (width < maxWidth) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

export function exportCanvasAsBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas export failed'))
      },
      'image/png',
      0.95
    )
  })
}
