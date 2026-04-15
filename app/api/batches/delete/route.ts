import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const batchIds: string[] = body.batchIds

  if (!Array.isArray(batchIds) || batchIds.length === 0) {
    return NextResponse.json({ error: 'batchIds required' }, { status: 400 })
  }

  // Delete concepts first (FK constraint)
  const { error: conceptsError } = await supabase
    .from('concepts')
    .delete()
    .in('batch_id', batchIds)

  if (conceptsError) {
    console.error('[batches/delete] concepts error', conceptsError)
    return NextResponse.json({ error: conceptsError.message }, { status: 500 })
  }

  // Delete batches
  const { error: batchesError } = await supabase
    .from('batches')
    .delete()
    .in('id', batchIds)

  if (batchesError) {
    console.error('[batches/delete] batches error', batchesError)
    return NextResponse.json({ error: batchesError.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: batchIds.length })
}
