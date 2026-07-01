'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function updateDeparture(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string
  const maxSeats = parseInt(formData.get('maxSeats') as string) || 1
  const priceUsd = parseFloat(formData.get('priceUsd') as string)
  const status = (formData.get('status') as string) || 'available'
  const internalNotes = formData.get('internalNotes') as string

  if (!startDate || !endDate) throw new Error('Start and end dates are required.')
  if (new Date(endDate) < new Date(startDate)) throw new Error('End date cannot be before start date.')
  if (isNaN(priceUsd)) throw new Error('Price is required.')

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  const { error } = await admin
    .from('departures')
    .update({
      start_date: startDate,
      end_date: endDate,
      max_seats: maxSeats,
      price_usd: priceUsd,
      status,
      internal_notes: internalNotes || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  redirect('/admin/departures')
}

export async function toggleDeparturePublished(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)

  // Get current state
  const { data: departure } = await admin
    .from('departures')
    .select('is_active')
    .eq('id', id)
    .single()

  if (!departure) throw new Error('Departure not found.')

  // Toggle
  const { error } = await admin
    .from('departures')
    .update({ is_active: !departure.is_active })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/departures')
}
