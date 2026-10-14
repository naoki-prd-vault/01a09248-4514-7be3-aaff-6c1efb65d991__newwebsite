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
