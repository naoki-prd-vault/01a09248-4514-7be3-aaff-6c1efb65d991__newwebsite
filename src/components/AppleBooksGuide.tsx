import React from 'react'
import { Apple, Smartphone, Laptop, Cloud, Check, BookOpen, Share2 } from 'lucide-react'

export const AppleBooksGuide: React.FC = () => {
  return (
    <div className="guide-card">
      <div className="guide-header">
        <div className="guide-icon-apple">
          <Apple size={28} />
        </div>
        <div>
          <h3 className="guide-title">Cómo instalar y leer en Apple Books (Libros)</h3>
          <p className="guide-desc">
            Los archivos generados son 100% compatibles con el estándar de Apple Books para iPhone, iPad y Mac con portada en alta resolución.
          </p>
        </div>
      </div>

      <div className="guide-grid">
        {/* iOS / iPadOS Card */}
        <div className="guide-step-card">
          <div className="step-badge">
            <Smartphone size={18} />
            <span>En iPhone & iPad</span>
          </div>
          <ol className="step-list">
            <li>
              <strong>Descarga el EPUB</strong> pulsando el botón azul de descarga o usa el botón <em>Compartir</em> en Safari.
            </li>
            <li>
              Abre la app <strong>Archivos (Files)</strong> en tu iPhone o toca la notificación de descarga de Safari.
            </li>
            <li>
              Toca el archivo <strong>.epub</strong>: iOS lo abrirá instantáneamente en la app <strong>Libros</strong> con tu portada personalizada.
            </li>
          </ol>
          <div className="guide-tip-pill">
            <Share2 size={13} /> Consejo: En Safari móvil puedes seleccionar "Abrir en Libros" directamente desde la barra de compartir.
          </div>
        </div>

        {/* macOS Card */}
        <div className="guide-step-card">
          <div className="step-badge">
            <Laptop size={18} />
            <span>En Mac (macOS)</span>
          </div>
          <ol className="step-list">
            <li>
              Descarga el archivo <strong>.epub</strong> en tu Mac.
            </li>
            <li>
              Haz <strong>doble clic</strong> en el archivo desde la carpeta Descargas o el Finder.
            </li>
            <li>
              La app <strong>Libros de Apple</strong> se abrirá automáticamente e importará el documento a tu biblioteca con todos sus capítulos e índice.
            </li>
          </ol>
          <div className="guide-tip-pill">
            <Check size={13} /> No requiere ninguna aplicación adicional ni software de terceros.
          </div>
        </div>

        {/* iCloud Sync Card */}
        <div className="guide-step-card">
          <div className="step-badge">
            <Cloud size={18} />
            <span>Sincronización iCloud</span>
          </div>
          <ol className="step-list">
            <li>
              Asegúrate de tener activada la opción <strong>iCloud Drive &gt; Libros</strong> en los ajustes de tu Apple ID.
            </li>
            <li>
              Cualquier libro o paper que añadas en tu Mac o iPhone se sincronizará automáticamente con todos tus dispositivos Apple.
            </li>
            <li>
              Tus notas, subrayados y página de lectura actual se sincronizarán en tiempo real.
            </li>
          </ol>
          <div className="guide-tip-pill">
            <BookOpen size={13} /> Tu portada personalizada aparecerá en la estantería de todos tus dispositivos.
          </div>
        </div>
      </div>
    </div>
  )
}
