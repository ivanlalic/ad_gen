import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getNicheConfig } from '@/lib/constants/niches'
import { getCountryConfig } from '@/lib/constants/countries'
import { TEMPLATES, distributeTemplates } from '@/lib/constants/templates'
import { updateBatchStatus, saveConcepts } from '@/lib/actions/batches'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface ConceptOutput {
  template_number: number
  template_name: string
  headline: string
  body_copy: string
  visual_description: string
  source_grounding: string
  nb2_prompt: string
  is_pinned?: boolean
}

/**
 * Build the NB2 prompt for a concept following the architecture doc structure.
 */
function buildNB2Prompt(
  concept: ConceptOutput,
  product: any,
  batch: any,
  niche: any
): string {
  const styleInstructions: Record<string, string> = {
    'photorealistic': 'Ultra-realistic product photography, natural lighting',
    'clean-graphic': 'Flat design, bold typography, clean background',
    'lifestyle': 'Aspirational photography, natural light, authentic',
    'ugc': 'Raw UGC feel, slightly imperfect, mobile camera quality',
    'dark-premium': 'Dark luxury, dramatic lighting, premium feel',
  }

  const lightingMap: Record<string, string> = {
    'photorealistic': 'Soft natural window light, subtle shadows',
    'clean-graphic': 'Even studio lighting, no harsh shadows',
    'lifestyle': 'Golden hour natural light, warm tones',
    'ugc': 'Mixed indoor lighting, slightly warm, phone camera feel',
    'dark-premium': 'Dramatic side lighting, deep shadows, rim light on product',
  }

  const cameraMap: Record<number, string> = {
    1: 'Straight-on, medium shot, centered composition',
    2: 'Split composition, eye-level, symmetrical framing',
    3: 'Top text area, bottom product, rule of thirds',
    4: 'Centered large number, product in corner, clean background',
    5: 'Hero shot, slightly low angle, product centered',
    6: 'Text-dominant top, product subtle bottom',
    7: 'Grid layout, multiple cards, organized composition',
    8: 'Urgency badge prominent, product visible, bold colors',
    9: 'Ingredient close-up, macro feel, product alongside',
    10: 'Question text top, answer below, product as anchor',
    11: 'Lifestyle context, person with product, natural setting',
    12: 'Comparison table layout, two columns, clear visual hierarchy',
    13: 'Quote marks prominent, testimonial card feel',
    14: 'Vertical list with icons, product at side or bottom',
    15: 'Bold CTA dominant, product visible, high contrast',
  }

  return `[LIGHTING]: ${lightingMap[batch.nb2_style_preset] ?? lightingMap['photorealistic']}
[CAMERA]: ${cameraMap[concept.template_number] ?? 'Product-focused, clean composition'}
[SUBJECT]: ${concept.visual_description}
[COMPOSITION]: ${concept.template_name} template — ${concept.headline} as visual hook. Brand colors: primary ${product.hex_primary ?? '#6366f1'}, secondary ${product.hex_secondary ?? '#1a1a24'}. Clean background matching brand aesthetic.
[TEXT OVERLAY]: Headline: "${concept.headline}". Body: "${concept.body_copy.substring(0, 120)}${concept.body_copy.length > 120 ? '...' : ''}"
[STYLE]: ${styleInstructions[batch.nb2_style_preset] ?? styleInstructions['photorealistic']}
[BRAND COLORS]: primary ${product.hex_primary ?? '#6366f1'}, secondary ${product.hex_secondary ?? '#1a1a24'}
[ASPECT RATIO]: ${batch.nb2_aspect_ratios?.[0] ?? '1:1'}
[NEGATIVE]: ${batch.nb2_negative_prompt ?? 'blurry, low quality, distorted faces, wrong text, watermark, generic stock photo, plastic look'}`
}

/**
 * Build the 15 templates description for Claude.
 */
function buildTemplatesDescription(): string {
  return TEMPLATES.map(t =>
    `Template ${t.number}: "${t.name}" — ${t.description}\n  Estructura: ${t.structure}\n  Ejemplo headline: "${t.exampleHeadline}"`
  ).join('\n\n')
}

/**
 * Build dialect notes for Claude.
 */
function buildDialectNotes(countryCode: string): string {
  const notes: Record<string, string> = {
    ES: 'Español de España: usá "tú", "vosotros", vocabulario ibérico. Ej: "¡Consíguelo ya!", "genial", "tío/tía".',
    AR: 'Español de Argentina: usá "vos" y sus conjugaciones ("probalo", "conseguilo"). Tono cálido, informal. Ej: "re bueno", "bárbaro".',
    MX: 'Español de México: usá "tú", expresiones mexicanas. Ej: "¡Aprovecha!", "está padrísimo".',
    CO: 'Español de Colombia: tono cercano y cálido. Ej: "¡Bacano!", "parcero", "chévere".',
  }
  return notes[countryCode] ?? notes['ES']
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { batchId, productId, totalConcepts, pinnedConceptText } = body

  if (!batchId || !productId || !totalConcepts) {
    return NextResponse.json({ error: 'batchId, productId, totalConcepts required' }, { status: 400 })
  }

  // Fetch batch
  const { data: batch } = await supabase
    .from('batches')
    .select('*')
    .eq('id', batchId)
    .single()

  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  }

  // Fetch product + store + inputs
  const { data: product } = await supabase
    .from('products')
    .select(`
      id, name, niche, target_sex, target_age_min, target_age_max,
      hex_primary, hex_secondary, tone_adjectives, words_avoid,
      claims_allowed, claims_forbidden,
      stores (id, name, country, language),
      product_inputs (type, content_text, file_url, source, is_simulated)
    `)
    .eq('id', productId)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const store = (product as any).stores
  const inputs = (product as any).product_inputs || []
  const niche = getNicheConfig(product.niche ?? '')
  const country = getCountryConfig(store?.country ?? 'ES')

  // Update batch status
  await updateBatchStatus(batchId, 'generating_concepts')

  // Gather inputs
  const winningAds = inputs.filter((i: any) => i.type === 'winning_ad')
  const reviews = inputs.filter((i: any) => i.type === 'review')
  const comments = inputs.filter((i: any) => i.type === 'comment')

  const sexLabel =
    product.target_sex === 'male'
      ? 'hombres'
      : product.target_sex === 'female'
        ? 'mujeres'
        : 'hombres y mujeres'

  // Build tone description
  const toneAdjectives = product.tone_adjectives?.join(', ') ?? niche?.toneAdjectives.join(', ') ?? 'directo'
  const wordsAvoid = (product.words_avoid?.length ?? 0) > 0
    ? `Evitá estas palabras: ${(product.words_avoid ?? []).join(', ')}`
    : ''
  const claimsAllowed = (product.claims_allowed?.length ?? 0) > 0
    ? `Claims permitidos: ${(product.claims_allowed ?? []).join(', ')}`
    : ''
  const claimsForbidden = (product.claims_forbidden?.length ?? 0) > 0
    ? `Claims PROHIBIDOS: ${(product.claims_forbidden ?? []).join(', ')}`
    : ''

  // Build reviews text
  const reviewsText = reviews.length > 0
    ? reviews.map((r: any) => r.content_text).filter(Boolean).join('\n\n')
    : 'No hay reviews disponibles.'

  // Build winning ads description
  const winningAdsText = winningAds.length > 0
    ? `Hay ${winningAds.length} winning ads subidos como imágenes de referencia. Analizá su estructura, hook y ángulo emocional.`
    : 'No hay winning ads subidos.'

  // Build comments text
  const commentsText = comments.length > 0
    ? comments.map((c: any) => c.content_text).filter(Boolean).join('\n')
    : ''

  // Distribute templates
  const templateDistribution = distributeTemplates(totalConcepts)

  // Build pinned concept section
  const pinnedSection = pinnedConceptText
    ? `\n\nCONCEPTO ANCLADO (Concepto nº1 — FIJO):\nEl primer concepto del batch DEBE ser basado en esta descripción:\n"${pinnedConceptText}"\nEste concepto tiene is_pinned = true. Generá el resto del batch complementando a este concepto sin repetirlo.`
    : ''

  // Build templates distribution instruction
  const templateCounts = templateDistribution.reduce((acc, num) => {
    acc[num] = (acc[num] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  const distributionText = Object.entries(templateCounts)
    .map(([num, count]) => `Template ${num} (${TEMPLATES.find(t => t.number === parseInt(num))?.name}): ${count} concepto(s)`)
    .join('\n')

  const systemPrompt = `Sos un experto en direct response copywriting para Meta Ads. Tu especialidad es crear conceptos de anuncios que convierten, basados en lenguaje real de clientes.

CONTEXTO DEL PAÍS:
- País target: ${country?.label ?? 'España'} (${store?.country ?? 'ES'})
- Idioma: ${store?.language ?? 'es-ES'}
- Dialecto: ${buildDialectNotes(store?.country ?? 'ES')}
- Escribí TODO el copy en este idioma y dialecto.

PRODUCTO:
- Nombre: ${product.name}
- Nicho: ${niche?.label ?? product.niche}
- Audiencia: ${sexLabel}, ${product.target_age_min}-${product.target_age_max} años
- Tono de voz: ${toneAdjectives}
- Colores de marca: primary ${product.hex_primary ?? '#6366f1'}, secondary ${product.hex_secondary ?? '#1a1a24'}
${wordsAvoid ? '\n' + wordsAvoid : ''}
${claimsAllowed ? '\n' + claimsAllowed : ''}
${claimsForbidden ? '\n' + claimsForbidden : ''}

REGLAS CRÍTICAS:
1. Cada concepto DEBE tener source_grounding no vacío — trazá el origen de cada idea a un review, winning ad, comentario o insight del producto
2. El source_grounding debe ser específico: "basado en review de [nombre]: '[cita]'" o "basado en winning ad — hook de [descripción]"
3. Copy acorde al tono de voz configurado
4. No usar claims no aprobados
5. Distribuí las plantillas según esta distribución:
${distributionText}
6. No saltes ninguna plantilla — el objetivo es variedad de ángulos
7. Headlines cortos y punchy (máx 8 palabras)
8. Body copy: 1-3 líneas, directo al beneficio
9. Visual description: describí la imagen en detalle para que un diseñador pueda crearla
10. nb2_prompt: seguí la estructura [LIGHTING], [CAMERA], [SUBJECT], [COMPOSITION], [TEXT OVERLAY], [STYLE], [BRAND COLORS], [ASPECT RATIO], [NEGATIVE]
${pinnedSection}

OUTPUT: respondé SOLO con un JSON array válido, sin texto adicional, sin markdown:
[{"template_number":1,"template_name":"Review Card","headline":"...","body_copy":"...","visual_description":"...","source_grounding":"...","nb2_prompt":"..."}]`

  const userPrompt = `Producto: ${product.name}
Nicho: ${niche?.label ?? product.niche}
País: ${country?.label ?? store?.country}
Audiencia: ${sexLabel}, ${product.target_age_min}-${product.target_age_max} años

WINNING ADS:
${winningAdsText}

REVIEWS DE CLIENTES:
${reviewsText}
${commentsText ? '\nCOMENTARIOS DE ADS:\n' + commentsText : ''}

PLANTILLAS DISPONIBLES:
${buildTemplatesDescription()}

Generá ${totalConcepts} conceptos ahora.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const rawText = message.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { type: 'text'; text: string }) => b.text)
      .join('')

    // Extract JSON array from response
    const match = rawText.match(/\[[\s\S]*\]/)
    if (!match) {
      return NextResponse.json({ error: 'Invalid Claude response' }, { status: 500 })
    }

    const rawConcepts = JSON.parse(match[0]) as Array<{
      template_number: number
      template_name: string
      headline: string
      body_copy: string
      visual_description: string
      source_grounding: string
      nb2_prompt?: string
      is_pinned?: boolean
    }>

    // Validate source_grounding is not empty and map to camelCase for saveConcepts
    const validConcepts = rawConcepts
      .filter(c => c.source_grounding?.trim().length > 0)
      .map((c, idx) => ({
        templateNumber: c.template_number,
        templateName: c.template_name,
        headline: c.headline,
        bodyCopy: c.body_copy,
        visualDescription: c.visual_description,
        sourceGrounding: c.source_grounding,
        nb2Prompt: buildNB2Prompt(c as any, product, batch, niche),
        isPinned: pinnedConceptText && idx === 0 ? true : (c.is_pinned ?? false),
      }))

    // Save concepts to DB
    await saveConcepts(batchId, validConcepts)

    // Update batch status
    await updateBatchStatus(batchId, batch.generate_images ? 'generating_images' : 'done')

    return NextResponse.json({
      concepts: validConcepts,
      count: validConcepts.length,
    })
  } catch (err) {
    console.error('Claude concepts error:', err)
    await updateBatchStatus(batchId, 'error')
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
