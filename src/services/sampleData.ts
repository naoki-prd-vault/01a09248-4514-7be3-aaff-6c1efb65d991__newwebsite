import type { BookMetadata, Chapter, CoverConfig, PresetTheme } from '../types'

export const PRESET_THEMES: PresetTheme[] = [
  {
    id: 'apple-minimal',
    name: 'Apple Clean',
    description: 'Minimalista blanco con tipografía elegante y acentos sutiles',
    cover: {
      backgroundColor: '#fbfbfd',
      backgroundColorEnd: '#f2f2f7',
      backgroundType: 'solid',
      textColor: '#1d1d1f',
      accentColor: '#0071e3',
      fontFamily: 'Inter',
      frameStyle: 'minimal',
      textAlign: 'left',
      tag: 'APPLE BOOKS EDITION',
    },
  },
  {
    id: 'editorial-classics',
    name: 'Penguin Classics',
    description: 'Estilo editorial clásico en negro y marfil con marco doble',
    cover: {
      backgroundColor: '#1a1918',
      backgroundColorEnd: '#2c2a29',
      backgroundType: 'solid',
      textColor: '#f5f0eb',
      accentColor: '#d4af37',
      fontFamily: 'Playfair Display',
      frameStyle: 'double',
      textAlign: 'center',
      tag: 'ENSAYO & LITERATURA',
    },
  },
  {
    id: 'academic-monograph',
    name: 'Oxford Academic',
    description: 'Estilo académico prestigioso con azul marino y oro',
    cover: {
      backgroundColor: '#0a192f',
      backgroundColorEnd: '#172a45',
      backgroundType: 'gradient',
      gradientAngle: 135,
      textColor: '#e6f1ff',
      accentColor: '#64ffda',
      fontFamily: 'Cinzel',
      frameStyle: 'classic-box',
      textAlign: 'center',
      tag: 'RESEARCH PAPER',
    },
  },
  {
    id: 'warm-parchment',
    name: 'Pergamino Bohemio',
    description: 'Tonalidad cálida sepia, ideal para lecturas largas y confortables',
    cover: {
      backgroundColor: '#f6f1e8',
      backgroundColorEnd: '#ede3d1',
      backgroundType: 'gradient',
      gradientAngle: 180,
      textColor: '#3d3024',
      accentColor: '#965a38',
      fontFamily: 'Cormorant Garamond',
      frameStyle: 'vintage',
      textAlign: 'center',
      tag: 'LECTURA DIGITAL',
    },
  },
  {
    id: 'modern-gradient',
    name: 'Aura Sunset',
    description: 'Gradiente moderno y vibrante para posts tecnológicos y blogs',
    cover: {
      backgroundColor: '#4158D0',
      backgroundColorEnd: '#C850C0',
      backgroundType: 'gradient',
      gradientAngle: 45,
      textColor: '#ffffff',
      accentColor: '#FFCC70',
      fontFamily: 'Space Grotesk',
      frameStyle: 'modern-accent',
      textAlign: 'left',
      tag: 'TECH ESSAY',
    },
  },
  {
    id: 'cyber-dark',
    name: 'Midnight Cyber',
    description: 'Negro mate con tipografía mono y detalles en verde esmeralda',
    cover: {
      backgroundColor: '#0d1117',
      backgroundColorEnd: '#161b22',
      backgroundType: 'gradient',
      gradientAngle: 120,
      textColor: '#f0f6fc',
      accentColor: '#39d353',
      fontFamily: 'JetBrains Mono',
      frameStyle: 'minimal',
      textAlign: 'left',
      tag: 'PAPERS & CODE',
    },
  },
]

// Vector diagrams encoded as Data URLs
const TRANSFORMER_ARCHITECTURE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 480" width="100%" height="auto">
  <defs>
    <linearGradient id="bgG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1329"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="encG" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="decG" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <linearGradient id="ffnG" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="760" height="480" rx="16" fill="url(#bgG)"/>
  <text x="380" y="44" font-family="-apple-system, sans-serif" font-size="20" font-weight="700" fill="#f8fafc" text-anchor="middle">Figura 1: Arquitectura Transformer (Encoder &amp; Decoder)</text>
  
  <!-- Encoder Box -->
  <rect x="70" y="80" width="280" height="340" rx="12" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="6,4"/>
  <text x="210" y="112" font-family="-apple-system, sans-serif" font-size="15" font-weight="700" fill="#60a5fa" text-anchor="middle">Bloque Encoder (N×)</text>
  
  <rect x="95" y="140" width="230" height="50" rx="8" fill="url(#ffnG)"/>
  <text x="210" y="171" font-family="-apple-system, sans-serif" font-size="14" font-weight="600" fill="#ffffff" text-anchor="middle">Feed Forward Network</text>
  
  <rect x="95" y="215" width="230" height="50" rx="8" fill="url(#encG)"/>
  <text x="210" y="246" font-family="-apple-system, sans-serif" font-size="14" font-weight="600" fill="#ffffff" text-anchor="middle">Multi-Head Self-Attention</text>
  
  <rect x="95" y="295" width="230" height="46" rx="8" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
  <text x="210" y="324" font-family="-apple-system, sans-serif" font-size="13" font-weight="500" fill="#94a3b8" text-anchor="middle">Positional Encoding + Inputs</text>
  
  <!-- Decoder Box -->
  <rect x="410" y="80" width="280" height="340" rx="12" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="6,4"/>
  <text x="550" y="112" font-family="-apple-system, sans-serif" font-size="15" font-weight="700" fill="#34d399" text-anchor="middle">Bloque Decoder (N×)</text>
  
  <rect x="435" y="140" width="230" height="46" rx="8" fill="url(#ffnG)"/>
  <text x="550" y="168" font-family="-apple-system, sans-serif" font-size="14" font-weight="600" fill="#ffffff" text-anchor="middle">Feed Forward Network</text>
  
  <rect x="435" y="205" width="230" height="46" rx="8" fill="url(#decG)"/>
  <text x="550" y="233" font-family="-apple-system, sans-serif" font-size="14" font-weight="600" fill="#ffffff" text-anchor="middle">Cross-Attention (Enc-Dec)</text>
  
  <rect x="435" y="270" width="230" height="46" rx="8" fill="url(#decG)"/>
  <text x="550" y="298" font-family="-apple-system, sans-serif" font-size="14" font-weight="600" fill="#ffffff" text-anchor="middle">Masked Self-Attention</text>
  
  <rect x="435" y="335" width="230" height="42" rx="8" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
  <text x="550" y="361" font-family="-apple-system, sans-serif" font-size="13" font-weight="500" fill="#94a3b8" text-anchor="middle">Output Embeddings (Shifted)</text>
  
  <!-- Connecting Cross Arrow -->
  <path d="M 325 240 L 435 228" stroke="#f59e0b" stroke-width="2.5" fill="none" marker-end="url(#arrow)"/>
  <text x="380" y="222" font-family="-apple-system, sans-serif" font-size="11" font-weight="700" fill="#fbbf24" text-anchor="middle">K, V</text>
  <text x="380" y="450" font-family="-apple-system, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">EpubCraft Architecture Visualization · Optimized for Apple Books</text>
</svg>
`)}`

const CREATIVE_FRONTIER_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" width="100%" height="auto">
  <defs>
    <linearGradient id="bgWarm" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb"/>
      <stop offset="100%" stop-color="#fef3c7"/>
    </linearGradient>
    <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
  </defs>
  <rect width="720" height="380" rx="16" fill="url(#bgWarm)" stroke="#fde68a" stroke-width="2"/>
  <text x="360" y="44" font-family="-apple-system, Georgia, serif" font-size="20" font-weight="700" fill="#78350f" text-anchor="middle">Mapa de la Frontera Creativa</text>
  
  <!-- Circles diagram -->
  <circle cx="200" cy="200" r="110" fill="#fed7aa" fill-opacity="0.45" stroke="#f97316" stroke-width="2"/>
  <text x="200" y="170" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="#9a3412" text-anchor="middle">Aptitud Natural</text>
  <text x="200" y="195" font-family="-apple-system, sans-serif" font-size="12" fill="#c2410c" text-anchor="middle">Tus fortalezas únicas</text>
  
  <circle cx="360" cy="200" r="110" fill="#bbf7d0" fill-opacity="0.45" stroke="#16a34a" stroke-width="2"/>
  <text x="360" y="170" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="#14532d" text-anchor="middle">Curiosidad Obsesiva</text>
  <text x="360" y="195" font-family="-apple-system, sans-serif" font-size="12" fill="#166534" text-anchor="middle">Energía intrínseca</text>
  
  <circle cx="520" cy="200" r="110" fill="#bfdbfe" fill-opacity="0.45" stroke="#2563eb" stroke-width="2"/>
  <text x="520" y="170" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="#1e3a8a" text-anchor="middle">Frontera Abierta</text>
  <text x="520" y="195" font-family="-apple-system, sans-serif" font-size="12" fill="#1e40af" text-anchor="middle">Preguntas sin resolver</text>
  
  <!-- Central Intersection label -->
  <rect x="290" y="270" width="140" height="34" rx="17" fill="#b45309"/>
  <text x="360" y="292" font-family="-apple-system, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">GRAN TRABAJO</text>
  <text x="360" y="348" font-family="-apple-system, sans-serif" font-size="12" font-style="italic" fill="#92400e" text-anchor="middle">"La intersección donde el esfuerzo diario se convierte en maestría duradera."</text>
</svg>
`)}`
export const SAMPLE_PAPER = {
  metadata: {
    title: 'Attention Is All You Need',
    subtitle: 'La arquitectura Transformer que transformó la inteligencia artificial moderna',
    author: 'Ashish Vaswani, Noam Shazeer et al.',
    publisher: 'Google Brain / arXiv:1706.03762',
    language: 'es',
    category: 'Inteligencia Artificial',
    sourceUrl: 'https://arxiv.org/abs/1706.03762',
  } as BookMetadata,
  cover: {
    title: 'Attention Is All You Need',
    subtitle: 'La revolución de los Transformers en Machine Learning',
    author: 'Ashish Vaswani, Noam Shazeer et al.',
    tag: 'RESEARCH PAPER · ARXIV',
    fontFamily: 'Cinzel' as const,
    titleFontSize: 68,
    authorFontSize: 34,
    textColor: '#ffffff',
    accentColor: '#60a5fa',
    backgroundColor: '#09152b',
    backgroundColorEnd: '#1e3a8a',
    gradientAngle: 145,
    backgroundType: 'gradient' as const,
    patternType: 'grid' as const,
    frameStyle: 'classic-box' as const,
    textAlign: 'center' as const,
    showAppleBadge: true,
  } as CoverConfig,
  chapters: [
    {
      id: 'chap-1',
      title: 'Resumen (Abstract)',
      content: `
        <p>Los modelos de transducción de secuencias dominantes se basaban tradicionalmente en redes neuronales recurrentes complejas o convolucionales que incluyen un codificador y un decodificador. Los mejores modelos también conectan el codificador y el decodificador a través de un mecanismo de atención.</p>
        <p>En este trabajo proponemos una nueva arquitectura de red simple, el <strong>Transformer</strong>, basada exclusivamente en mecanismos de atención, prescindiendo por completo de la recurrencia y las convoluciones.</p>
        <p>Los experimentos en dos tareas de traducción automática demuestran que estos modelos son superiores en calidad, siendo al mismo tiempo más paralelizables y requiriendo significativamente menos tiempo de entrenamiento.</p>
      `,
    },
    {
      id: 'chap-2',
      title: '1. Introducción y Fundamentos',
      content: `
        <p>Las redes neuronales recurrentes, particularmente las redes LSTM y GRU, han sido firmemente establecidas como enfoques de vanguardia en modelos de secuencia y problemas de transducción como modelado de lenguaje y traducción automática.</p>
        <p>Los modelos recurrentes típicamente calculan sobre las posiciones del tiempo de los símbolos de entrada y salida. Alineando las posiciones a los pasos del tiempo de cálculo, generan una secuencia de estados ocultos <em>h_t</em>, como una función del estado oculto previo <em>h_{t-1}</em> y la entrada para la posición <em>t</em>.</p>
        <blockquote>
          "Esta naturaleza intrínsecamente secuencial impide la paralelización dentro de los ejemplos de entrenamiento, lo cual se vuelve crítico en longitudes de secuencia más largas."
        </blockquote>
        <p>El mecanismo de atención se ha convertido en una parte integral de modelos de secuencia convincentes en varias tareas, permitiendo el modelado de dependencias sin importar su distancia en las secuencias de entrada o salida.</p>
      `,
    },
    {
      id: 'chap-3',
      title: '2. Arquitectura del Modelo',
      content: `
        <p>La mayoría de los modelos neuronales de transducción de secuencias competitivos tienen una estructura de codificador-decodificador. Aquí, el codificador mapea una secuencia de entrada de representaciones de símbolos a una secuencia de representaciones continuas.</p>
        <p>Dada la secuencia codificada, el decodificador luego genera una secuencia de salida de símbolos elemento por elemento. En cada paso, el modelo es auto-regresivo, consumiendo los símbolos generados previamente como entrada adicional al generar el siguiente.</p>
        <figure class="epub-figure">
          <img src="${TRANSFORMER_ARCHITECTURE_SVG}" alt="Diagrama de la Arquitectura Transformer" />
          <figcaption>Figura 1: Arquitectura Transformer completa mostrando el flujo entre Encoder y Decoder con atención multi-cabeza.</figcaption>
        </figure>
        <h3>Scaled Dot-Product Attention</h3>
        <p>Llamamos a nuestra atención particular <strong>Scaled Dot-Product Attention</strong>. La entrada consiste en consultas (queries) y claves (keys) de dimensión d_k, y valores (values) de dimensión d_v. Calculamos los productos punto de la consulta con todas las claves, dividimos cada uno por la raíz cuadrada de d_k, y aplicamos una función softmax para obtener los pesos de los valores.</p>
        <p>En la práctica, calculamos la función de atención en un conjunto de consultas simultáneamente, empaquetadas juntas en una matriz Q. Las claves y valores también se empaquetan en matrices K y V.</p>
      `,
    },
    {
      id: 'chap-4',
      title: '3. Conclusión y Futuro',
      content: `
        <p>En este trabajo presentamos el <strong>Transformer</strong>, el primer modelo de transducción de secuencias basado enteramente en atención, reemplazando las capas recurrentes más comúnmente utilizadas en arquitecturas codificador-decodificador por atención multi-cabeza (Multi-Head Attention).</p>
        <p>Para tareas de traducción, el Transformer puede ser entrenado significativamente más rápido que arquitecturas basadas en capas recurrentes o convolucionales. Planeamos extender el Transformer a problemas que involucran modalidades de entrada y salida distintas del texto, como imágenes, audio y video.</p>
      `,
    },
  ] as Chapter[],
}

export const SAMPLE_BLOG = {
  metadata: {
    title: 'Cómo hacer un gran trabajo',
    subtitle: 'Ensayos sobre creatividad, foco y maestría personal',
    author: 'Paul Graham',
    publisher: 'paulgraham.com / Traducción libre',
    language: 'es',
    category: 'Ensayos y Filosofía',
    sourceUrl: 'https://paulgraham.com/greatwork.html',
  } as BookMetadata,
  cover: {
    title: 'Cómo hacer un gran trabajo',
    subtitle: 'Ensayos sobre creatividad, foco y maestría personal',
    author: 'Paul Graham',
    tag: 'ENSAYO · BLOG PERSONAL',
    fontFamily: 'Newsreader' as const,
    titleFontSize: 70,
    authorFontSize: 32,
    textColor: '#292524',
    accentColor: '#b45309',
    backgroundColor: '#fefce8',
    backgroundColorEnd: '#fef3c7',
    gradientAngle: 180,
    backgroundType: 'solid' as const,
    patternType: 'noise' as const,
    frameStyle: 'minimal' as const,
    textAlign: 'center' as const,
    showAppleBadge: true,
  } as CoverConfig,
  chapters: [
    {
      id: 'blog-1',
      title: 'El primer paso: qué elegir',
      content: `
        <p>Si quieres hacer un trabajo extraordinario, tienes que trabajar en algo que te apasione profundamente. El primer paso es decidir en qué trabajar. El trabajo que elijas debería poseer tres cualidades: tienes que tener una aptitud natural para ello, un interés desmedido por el tema, y debe ofrecer margen para hacer un gran trabajo.</p>
        <p>En la práctica no tienes que preocuparte mucho por la tercera cualidad. Si eres suficientemente ambicioso y curioso acerca de algo, harás un gran trabajo con ello sin importar qué tan convencional o inusual parezca a los demás.</p>
        <blockquote>
          "La forma de descubrir en qué trabajar es trabajar en muchas cosas pequeñas primero. La ambición inicial no debe paralizar la experimentación constante."
        </blockquote>
      `,
    },
    {
      id: 'blog-2',
      title: 'Aprender lo suficiente hasta el límite',
      content: `
        <p>Una vez que encuentras algo que te interesa, el siguiente paso es aprender lo suficiente sobre el campo hasta alcanzar su frontera actual. El conocimiento se expande como un fractal; desde lejos parece suave, pero cuando te acercas a cualquier borde, está lleno de preguntas abiertas y vacíos que nadie ha resuelto todavía.</p>
        <figure class="epub-figure">
          <img src="${CREATIVE_FRONTIER_SVG}" alt="Diagrama de los tres círculos del gran trabajo" />
          <figcaption>Ilustración: La convergencia entre aptitud natural, curiosidad obsesiva y frontera abierta de conocimiento.</figcaption>
        </figure>
        <p>Llegar a la frontera requiere esfuerzo y constancia, pero notarás que el esfuerzo no pesa cuando la curiosidad genuina es tu motor principal. En ese punto, empiezas a notar las cosas que la gente suele pasar por alto.</p>
      `,
    },
    {
      id: 'blog-3',
      title: 'La consistencia y la creación',
      content: `
        <p>Hacer un gran trabajo no es un rayo que cae de la nada; es el resultado compuesto de muchos días ordinarios en los que empujas un poco más allá de lo obvio. Protege tu tiempo y tu atención como los recursos más valiosos que posees.</p>
        <p>Escribe, diseña, programa o experimenta cada día, incluso cuando no estés inspirado. La inspiración es una recompensa al movimiento, no un requisito previo para empezar.</p>
      `,
    },
  ] as Chapter[],
}
