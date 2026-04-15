import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { batchId, conceptId: requestedConceptId } = body

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

  // Use explicit conceptId (retry) or pick first pending concept
  let concept: { id: string; nb2_prompt: string | null; visual_description: string | null; template_number: number | null } | null = null

  if (requestedConceptId) {
    const { data } = await supabase
      .from('concepts')
      .select('*')
      .eq('id', requestedConceptId)
      .eq('batch_id', batchId)
      .single()
    concept = data
  } else {
    const { data: pendingConcepts } = await supabase
      .from('concepts')
      .select('*')
      .eq('batch_id', batchId)
      .eq('image_status', 'pending')
      .order('template_number', { ascending: true })
      .limit(1)
    concept = pendingConcepts?.[0] ?? null
  }

  // No pending concepts left — mark batch done
  if (!concept) {
    await supabase
      .from('batches')
      .update({ status: 'done' })
      .eq('id', batchId)
    return NextResponse.json({ done: true })
  }

  const targetConceptId = concept.id

  // Mark this concept as generating
  await supabase
    .from('concepts')
    .update({ image_status: 'generating' })
    .eq('id', targetConceptId)

  try {
    const model = batch.nb2_model ?? 'gemini-3.1-flash-image-preview'
    const aspectRatio = batch.nb2_aspect_ratios?.[0] ?? '1:1'
    const prompt = concept.nb2_prompt ?? concept.visual_description ?? ''

    // Fetch product photo to use as reference image for Gemini
    let productPhotoBase64: string | null = null
    let productPhotoMime = 'image/jpeg'

    try {
      const { data: productInputs } = await supabase
        .from('product_inputs')
        .select('file_url')
        .eq('product_id', batch.product_id)
        .eq('type', 'product_photo')
        .not('file_url', 'is', null)
        .limit(1)

      const photoUrl = productInputs?.[0]?.file_url
      if (photoUrl) {
        const imgRes = await fetch(photoUrl)
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer()
          productPhotoBase64 = Buffer.from(buf).toString('base64')
          productPhotoMime = imgRes.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg'
        }
      }
    } catch {
      // Continue without product photo
    }

    // Build content parts — text prompt + optional product photo reference
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: prompt },
    ]
    if (productPhotoBase64) {
      parts.push({ inlineData: { mimeType: productPhotoMime, data: productPhotoBase64 } })
    }

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts }],
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio },
      },
    })

    // Extract inline image bytes from response parts
    let imageBytes: string | null = null
    let mimeType = 'image/png'
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        imageBytes = part.inlineData.data
        mimeType = part.inlineData.mimeType ?? 'image/png'
        break
      }
    }

    if (!imageBytes) {
      throw new Error('No image data returned from Gemini')
    }

    // Upload to Supabase Storage via admin client (bypasses RLS)
    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
    const imageBuffer = Buffer.from(imageBytes, 'base64')
    const storagePath = `${user.id}/${batchId}/${targetConceptId}.${ext}`

    await supabaseAdmin.storage
      .from('generated-images')
      .upload(storagePath, imageBuffer, {
        contentType: mimeType,
        upsert: true,
      })

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('generated-images')
      .getPublicUrl(storagePath)

    // Update concept with image URL and done status
    await supabase
      .from('concepts')
      .update({ image_url: publicUrl, image_status: 'done' })
      .eq('id', targetConceptId)

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
      targetConceptId,
      imageUrl: publicUrl,
      remainingCount: remainingCount ?? 0,
    })
  } catch (err) {
    console.error('[generate/images] Error generating image for concept', targetConceptId, err)

    // Mark concept as error so loop can continue with others
    await supabase
      .from('concepts')
      .update({ image_status: 'error' })
      .eq('id', targetConceptId)

    return NextResponse.json({ error: String(err), targetConceptId }, { status: 500 })
  }
}
