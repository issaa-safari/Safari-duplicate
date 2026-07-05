'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { admin }
}

export async function addRoom(formData: FormData) {
  const { admin } = await authGuard()
  const accommodationId = (formData.get('accommodationId') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()
  const str = (n: string) => (formData.get(n) as string)?.trim() || null
  const maxOcc = Number(formData.get('maxOccupancy'))
  const amenities = ((formData.get('amenities') as string) || '')
    .split(',').map(s => s.trim()).filter(Boolean)

  if (!accommodationId) throw new Error('Missing accommodation.')
  if (!name) throw new Error('Room name is required.')

  const { error } = await admin.from('rooms').insert({
    accommodation_id: accommodationId,
    name,
    room_type: str('roomType'),
    bed_config: str('bedConfig'),
    max_occupancy: Number.isInteger(maxOcc) && maxOcc > 0 ? maxOcc : 2,
    amenities,
    is_active: true,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/content/accommodations/${accommodationId}`)
}

export async function deleteRoom(formData: FormData) {
  const { admin } = await authGuard()
  const id = (formData.get('id') as string)?.trim()
  const accommodationId = (formData.get('accommodationId') as string)?.trim()
  if (!id || !accommodationId) throw new Error('Missing id.')
  const { error } = await admin.from('rooms').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/content/accommodations/${accommodationId}`)
}
