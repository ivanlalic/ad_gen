import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const batchIds: string[] = body.batchIds

  if (!Array.isArray(batchIds) || batchIds.length === 0) {
    return NextResponse.json({ error: 'batchIds required' }, { status: 400 })
  }

  // Verify user owns all these batches (RLS-safe read through product → store chain)
  const { data: ownedBatches } = await supabase
    .from('batches')
    .select('id')
    .in('id', batchIds)

  const ownedIds = (ownedBatches ?? []).map((b) => b.id)
  if (ownedIds.length === 0) {
    return NextResponse.json({ error: 'No batches found or not authorized' }, { status: 403 })
  }

  // Use admin client to bypass RLS for DELETE (batches have no direct user_id column)
  const { error: conceptsError } = await supabaseAdmin
    .from('concepts')
    .delete()
    .in('batch_id', ownedIds)

  if (conceptsError) {
    console.error('[batches/delete] concepts error', conceptsError)
    return NextResponse.json({ error: conceptsError.message }, { status: 500 })
  }

  const { error: batchesError } = await supabaseAdmin
    .from('batches')
    .delete()
    .in('id', ownedIds)

  if (batchesError) {
    console.error('[batches/delete] batches error', batchesError)
    return NextResponse.json({ error: batchesError.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: ownedIds.length })
}
