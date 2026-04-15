/**
 * 15 plantillas de conceptos para Meta Ads.
 * Cada concepto generado debe usar una de estas plantillas.
 */

export interface Template {
  number: number
  name: string
  description: string
  structure: string
  exampleHeadline: string
  exampleBody: string
  usesNBPro: boolean // true si necesita NB Pro para texto en imagen
}

export const TEMPLATES: Template[] = [
  {
    number: 1,
    name: 'Review Card',
    description: 'Tarjeta de review con estrellas, nombre y texto del review. Formato visual tipo testimonio.',
    structure: 'Fondo con color de marca + tarjeta blanca/contrastante con review, estrellas ★★★★★, nombre del reviewer',
    exampleHeadline: '"Me cambió la vida"',
    exampleBody: 'Review real de cliente con nombre, edad y rating visible',
    usesNBPro: true,
  },
  {
    number: 2,
    name: 'Before / After',
    description: 'Comparación visual antes y después del uso del producto.',
    structure: 'Split screen o composición lado a lado — izquierda "antes", derecha "después". Labels claros.',
    exampleHeadline: '6 semanas de diferencia',
    exampleBody: 'Resultado visible con timeframe específico',
    usesNBPro: false,
  },
  {
    number: 3,
    name: 'Problem → Solution',
    description: 'Presenta el dolor/problema y luego el producto como solución.',
    structure: 'Parte superior: problema con tono empático. Parte inferior: producto como solución con CTA.',
    exampleHeadline: '¿Cansado de probar de todo?',
    exampleBody: 'Hay una solución que sí funciona',
    usesNBPro: false,
  },
  {
    number: 4,
    name: 'Stat Callout',
    description: 'Número grande y llamativo con estadística o dato del producto.',
    structure: 'Número grande dominante (ej: "93%") + texto explicativo debajo + producto en esquina.',
    exampleHeadline: '9 de cada 10 lo recomiendan',
    exampleBody: 'Estadística basada en reviews reales de clientes',
    usesNBPro: true,
  },
  {
    number: 5,
    name: 'Product Hero',
    description: 'Producto como protagonista absoluto con copy minimalista.',
    structure: 'Producto centrado con iluminación premium, copy corto arriba o abajo, CTA sutil.',
    exampleHeadline: 'El secreto está en la fórmula',
    exampleBody: 'Producto destacado con beneficios clave en 3-4 palabras',
    usesNBPro: false,
  },
  {
    number: 6,
    name: 'Question Hook',
    description: 'Pregunta provocadora que genera curiosidad y engagement.',
    structure: 'Pregunta grande como hook visual + respuesta sutil con producto.',
    exampleHeadline: '¿Por qué nadie habla de esto?',
    exampleBody: 'Pregunta que toca un dolor específico del nicho',
    usesNBPro: false,
  },
  {
    number: 7,
    name: 'Social Proof',
    description: 'Múltiples reviews o ratings apilados como prueba social masiva.',
    structure: 'Grid o stack de 2-3 mini reviews con estrellas, nombres y fotos de perfil genéricas.',
    exampleHeadline: '+2.000 clientes satisfechos',
    exampleBody: 'Reviews apiladas con nombres reales y ratings',
    usesNBPro: true,
  },
  {
    number: 8,
    name: 'Urgency / Scarcity',
    description: 'Oferta limitada o urgencia temporal con countdown visual.',
    structure: 'Badge de urgencia + oferta destacada + CTA fuerte. Colores de alerta (rojo/naranja).',
    exampleHeadline: 'Últimas 48 horas',
    exampleBody: 'Oferta con deadline claro y CTA de acción inmediata',
    usesNBPro: false,
  },
  {
    number: 9,
    name: 'Ingredient Spotlight',
    description: 'Destaca un ingrediente o componente clave del producto.',
    structure: 'Ingrediente visual (foto o ilustración) + nombre grande + beneficio explicado.',
    exampleHeadline: 'El poder del [ingrediente]',
    exampleBody: 'Ingrediente estrella con su beneficio principal',
    usesNBPro: false,
  },
  {
    number: 10,
    name: 'FAQ Card',
    description: 'Pregunta frecuente con respuesta directa que resuelve objeción.',
    structure: 'Pregunta arriba en bold + respuesta concisa abajo + producto como respaldo.',
    exampleHeadline: '¿Funciona para mi caso?',
    exampleBody: 'Respuesta directa a objeción común del nicho',
    usesNBPro: true,
  },
  {
    number: 11,
    name: 'Lifestyle Shot',
    description: 'Persona usando el producto en contexto real de vida.',
    structure: 'Foto lifestyle aspiracional + copy emocional corto + producto secundario.',
    exampleHeadline: 'Tu mejor versión empieza hoy',
    exampleBody: 'Persona real en contexto cotidiano con el producto',
    usesNBPro: false,
  },
  {
    number: 12,
    name: 'Comparison Table',
    description: 'Comparación del producto vs alternativas genéricas o competencia.',
    structure: 'Tabla simple: "Nosotros" vs "Otros" con checks y crosses. Nuestro lado destacado.',
    exampleHeadline: 'No todos los [producto] son iguales',
    exampleBody: 'Comparación visual con ventajas claras',
    usesNBPro: false,
  },
  {
    number: 13,
    name: 'Testimonial Quote',
    description: 'Cita textual de un cliente con foto y nombre.',
    structure: 'Comillas grandes + cita textual + foto del reviewer + nombre y contexto.',
    exampleHeadline: '"No podía creer los resultados"',
    exampleBody: 'Cita directa de review real con atribución',
    usesNBPro: false,
  },
  {
    number: 14,
    name: 'Benefit Stack',
    description: '3-4 beneficios clave apilados con íconos.',
    structure: 'Lista vertical de beneficios con íconos/checks + producto al lado o abajo.',
    exampleHeadline: 'Todo lo que necesitás en uno',
    exampleBody: '3-4 beneficios con íconos visuales',
    usesNBPro: false,
  },
  {
    number: 15,
    name: 'Direct CTA',
    description: 'Llamada a la acción directa y agresiva con producto.',
    structure: 'CTA grande y dominante + producto + urgencia. Diseño bold y directo.',
    exampleHeadline: '¡Probalo ahora!',
    exampleBody: 'CTA directo con beneficio y urgencia',
    usesNBPro: false,
  },
]

/**
 * Distribuye las plantillas proporcionalmente según la cantidad de conceptos.
 * Ej: 20 conceptos → cada template aparece al menos 1 vez, las primeras 5 aparecen 2 veces.
 */
export function distributeTemplates(totalConcepts: number): number[] {
  const templateNumbers: number[] = []
  const baseCount = Math.floor(totalConcepts / TEMPLATES.length)
  const remainder = totalConcepts % TEMPLATES.length

  for (let i = 0; i < TEMPLATES.length; i++) {
    const count = baseCount + (i < remainder ? 1 : 0)
    for (let j = 0; j < count; j++) {
      templateNumbers.push(TEMPLATES[i].number)
    }
  }

  // Shuffle para que no estén agrupadas por template
  for (let i = templateNumbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[templateNumbers[i], templateNumbers[j]] = [templateNumbers[j], templateNumbers[i]]
  }

  return templateNumbers
}

/**
 * Retorna si una plantilla usa NB Pro (mejor texto en imagen).
 */
export function templateUsesNBPro(templateNumber: number): boolean {
  return TEMPLATES.find((t) => t.number === templateNumber)?.usesNBPro ?? false
}
