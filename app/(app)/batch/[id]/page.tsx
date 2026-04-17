import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BatchViewer } from '@/components/batch/batch-viewer'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BatchPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: batch } = await supabase
    .from('batches')
    .select(`
      id, status, total_concepts, generate_images, nb2_aspect_ratios, nb2_model,
      nb2_style_preset, nb2_negative_prompt, created_at, label,
      products (
        id, name, hex_primary, store_id,
        stores (name)
      )
    `)
    .eq('id', id)
    .single()

  if (!batch) notFound()

  const { data: concepts } = await supabase
    .from('concepts')
    .select('*')
    .eq('batch_id', id)
    .order('template_number', { ascending: true })

  return <BatchViewer batch={batch as any} concepts={concepts ?? []} />
}
