'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { admin, user }
}

// Create a shareable self-service booking link for a departure.
export async function createBookingLink(formData: FormData) {
  const { admin, user } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  if (!departureId) throw new Error('Missing departure.')

  const language = (formData.get('language') as string) === 'ar' ? 'ar' : 'en'
  const label = (formData.get('label') as string)?.trim() || null
  const maxRaw = (formData.get('maxBookings') as string)?.trim()
  const maxBookings = maxRaw ? Math.max(1, parseInt(maxRaw, 10)) : null

  const { error } = await admin.from('booking_links').insert({
    departure_id: departureId,
    language,
    label,
    max_bookings: Number.isFinite(maxBookings as number) ? maxBookings : null,
    created_by: user.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/departures/${departureId}`)
}

// Enable/disable a link without deleting it (preserves the URL you already sent).
export async function toggleBookingLink(formData: FormData) {
  const { admin } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  const id = (formData.get('id') as string)?.trim()
  const active = (formData.get('active') as string) === 'true'
  if (!departureId || !id) throw new Error('Missing link.')

  const { error } = await admin
    .from('booking_links')
    .update({ is_active: active })
    .eq('id', id)
    .eq('departure_id', departureId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/departures/${departureId}`)
}

export async function deleteBookingLink(formData: FormData) {
  const { admin } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  const id = (formData.get('id') as string)?.trim()
  if (!departureId || !id) throw new Error('Missing link.')

  const { error } = await admin
    .from('booking_links')
    .delete()
    .eq('id', id)
    .eq('departure_id', departureId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/departures/${departureId}`)
}
