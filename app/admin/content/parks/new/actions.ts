'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'

export async function createPark(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const name = (formData.get('name') as string)?.trim()
  const country = (formData.get('country') as string)?.trim() || 'Tanzania'
  const parkType = (formData.get('parkType') as string) || 'national_park'
  const descriptionEn = (formData.get('descriptionEn') as string)?.trim()
  const coverImageUrl = (formData.get('coverImageUrl') as string)?.trim()
  const isActive = formData.get('isActive') === 'true'

  if (!name) throw new Error('Name is required.')

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  const { error } = await admin.from('parks').insert({
    name,
    country,
    park_type: parkType,
    description_en: descriptionEn || null,
    cover_image_url: coverImageUrl || null,
    is_active: isActive,
  })

  if (error) throw new Error(error.message)
  redirect('/admin/content/parks')
}
