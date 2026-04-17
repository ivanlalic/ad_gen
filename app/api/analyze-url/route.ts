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

async function fetchPageText(url: string): Promise<{ text: string; colors: string[] }> {
  const pageRes = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status}`)
  const html = await pageRes.text()
  return {
    text: stripHtml(html).slice(0, 8000),
    colors: extractTopColors(html),
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const country: string | undefined = body.country
  const countryConfig = country ? getCountryConfig(country) : undefined
  const outputLanguage = countryConfig ? countryConfig.language : 'Español (España)'

  // Accept both `url` (single, backward compat) and `urls` (multi)
  const rawUrls: string[] = body.urls ?? (body.url ? [body.url] : [])
  const validUrls = rawUrls.filter((u) => typeof u === 'string' && u.startsWith('http'))
  if (validUrls.length === 0) {
    return NextResponse.json({ error: 'URL inválida — debe comenzar con http:// o https://' }, { status: 400 })
  }

  // Fetch all pages in parallel
  const results = await Promise.allSettled(validUrls.map(fetchPageText))

  const successfulResults = results
    .map((r, i) => ({ result: r, url: validUrls[i] }))
    .filter((x): x is { result: PromiseFulfilledResult<{ text: string; colors: string[] }>; url: string } =>
      x.result.status === 'fulfilled'
    )

  if (successfulResults.length === 0) {
    const firstError = results.find((r) => r.status === 'rejected') as PromiseRejectedResult
    const msg = firstError?.reason instanceof Error ? firstError.reason.message : String(firstError?.reason)
    return NextResponse.json({ error: `Error al acceder a la URL: ${msg}` }, { status: 422 })
  }

  // Merge colors across all pages, deduplicated, top 6
  const allColors: string[] = []
  const colorSet = new Set<string>()
  for (const { result } of successfulResults) {
    for (const c of result.value.colors) {
      if (!colorSet.has(c)) { colorSet.add(c); allColors.push(c) }
    }
  }
  const topColors = allColors.slice(0, 6)

  // Concatenate page texts with source labels; total budget ~12000 chars
  const perPageBudget = Math.floor(10000 / successfulResults.length)
  const combinedText = successfulResults
    .map(({ result, url }, i) =>
      `=== FUENTE ${i + 1}: ${url} ===\n${result.value.text.slice(0, perPageBudget)}`
    )
    .join('\n\n')

  const colorHint = topColors.length > 0
    ? `\n\nDETECTED BRAND COLORS (most frequent non-neutral hex colors from the page CSS/styles): ${topColors.join(', ')} — use the most prominent as hexPrimary and the second most as hexSecondary.`
    : ''
  const pageText = combinedText + colorHint

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
    const userPrompt = successfulResults.length > 1
      ? `Analyze these ${successfulResults.length} product pages and synthesize the data into a single product profile:\n\n${pageText}`
      : `Analyze this product page and extract the data:\n\n${pageText}`

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
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
