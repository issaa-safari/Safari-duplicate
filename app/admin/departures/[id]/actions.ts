'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { loadDeparturePublishingReadiness } from '@/lib/departure-publishing'

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
  if (!Number.isInteger(maxSeats) || maxSeats < 1) throw new Error('Capacity must be at least one seat.')
  if (priceUsd != null && (isNaN(priceUsd) || priceUsd < 0)) throw new Error('Sharing price is invalid.')
  if (priceSingleUsd != null && (isNaN(priceSingleUsd) || priceSingleUsd < 0)) throw new Error('Single room price is invalid.')
  if (priceUsd == null && priceSingleUsd == null) throw new Error('Set at least one price — sharing, single room, or both.')
  if (isNaN(securityDepositUsd) || securityDepositUsd < 0) throw new Error('Security deposit cannot be negative.')

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)

  const { data: existingDeparture, error: departureError } = await admin
    .from('departures')
    .select('booked_seats')
    .eq('id', id)
    .single()

  if (departureError || !existingDeparture) throw new Error('Trip could not be found.')
  if (maxSeats < existingDeparture.booked_seats) {
    throw new Error(`Capacity cannot be lower than the ${existingDeparture.booked_seats} seats already booked.`)
  }

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

  const { data: departure } = await admin
    .from('departures')
    .select('kind, is_public')
    .eq('id', id)
    .single()

  if (!departure) throw new Error('Departure not found.')
  if (departure.kind === 'private_custom') throw new Error('Private custom trips cannot be published.')

  if (!departure.is_public) {
    const { blockers } = await loadDeparturePublishingReadiness(admin, id)
    if (blockers.length > 0) {
      throw new Error(`Cannot publish: ${blockers.join('; ')}.`)
    }
  }

  const { error } = await admin
    .from('departures')
    .update({ is_public: !departure.is_public })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/departures')
  revalidatePath(`/admin/departures/${id}`)
  revalidatePath('/departures')
  revalidatePath('/')
}
