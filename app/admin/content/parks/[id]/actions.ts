'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function updatePark(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const id = formData.get('id') as string
  const name = (formData.get('name') as string)?.trim()
  const country = (formData.get('country') as string)?.trim() || 'Tanzania'
  const parkType = (formData.get('parkType') as string) || 'national_park'
  const descriptionEn = (formData.get('descriptionEn') as string)?.trim()
  const coverImageUrl = (formData.get('coverImageUrl') as string)?.trim()
  const isActive = formData.get('isActive') === 'true'

  if (!name) throw new Error('Name is required.')

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  const { error } = await admin.from('parks').update({
    name,
    country,
    park_type: parkType,
    description_en: descriptionEn || null,
    cover_image_url: coverImageUrl || null,
    is_active: isActive,
  }).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/content/parks')
  redirect('/admin/content/parks')
}

export async function deletePark(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const id = formData.get('id') as string
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  const { error } = await admin.from('parks').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content/parks')
  redirect('/admin/content/parks')
}
