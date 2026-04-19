import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { getNicheConfig } from '@/lib/constants/niches'
import { getCountryConfig } from '@/lib/constants/countries'

const geminiAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { productId, numAngles, keyOffers } = body
  const model: string = body.model ?? 'claude-haiku-4-5-20251001'

  if (!productId || !numAngles) {
    return NextResponse.json({ error: 'productId and numAngles required' }, { status: 400 })
  }

  const { data: product } = await supabase
    .from('products')
    .select(`
      id, name, niche, target_sex, target_age_min, target_age_max,
      description, key_features, unique_value_prop,
      target_audience_description, common_objections, use_cases,
      stores (country)
    `)
    .eq('id', productId)
    .single()

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const store = (product as any).stores
  const niche = getNicheConfig(product.niche ?? '')
  const country = getCountryConfig(store?.country ?? 'ES')

  const sexLabel =
    product.target_sex === 'male' ? 'hombres'
    : product.target_sex === 'female' ? 'mujeres'
    : 'hombres y mujeres'

  const dialectNotes: Record<string, string> = {
    ES: 'Español de España (tú/vosotros)',
    AR: 'Español de Argentina (vos)',
    MX: 'Español de México (tú)',
    CO: 'Español de Colombia',
    PT: 'Português europeu',
  }

  const keyOffersSection = keyOffers?.trim()
    ? `\nOFERTAS CLAVE DEL BATCH: ${keyOffers.trim()}`
    : ''

  const systemPrompt = `Sos un estratega de direct response para Meta Ads. Tu trabajo es generar ángulos creativos únicos para campañas publicitarias.

Un ángulo es una dirección de messaging específica: quién está siendo apuntado, qué emoción o insight se activa, y qué promesa o historia se cuenta.

IDIOMA: ${country?.language ?? 'Español'} — ${dialectNotes[store?.country ?? 'ES'] ?? dialectNotes['ES']}

OUTPUT: responde SOLO con un JSON array válido, sin texto adicional, sin markdown.
Formato exacto:
[{"id":1,"title":"Título corto (3-5 palabras)","description":"Descripción del ángulo (2-3 oraciones: a quién apunta, qué emoción/insight activa, qué promesa o historia cuenta)"}]`

  const userPrompt = `Producto: ${product.name}
Nicho: ${niche?.label ?? product.niche}
País: ${country?.label ?? store?.country}
Audiencia: ${sexLabel}, ${product.target_age_min}-${product.target_age_max} años
${(product as any).description ? `Descripción: ${(product as any).description}` : ''}
${(product as any).unique_value_prop ? `Propuesta de valor: ${(product as any).unique_value_prop}` : ''}
${(product as any).target_audience_description ? `Cliente ideal: ${(product as any).target_audience_description}` : ''}
${(product as any).common_objections ? `Objeciones comunes: ${(product as any).common_objections}` : ''}
${(product as any).use_cases ? `Casos de uso: ${(product as any).use_cases}` : ''}${keyOffersSection}

Generá ${numAngles} ángulos creativos únicos y diferenciados entre sí. Cada ángulo debe apelar a un insight o segmento diferente de la audiencia. Asegurate de cubrir variedad: testimonial, problema-solución, aspiracional, autoridad, urgencia, comparación, etc.`

  try {
    let rawText = ''

    if (model.startsWith('claude-')) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const message = await anthropic.messages.create({
        model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })
      rawText = message.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('')
    } else {
      const response = await geminiAi.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: { systemInstruction: systemPrompt, temperature: 0.8 },
      })
      rawText = response.text ?? ''
    }

    const match = rawText.match(/\[[\s\S]*\]/)
    if (!match) return NextResponse.json({ error: 'Invalid model response' }, { status: 500 })

    const angles = JSON.parse(match[0]) as Array<{ id: number; title: string; description: string }>

    return NextResponse.json({ angles })
  } catch (err) {
    console.error('[generate/angles] error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
