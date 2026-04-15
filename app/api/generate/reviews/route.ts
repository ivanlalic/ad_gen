import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getNicheConfig } from '@/lib/constants/niches'
import { getCountryConfig } from '@/lib/constants/countries'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId } = await req.json()
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

  // Fetch product + store — RLS ensures user owns it
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id, name, niche, target_sex, target_age_min, target_age_max,
      stores (country, language)
    `)
    .eq('id', productId)
    .single()

  if (error || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const store = (product as any).stores
  const niche = getNicheConfig(product.niche ?? '')
  const country = getCountryConfig(store?.country ?? 'ES')

  const sexLabel =
    product.target_sex === 'male'
      ? 'hombres'
      : product.target_sex === 'female'
        ? 'mujeres'
        : 'hombres y mujeres'

  const dialectNotes: Record<string, string> = {
    ES: 'Español de España: usá "tú", "vosotros", vocabulario ibérico. Ej: "¡Consíguelo ya!", "genial", "tío/tía".',
    AR: 'Español de Argentina: usá "vos" y sus conjugaciones ("probalo", "conseguilo"). Tono cálido, informal. Ej: "re bueno", "bárbaro".',
    MX: 'Español de México: usá "tú", expresiones mexicanas. Ej: "¡Aprovecha!", "está padrísimo", "compa".',
    CO: 'Español de Colombia: tono cercano y cálido. Ej: "¡Bacano!", "parcero", "chévere".',
  }

  const systemPrompt = `Sos un experto en escribir reviews de clientes auténticas para productos de e-commerce.

Generá 20 reviews realistas para el siguiente producto.

REGLAS CRÍTICAS:
- ${dialectNotes[store?.country ?? 'ES'] ?? dialectNotes['ES']}
- Reviewers: ${sexLabel}, entre ${product.target_age_min ?? 25} y ${product.target_age_max ?? 55} años
- Usá nombres típicos del país (${country?.label ?? 'España'})
- Nicho: ${niche?.label ?? product.niche} — dolores, lenguaje y resultados específicos del nicho
- Variedad: 16-17 muy positivas (4-5 estrellas), 2-3 con pequeña objeción inicial resuelta
- Detalles específicos: resultado concreto, timeframe realista (semanas/meses), contexto personal
- Longitud: 2-4 líneas por review, lenguaje coloquial auténtico
- PROHIBIDO: inventar porcentajes, estadísticas médicas, claims de cura
- Cada review debe sonar como una persona real diferente, no genérica

OUTPUT: responde SOLO con un JSON array válido, sin texto adicional, sin markdown.
IMPORTANTE: El JSON debe ser estrictamente válido. No incluyas saltos de línea literales dentro de los strings (usá \\n si es necesario) ni comillas sin escapar.
[{"reviewer_name":"...","age":35,"text":"...","rating":5}]`

  const userPrompt = `Producto: ${product.name}
Nicho: ${niche?.label ?? product.niche}
País: ${country?.label ?? store?.country}
Audiencia: ${sexLabel}, ${product.target_age_min}-${product.target_age_max} años

Generá las 20 reviews ahora.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    // Extract JSON array from response
    const match = rawText.match(/\[[\s\S]*\]/)
    if (!match) {
      return NextResponse.json({ error: 'Invalid Claude response' }, { status: 500 })
    }

    let reviews;
    try {
      reviews = JSON.parse(match[0]) as Array<{
        reviewer_name: string
        age: number
        text: string
        rating: number
      }>
    } catch (parseError) {
      console.error('Error al parsear el JSON de Claude en reviews:', parseError);
      console.error('Últimos 100 caracteres recibidos:', match[0].substring(match[0].length - 100));
      return NextResponse.json({ error: 'Claude devolvió un JSON incompleto o inválido para las reviews.' }, { status: 500 })
    }

    return NextResponse.json({ reviews })
  } catch (err) {
    console.error('Claude reviews error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
