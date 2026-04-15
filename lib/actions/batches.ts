'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface CreateBatchData {
  productId: string
  totalConcepts: number
  aspectRatios: string[]
  adaptFormats: boolean
  nb2Model: string
  stylePreset: string
  negativePrompt?: string
  seed?: number
  generateImages: boolean
  pinnedConceptText?: string
  keyOffers?: string
  selectedTemplates?: number[]
}

export async function createBatch(data: CreateBatchData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify user owns the product
  const { data: product } = await supabase
    .from('products')
    .select('id, store_id')
    .eq('id', data.productId)
    .single()

  if (!product) {
    throw new Error('Product not found')
  }

  const { data: batch, error } = await supabase
    .from('batches')
    .insert({
      product_id: data.productId,
      status: 'queued',
      total_concepts: data.totalConcepts,
      nb2_aspect_ratios: data.aspectRatios,
      adapt_formats: data.adaptFormats,
      nb2_model: data.nb2Model,
      nb2_style_preset: data.stylePreset,
      nb2_negative_prompt: data.negativePrompt ?? null,
      nb2_seed: data.seed ?? null,
      generate_images: data.generateImages,
      pinned_concept_text: data.pinnedConceptText ?? null,
      key_offers: data.keyOffers ?? null,
      selected_templates: data.selectedTemplates ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return batch.id
}

export async function updateBatchStatus(
  batchId: string,
  status: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('batches')
    .update({ status })
    .eq('id', batchId)

  if (error) throw new Error(error.message)
}

export async function saveConcepts(
  batchId: string,
  concepts: Array<{
    templateNumber: number
    templateName: string
    headline: string
    bodyCopy: string
    visualDescription: string
    sourceGrounding: string
    nb2Prompt: string
    isPinned?: boolean
  }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rows = concepts.map((c) => ({
    batch_id: batchId,
    template_number: c.templateNumber,
    template_name: c.templateName,
    headline: c.headline,
    body_copy: c.bodyCopy,
    visual_description: c.visualDescription,
    source_grounding: c.sourceGrounding,
    nb2_prompt: c.nb2Prompt,
    is_pinned: c.isPinned ?? false,
    image_status: 'pending',
  }))

  const { error } = await supabase.from('concepts').insert(rows)
  if (error) throw new Error(error.message)
}

export async function getBatchWithConcepts(batchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: batch, error } = await supabase
    .from('batches')
    .select(`
      *,
      concepts (*)
    `)
    .eq('id', batchId)
    .single()

  if (error) return null
  return batch
}

export async function deleteBatch(batchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Delete concepts first (FK constraint)
  await supabase.from('concepts').delete().eq('batch_id', batchId)

  const { error } = await supabase
    .from('batches')
    .delete()
    .eq('id', batchId)

  if (error) throw new Error(error.message)
  revalidatePath('/stores')
}

export async function deleteBatches(batchIds: string[]) {
  if (batchIds.length === 0) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Delete all concepts for these batches in one query
  await supabase.from('concepts').delete().in('batch_id', batchIds)

  const { error } = await supabase
    .from('batches')
    .delete()
    .in('id', batchIds)

  if (error) throw new Error(error.message)
  revalidatePath('/stores')
}
