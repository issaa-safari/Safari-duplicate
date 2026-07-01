'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'

export async function createActivity(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const name = (formData.get('name') as string)?.trim()
  const destinationId = (formData.get('destinationId') as string) || null
  const descriptionEn = (formData.get('descriptionEn') as string)?.trim()
  const descriptionAr = (formData.get('descriptionAr') as string)?.trim()
  const coverImageUrl = (formData.get('coverImageUrl') as string)?.trim()
  const isActive = formData.get('isActive') === 'true'

  if (!name) throw new Error('Name is required.')

  const hasContent = !!(descriptionEn || coverImageUrl)

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  const { error } = await admin
    .from('activities')
    .insert({
      name,
      destination_id: destinationId || null,
      description_en: descriptionEn || null,
      description_ar: descriptionAr || null,
      cover_image_url: coverImageUrl || null,
      is_active: isActive,
      has_content: hasContent,
    })

  if (error) throw new Error(error.message)

  redirect('/admin/content/activities')
}
