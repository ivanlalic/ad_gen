'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface GeneratedReview {
  reviewer_name: string
  age: number
  text: string
  rating: number
}

export async function saveGeneratedReviews(
  productId: string,
  reviews: GeneratedReview[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Save each review as a product_input
  const inputs = reviews.map((r) => ({
    product_id: productId,
    type: 'review' as const,
    content_text: `${r.reviewer_name} (${r.age} años) ★${r.rating}\n${r.text}`,
    source: 'simulada',
    is_simulated: true,
  }))

  const { error: inputError } = await supabase.from('product_inputs').insert(inputs)
  if (inputError) throw new Error(inputError.message)

  // Mark product as having reviews
  const { error: updateError } = await supabase
    .from('products')
    .update({ has_reviews: true })
    .eq('id', productId)

  if (updateError) throw new Error(updateError.message)

  revalidatePath('/stores')
}
