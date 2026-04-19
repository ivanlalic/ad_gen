import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'

const geminiAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { productId } = body
  const model: string = body.model ?? 'claude-haiku-4-5-20251001'

  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 })
  }

  // Fetch product name for context
  const { data: product } = await supabase
    .from('products')
    .select('id, name, niche')
    .eq('id', productId)
    .single()

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  // Fetch winning ad inputs with file URLs
  const { data: winningAdInputs } = await supabase
    .from('product_inputs')
    .select('id, file_url')
    .eq('product_id', productId)
    .eq('type', 'winning_ad')
    .not('file_url', 'is', null)
    .limit(5)

  if (!winningAdInputs || winningAdInputs.length === 0) {
    return NextResponse.json({ error: 'No hay winning ads para este producto. Subí ads ganadores desde "Editar producto".' }, { status: 400 })
  }

  // Fetch images as base64
  const imageParts: Array<{ base64: string; mimeType: string }> = []
  for (const ad of winningAdInputs) {
    try {
      const res = await fetch(ad.file_url!)
      if (!res.ok) continue
      const buf = await res.arrayBuffer()
      const base64 = Buffer.from(buf).toString('base64')
      const rawMime = res.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg'
      const mimeType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(rawMime)
        ? rawMime
        : 'image/jpeg'
      imageParts.push({ base64, mimeType })
    } catch {
      // skip failed fetches
    }
  }

  if (imageParts.length === 0) {
    return NextResponse.json({ error: 'No se pudieron cargar las imágenes de los winning ads.' }, { status: 400 })
  }

  const n = imageParts.length

  const systemPrompt = `Sos estratega de direct response para Meta Ads. Analizás creativos publicitarios reales para extraer los ángulos de messaging que hacen que funcionen.`

  const userPrompt = `Analizá estos ${n} ads ganadores reales del producto "${product.name}". Por cada ad, identificá:
- quién es el target específico (segmento, dolor, momento de vida)
- qué emoción o dolor activa
- qué promesa o hook usa
- qué estructura narrativa o visual emplea

Devolvé un JSON array con exactamente ${n} objetos. Sin markdown, sin texto adicional.
Formato exacto:
[{"id":1,"title":"Título corto del ángulo (3-5 palabras)","description":"2-3 oraciones: a quién apunta, qué emoción/insight activa, qué promesa o historia cuenta"}]`

  try {
    let rawText = ''

    if (model.startsWith('claude-')) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      const claudeParts: Array<
        { type: 'text'; text: string } |
        { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string } }
      > = [
        { type: 'text', text: userPrompt },
        ...imageParts.map(p => ({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: p.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: p.base64,
          },
        })),
      ]

      const message = await anthropic.messages.create({
        model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: claudeParts }],
      })
      rawText = message.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('')
    } else {
      const geminiParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
        { text: userPrompt },
        ...imageParts.map(p => ({ inlineData: { mimeType: p.mimeType, data: p.base64 } })),
      ]
      const response = await geminiAi.models.generateContent({
        model,
        contents: [{ role: 'user', parts: geminiParts }],
        config: { systemInstruction: systemPrompt, temperature: 0.7 },
      })
      rawText = response.text ?? ''
    }

    const match = rawText.match(/\[[\s\S]*\]/)
    if (!match) return NextResponse.json({ error: 'Respuesta inválida del modelo' }, { status: 500 })

    const angles = JSON.parse(match[0]) as Array<{ id: number; title: string; description: string }>

    return NextResponse.json({ angles })
  } catch (err) {
    console.error('[generate/winning-ad-angles] error:', err)
    return NextResponse.json({ error: 'Error al analizar los winning ads' }, { status: 500 })
  }
}
