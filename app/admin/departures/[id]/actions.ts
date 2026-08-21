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
  const priceRaw = (formData.get('priceUsd') as string)?.trim()
  const priceUsd = priceRaw ? parseFloat(priceRaw) : null
  const priceSingleRaw = (formData.get('priceSingleUsd') as string)?.trim()
  const priceSingleUsd = priceSingleRaw ? parseFloat(priceSingleRaw) : null
  const depositRaw = (formData.get('securityDepositUsd') as string)?.trim()
  const securityDepositUsd = depositRaw ? parseFloat(depositRaw) : 0
  const status = (formData.get('status') as string) || 'available'
  const internalNotes = formData.get('internalNotes') as string

  if (!startDate || !endDate) throw new Error('Start and end dates are required.')
  if (new Date(endDate) < new Date(startDate)) throw new Error('End date cannot be before start date.')
  if (priceUsd != null && (isNaN(priceUsd) || priceUsd < 0)) throw new Error('Sharing price is invalid.')
  if (priceSingleUsd != null && (isNaN(priceSingleUsd) || priceSingleUsd < 0)) throw new Error('Single room price is invalid.')
  if (priceUsd == null && priceSingleUsd == null) throw new Error('Set at least one price — sharing, single room, or both.')
  if (isNaN(securityDepositUsd) || securityDepositUsd < 0) throw new Error('Security deposit cannot be negative.')

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  const { error } = await admin
    .from('departures')
    .update({
      start_date: startDate,
      end_date: endDate,
      max_seats: maxSeats,
      price_usd: priceUsd,
      price_single_usd: priceSingleUsd,
      security_deposit_usd: securityDepositUsd,
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
