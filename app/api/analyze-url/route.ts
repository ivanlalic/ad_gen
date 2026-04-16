import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { getCountryConfig } from '@/lib/constants/countries'

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

function extractTopColors(html: string): string[] {
  const hexPattern = /#([0-9A-Fa-f]{6})\b/g
  const counts = new Map<string, number>()
  let m: RegExpExecArray | null
  while ((m = hexPattern.exec(html)) !== null) {
    const hex = `#${m[1].toUpperCase()}`
    // Skip near-black, near-white, pure grays
    const r = parseInt(m[1].slice(0, 2), 16)
    const g = parseInt(m[1].slice(2, 4), 16)
    const b = parseInt(m[1].slice(4, 6), 16)
    const isGray = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20
    const isNearBlack = r < 30 && g < 30 && b < 30
    const isNearWhite = r > 225 && g > 225 && b > 225
    if (!isGray && !isNearBlack && !isNearWhite) {
      counts.set(hex, (counts.get(hex) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([hex]) => hex)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, country } = await req.json()
  const countryConfig = country ? getCountryConfig(country) : undefined
  const outputLanguage = countryConfig ? countryConfig.language : 'Español (España)'

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
    const topColors = extractTopColors(html)
    const colorHint = topColors.length > 0
      ? `\n\nDETECTED BRAND COLORS (most frequent non-neutral hex colors from the page CSS/styles): ${topColors.join(', ')} — use the most prominent as hexPrimary and the second most as hexSecondary.`
      : ''
    pageText = stripHtml(html).slice(0, 8000) + colorHint
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Error al acceder a la URL: ${msg}` }, { status: 422 })
  }

  const systemPrompt = `You are a product analyst for a direct-response ad agency. Extract product information from the page text and return ONLY a valid JSON object — no markdown, no explanation, no code blocks.

IMPORTANT: All text fields (description, keyFeatures, uniqueValueProp, targetAudienceDescription, commonObjections, useCases, toneAdjectives) MUST be written in ${outputLanguage}. Regardless of what language the source page is in, always output in ${outputLanguage}.

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

For colors: if DETECTED BRAND COLORS are listed at the end of the page text, use them as hexPrimary and hexSecondary (pick the most visually dominant/brand-representative ones). Otherwise infer from branding mentions or use niche defaults.
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
