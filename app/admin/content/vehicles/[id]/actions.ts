'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'

export async function updateVehicle(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const name = (formData.get('name') as string)?.trim()
  const type = (formData.get('type') as string) || 'jeep'
  const seats = parseInt(formData.get('seats') as string) || 4
  const count = parseInt(formData.get('count') as string) || 1
  const descriptionEn = (formData.get('descriptionEn') as string)?.trim()
  const imageUrl = (formData.get('imageUrl') as string)?.trim()
  const isActive = formData.get('isActive') === 'true'

  if (!name) throw new Error('Name is required.')
  if (seats < 1) throw new Error('Seats must be at least 1.')
  if (count < 1) throw new Error('Count must be at least 1.')

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  const { error } = await admin
    .from('vehicles')
    .update({
      name,
      type,
      seats,
      count,
      description_en: descriptionEn || null,
      image_url: imageUrl || null,
      is_active: isActive,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  redirect('/admin/content/vehicles')
}
