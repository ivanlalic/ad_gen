import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

export const maxDuration = 300
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    batchId,
    conceptId: requestedConceptId,
    aspectRatio: aspectRatioOverride,
    promptOverride,
    correctionText,
    correctionImageBase64,
    correctionImageMime,
    editFromExisting,
  } = body

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
  let concept: { id: string; nb2_prompt: string | null; visual_description: string | null; template_number: number | null; image_url?: string | null } | null = null

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

  // Mark this concept as generating (skip for 9:16 override — it has its own image_url_9_16 field)
  if (!aspectRatioOverride || aspectRatioOverride !== '9:16') {
    await supabase
      .from('concepts')
      .update({ image_status: 'generating' })
      .eq('id', targetConceptId)
  }

  try {
    const model = batch.nb2_model ?? 'gemini-3.1-flash-image-preview'
    const aspectRatio = aspectRatioOverride ?? batch.nb2_aspect_ratios?.[0] ?? '1:1'
    const is916 = aspectRatio === '9:16' && aspectRatioOverride === '9:16'

    // Build content parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []

    if (is916) {
      // 9:16 mode: send existing 1:1 image + simple recreation prompt
      const existingImageUrl = concept.image_url
      if (existingImageUrl) {
        try {
          const imgRes = await fetch(existingImageUrl)
          if (imgRes.ok) {
            const buf = await imgRes.arrayBuffer()
            const base64 = Buffer.from(buf).toString('base64')
            const mime = imgRes.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg'
            parts.push({ inlineData: { mimeType: mime, data: base64 } })
          }
        } catch {
          // Continue without existing image
        }
      }
      parts.push({ text: 'Recreate this exact ad for Instagram Stories / Reels — 9:16 vertical format. Keep all visual elements, text, colors, and style identical. Only adapt the composition and layout to fit the tall vertical canvas.' })
    } else if (editFromExisting && concept.image_url) {
      // Edit-from-existing mode: send generated image + correction instruction
      try {
        const imgRes = await fetch(concept.image_url)
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer()
          const base64 = Buffer.from(buf).toString('base64')
          const mime = imgRes.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg'
          parts.push({ inlineData: { mimeType: mime, data: base64 } })
        }
      } catch {
        // fall through — will still try with correction text only
      }
      if (correctionImageBase64) {
        parts.push({ inlineData: { mimeType: correctionImageMime ?? 'image/jpeg', data: correctionImageBase64 } })
      }
      const editInstruction = correctionText
        ? `Edit this ad image. Keep ALL design elements, text, layout, colors, and style IDENTICAL. Apply ONLY this change: ${correctionText}`
        : 'Regenerate this ad image at higher quality. Keep everything identical.'
      parts.push({ text: editInstruction })
    } else {
      // Standard generation: product photo as anchor + nb2_prompt
      const basePrompt = promptOverride ?? concept.nb2_prompt ?? concept.visual_description ?? ''
      const prompt = correctionText ? `${basePrompt}\n\nCORRECTION: ${correctionText}` : basePrompt

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

      if (productPhotoBase64) {
        parts.push({ inlineData: { mimeType: productPhotoMime, data: productPhotoBase64 } })
      }
      if (correctionImageBase64) {
        parts.push({ inlineData: { mimeType: correctionImageMime ?? 'image/jpeg', data: correctionImageBase64 } })
      }
      if (productPhotoBase64) {
        parts.push({ text: `Use the product in the provided photo as the EXACT product shown in this ad image. Do not invent or replace the product — feature it prominently.\n\n${prompt}` })
      } else {
        parts.push({ text: prompt })
      }
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
    const suffix = is916 ? '_9x16' : ''
    const storagePath = `${user.id}/${batchId}/${targetConceptId}${suffix}.${ext}`

    await supabaseAdmin.storage
      .from('generated-images')
      .upload(storagePath, imageBuffer, {
        contentType: mimeType,
        upsert: true,
      })

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('generated-images')
      .getPublicUrl(storagePath)

    const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`

    if (is916) {
      // Store in image_url_9_16, don't change image_status
      await supabase
        .from('concepts')
        .update({ image_url_9_16: cacheBustedUrl })
        .eq('id', targetConceptId)

      return NextResponse.json({
        targetConceptId,
        imageUrl916: cacheBustedUrl,
      })
    }

    // Update concept with image URL and done status
    await supabase
      .from('concepts')
      .update({ image_url: cacheBustedUrl, image_status: 'done' })
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

    // Mark concept as error so loop can continue with others (skip for 9:16 — don't clobber existing status)
    if (!aspectRatioOverride || aspectRatioOverride !== '9:16') {
      await supabase
        .from('concepts')
        .update({ image_status: 'error' })
        .eq('id', targetConceptId)
    }

    return NextResponse.json({ error: String(err), targetConceptId }, { status: 500 })
  }
}
