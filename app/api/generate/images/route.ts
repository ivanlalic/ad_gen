import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

const MODEL_MAP: Record<string, string> = {
  'gemini-3.1-flash-image-preview': 'imagen-3.0-fast-generate-001',
  'gemini-3-pro-image-preview': 'imagen-3.0-generate-002',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { batchId } = body

  if (!batchId) {
    return NextResponse.json({ error: 'batchId required' }, { status: 400 })
  }

  // Fetch batch — RLS ensures user owns it
  const { data: batch } = await supabase
    .from('batches')
    .select('*')
    .eq('id', batchId)
    .single()

  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  }

  // Find first pending concept
  const { data: pendingConcepts } = await supabase
    .from('concepts')
    .select('*')
    .eq('batch_id', batchId)
    .eq('image_status', 'pending')
    .order('template_number', { ascending: true })
    .limit(1)

  const concept = pendingConcepts?.[0]

  // No pending concepts left — mark batch done
  if (!concept) {
    await supabase
      .from('batches')
      .update({ status: 'done' })
      .eq('id', batchId)
    return NextResponse.json({ done: true })
  }

  const conceptId = concept.id

  // Mark this concept as generating
  await supabase
    .from('concepts')
    .update({ image_status: 'generating' })
    .eq('id', conceptId)

  try {
    const model = MODEL_MAP[batch.nb2_model] ?? 'imagen-3.0-fast-generate-001'
    const aspectRatio = batch.nb2_aspect_ratios?.[0] ?? '1:1'

    const response = await ai.models.generateImages({
      model,
      prompt: concept.nb2_prompt ?? concept.visual_description ?? '',
      config: {
        numberOfImages: 1,
        aspectRatio,
        negativePrompt: batch.nb2_negative_prompt ?? 'blurry, low quality',
        outputMimeType: 'image/jpeg',
      },
    })

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes
    if (!imageBytes) {
      throw new Error('No image bytes returned from Gemini')
    }

    // Upload to Supabase Storage via admin client (bypasses RLS)
    const imageBuffer = Buffer.from(imageBytes, 'base64')
    const storagePath = `${user.id}/${batchId}/${conceptId}.jpg`

    await supabaseAdmin.storage
      .from('generated-images')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('generated-images')
      .getPublicUrl(storagePath)

    // Update concept with image URL and done status
    await supabase
      .from('concepts')
      .update({ image_url: publicUrl, image_status: 'done' })
      .eq('id', conceptId)

    // Check remaining pending concepts
    const { count: remainingCount } = await supabase
      .from('concepts')
      .select('id', { count: 'exact', head: true })
      .eq('batch_id', batchId)
      .eq('image_status', 'pending')

    // If none remaining, mark batch done
    if (!remainingCount || remainingCount === 0) {
      await supabase
        .from('batches')
        .update({ status: 'done' })
        .eq('id', batchId)
    }

    return NextResponse.json({
      conceptId,
      imageUrl: publicUrl,
      remainingCount: remainingCount ?? 0,
    })
  } catch (err) {
    console.error('[generate/images] Error generating image for concept', conceptId, err)

    // Mark concept as error so loop can continue with others
    await supabase
      .from('concepts')
      .update({ image_status: 'error' })
      .eq('id', conceptId)

    return NextResponse.json({ error: 'Image generation failed', conceptId }, { status: 500 })
  }
}
