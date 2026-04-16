'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface CreateProductData {
  storeId: string
  name: string
  niche: string
  targetSex: 'male' | 'female' | 'unisex'
  targetAgeMin: number
  targetAgeMax: number
  hexPrimary: string
  hexSecondary: string
  toneAdjectives: string[]
  wordsAvoid: string[]
  claimsAllowed: string[]
  claimsForbidden: string[]
}

export async function createProduct(data: CreateProductData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      store_id: data.storeId,
      name: data.name,
      niche: data.niche,
      target_sex: data.targetSex,
      target_age_min: data.targetAgeMin,
      target_age_max: data.targetAgeMax,
      hex_primary: data.hexPrimary,
      hex_secondary: data.hexSecondary,
      tone_adjectives: data.toneAdjectives,
      words_avoid: data.wordsAvoid,
      claims_allowed: data.claimsAllowed,
      claims_forbidden: data.claimsForbidden,
      has_reviews: false,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return product.id
}

export interface UpdateProductData {
  productId: string
  name: string
  niche: string
  targetSex: 'male' | 'female' | 'unisex'
  targetAgeMin: number
  targetAgeMax: number
  hexPrimary: string
  hexSecondary: string
  toneAdjectives: string[]
  wordsAvoid: string[]
  claimsAllowed: string[]
  claimsForbidden: string[]
}

export async function updateProduct(data: UpdateProductData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('products')
    .update({
      name: data.name,
      niche: data.niche,
      target_sex: data.targetSex,
      target_age_min: data.targetAgeMin,
      target_age_max: data.targetAgeMax,
      hex_primary: data.hexPrimary,
      hex_secondary: data.hexSecondary,
      tone_adjectives: data.toneAdjectives,
      words_avoid: data.wordsAvoid,
      claims_allowed: data.claimsAllowed,
      claims_forbidden: data.claimsForbidden,
    })
    .eq('id', data.productId)

  if (error) throw new Error(error.message)
}

export async function deleteProductInput(inputId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('product_inputs')
    .delete()
    .eq('id', inputId)

  if (error) throw new Error(error.message)
}

export async function saveProductInput(data: {
  productId: string
  type: 'winning_ad' | 'review' | 'comment' | 'product_photo' | 'inspiration'
  fileUrl?: string
  contentText?: string
  source?: string
  isSimulated?: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('product_inputs').insert({
    product_id: data.productId,
    type: data.type,
    file_url: data.fileUrl ?? null,
    content_text: data.contentText ?? null,
    source: data.source ?? null,
    is_simulated: data.isSimulated ?? false,
  })

  if (error) throw new Error(error.message)
}
