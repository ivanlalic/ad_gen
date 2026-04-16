import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user owns this concept via RLS-safe SELECT
  const { data: concept } = await supabase.from('concepts').select('id').eq('id', id).single()
  if (!concept) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Use admin to bypass RLS for DELETE
  const { error } = await supabaseAdmin.from('concepts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (body.action === 'retry') {
    // Verify ownership via RLS-safe SELECT
    const { data: concept } = await supabase.from('concepts').select('id').eq('id', id).single()
    if (!concept) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Use admin to bypass RLS for UPDATE
    const { error } = await supabaseAdmin
      .from('concepts')
      .update({ image_status: 'pending', image_url: null })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ retrying: true })
  }

  if (body.action === 'update-prompt') {
    const { nb2Prompt } = body
    if (typeof nb2Prompt !== 'string') return NextResponse.json({ error: 'nb2Prompt required' }, { status: 400 })

    // Verify ownership via RLS
    const { data: concept } = await supabase.from('concepts').select('id').eq('id', id).single()
    if (!concept) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { error } = await supabaseAdmin
      .from('concepts')
      .update({ nb2_prompt: nb2Prompt })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ updated: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
