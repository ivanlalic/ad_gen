import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BatchStudio } from '@/components/batch/batch-studio'

interface Props {
  searchParams: Promise<{ productId?: string }>
}

export default async function NewBatchPage({ searchParams }: Props) {
  const { productId } = await searchParams

  if (!productId) {
    redirect('/stores')
  }

  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select(`
      id, name, niche, target_sex, target_age_min, target_age_max,
      hex_primary, hex_secondary, tone_adjectives, words_avoid,
      claims_allowed, claims_forbidden, has_reviews,
      stores (id, name, country, language),
      product_inputs (type, content_text, file_url, source, is_simulated)
    `)
    .eq('id', productId)
    .single()

  if (!product) notFound()

  return <BatchStudio product={product} />
}
