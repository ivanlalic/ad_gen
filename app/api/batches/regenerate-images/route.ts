import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { batchId } = await req.json()
  if (!batchId) return NextResponse.json({ error: 'batchId required' }, { status: 400 })

  // Verify user owns this batch
  const { data: batch } = await supabase
    .from('batches')
    .select('id')
    .eq('id', batchId)
    .single()

  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

  // Reset all error/pending concepts to pending (admin to bypass RLS)
  const { error: resetError } = await supabaseAdmin
    .from('concepts')
    .update({ image_status: 'pending', image_url: null })
    .eq('batch_id', batchId)
    .in('image_status', ['error', 'pending'])

  if (resetError) {
    console.error('[regenerate-images] reset error', resetError)
    return NextResponse.json({ error: resetError.message }, { status: 500 })
  }

  // Set batch back to generating_images
  const { error: batchError } = await supabaseAdmin
    .from('batches')
    .update({ status: 'generating_images' })
    .eq('id', batchId)

  if (batchError) {
    console.error('[regenerate-images] batch update error', batchError)
    return NextResponse.json({ error: batchError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
