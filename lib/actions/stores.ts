'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { inferLanguage } from '@/lib/constants/countries'

export async function createStore(formData: {
  name: string
  country: string
  logoUrl?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('stores')
    .insert({
      user_id: user.id,
      name: formData.name,
      country: formData.country,
      language: inferLanguage(formData.country),
      logo_url: formData.logoUrl ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id
}

export async function deleteStore(storeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('stores')
    .delete()
    .eq('id', storeId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/stores')
}
