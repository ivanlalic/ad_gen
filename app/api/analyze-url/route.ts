import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

const VALID_NICHES = [
  'beauty_female', 'hair_growth_male', 'sexual_performance_male',
  'health_supplements', 'beauty_male', 'feminine_health', 'weight_loss', 'joint_pain',
]

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()

  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ error: 'URL inválida — debe comenzar con http:// o https://' }, { status: 400 })
  }

  // Fetch the page server-side (avoids CORS)
  let pageText: string
  try {
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!pageRes.ok) {
      return NextResponse.json({ error: `No se pudo acceder a la URL (${pageRes.status})` }, { status: 422 })
    }
    const html = await pageRes.text()
    pageText = stripHtml(html).slice(0, 8000)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Error al acceder a la URL: ${msg}` }, { status: 422 })
  }

  const systemPrompt = `You are a product analyst for a direct-response ad agency. Extract product information from the page text and return ONLY a valid JSON object — no markdown, no explanation, no code blocks.

Available niches: ${VALID_NICHES.join(', ')}
Available toneStyle values: directa, científica, empática, aspiracional
Available targetSex values: male, female, unisex

Return exactly this JSON shape:
{
  "name": "product name (string)",
  "niche": "one of the available niches",
  "description": "what the product is and what it does (2-4 sentences)",
  "keyFeatures": "key features and ingredients to highlight (2-4 sentences)",
  "uniqueValueProp": "why choose this over competitors (1-2 sentences)",
  "targetAudienceDescription": "who buys it, their pain points and desires (2-3 sentences)",
  "commonObjections": "what stops people from buying (1-2 sentences)",
  "useCases": "when and how it is used (1-2 sentences)",
  "targetSex": "male|female|unisex",
  "targetAgeMin": 25,
  "targetAgeMax": 45,
  "hexPrimary": "#xxxxxx",
  "hexSecondary": "#xxxxxx",
  "toneAdjectives": ["word1", "word2", "word3"],
  "toneStyle": "directa|científica|empática|aspiracional"
}

For colors: infer the brand's primary and secondary colors from mentions of branding, packaging, or visual identity. If not determinable, use sensible defaults for the niche.
For age range: use integers, min >= 18, max <= 75, min < max.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: [{ role: 'user', parts: [{ text: `Analyze this product page and extract the data:\n\n${pageText}` }] }],
      config: { systemInstruction: systemPrompt, temperature: 0.2 },
    })

    const raw = response.text ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ error: 'La IA no pudo extraer información de esta página' }, { status: 422 })
    }

    const data = JSON.parse(match[0])

    // Validate + sanitize
    if (!VALID_NICHES.includes(data.niche)) data.niche = 'health_supplements'
    if (!['male', 'female', 'unisex'].includes(data.targetSex)) data.targetSex = 'unisex'
    if (!['directa', 'científica', 'empática', 'aspiracional'].includes(data.toneStyle)) data.toneStyle = 'directa'
    if (typeof data.targetAgeMin !== 'number' || data.targetAgeMin < 18) data.targetAgeMin = 25
    if (typeof data.targetAgeMax !== 'number' || data.targetAgeMax > 75) data.targetAgeMax = 50
    if (data.targetAgeMin >= data.targetAgeMax) { data.targetAgeMin = 25; data.targetAgeMax = 50 }
    if (!Array.isArray(data.toneAdjectives)) data.toneAdjectives = []
    if (!data.hexPrimary?.startsWith('#')) data.hexPrimary = '#6366f1'
    if (!data.hexSecondary?.startsWith('#')) data.hexSecondary = '#1a1a24'

    return NextResponse.json(data)
  } catch (err) {
    console.error('[analyze-url] Error:', err)
    return NextResponse.json({ error: 'Error al analizar la página con IA' }, { status: 500 })
  }
}
