import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { rawInput, productName, niche } = body

  if (!rawInput?.trim()) {
    return NextResponse.json({ error: 'rawInput required' }, { status: 400 })
  }

  const prompt = `Tenés este fragmento de ángulo para un ad de "${productName ?? 'un producto'}" (${niche ?? 'ecommerce'}):

"${rawInput.trim()}"

Completalo como un ángulo de direct response poderoso para Meta Ads.
Un ángulo = el enfoque emocional central del ad (un dolor o un deseo específico).

Respondé SOLO con JSON válido, sin markdown:
{"title":"4-6 palabras que capturen el ángulo exacto","type":"pain","description":"1 oración sobre cómo ejecutarlo en un ad"}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in response')

    const angle = JSON.parse(match[0]) as { title: string; type: string; description: string }
    return NextResponse.json({ angle })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
