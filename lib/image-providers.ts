/**
 * Alternative image generation providers — used as fallback when Gemini is unavailable (503).
 */

const FAL_FALLBACK_MODELS: Record<string, string> = {
  'gemini-3.1-flash-image-preview': 'fal-ai/flux/schnell',
  'gemini-3-pro-image-preview': 'fal-ai/flux-pro',
}

// Fal.ai image_size values by aspect ratio
const FAL_IMAGE_SIZE_MAP: Record<string, string> = {
  '1:1': 'square_hd',
  '4:5': 'portrait_4_3',
  '9:16': 'portrait_16_9',
}

export interface GenerateImageParams {
  prompt: string
  geminiModel: string
  aspectRatio: string
  negativePrompt?: string
}

/**
 * Generate image via fal.ai (Flux). Used when Gemini returns 503.
 * Returns base64-encoded image bytes.
 */
export async function generateWithFal(params: GenerateImageParams): Promise<Buffer> {
  if (!process.env.FAL_KEY) {
    throw new Error('FAL_KEY not configured — fal.ai fallback unavailable')
  }

  const { fal } = await import('@fal-ai/client')
  fal.config({ credentials: process.env.FAL_KEY })

  const falModel = FAL_FALLBACK_MODELS[params.geminiModel] ?? 'fal-ai/flux/schnell'
  const imageSize = FAL_IMAGE_SIZE_MAP[params.aspectRatio] ?? 'square_hd'
  const isSchnell = falModel.includes('schnell')

  const result = await fal.subscribe(falModel, {
    input: {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      image_size: imageSize,
      num_images: 1,
      num_inference_steps: isSchnell ? 4 : 28,
    },
  }) as { data: { images: Array<{ url: string }> } }

  const imageUrl = result.data.images[0]?.url
  if (!imageUrl) throw new Error('fal.ai returned no image URL')

  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`fal.ai image fetch failed: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}
