'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'

export async function createDeparture(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const tourId = formData.get('tourId') as string
  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string
  const maxSeats = parseInt(formData.get('maxSeats') as string) || 12
  const bookedSeats = parseInt(formData.get('bookedSeats') as string) || 0
  const priceUsd = parseFloat(formData.get('priceUsd') as string)
  const priceSingleRaw = (formData.get('priceSingleUsd') as string)?.trim()
  const priceSingleUsd = priceSingleRaw ? parseFloat(priceSingleRaw) : null
  const depositRaw = (formData.get('securityDepositUsd') as string)?.trim()
  const securityDepositUsd = depositRaw ? parseFloat(depositRaw) : 0
  const status = (formData.get('status') as string) || 'available'
  const internalNotes = formData.get('internalNotes') as string

  if (!tourId) throw new Error('Please select a tour.')
  if (!startDate || !endDate) throw new Error('Start and end dates are required.')
  if (new Date(endDate) < new Date(startDate)) throw new Error('End date cannot be before start date.')
  if (isNaN(priceUsd)) throw new Error('Price is required.')
  if (priceSingleUsd != null && (isNaN(priceSingleUsd) || priceSingleUsd < 0)) throw new Error('Single room price is invalid.')
  if (isNaN(securityDepositUsd) || securityDepositUsd < 0) throw new Error('Security deposit cannot be negative.')
  if (bookedSeats > maxSeats) throw new Error('Booked seats cannot exceed max seats.')

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  const { data: newDep, error } = await admin
    .from('departures')
    .insert({
      tour_id: tourId,
      start_date: startDate,
      end_date: endDate,
      max_seats: maxSeats,
      booked_seats: bookedSeats,
      price_usd: priceUsd,
      price_single_usd: priceSingleUsd,
      security_deposit_usd: securityDepositUsd,
      status,
      internal_notes: internalNotes || null,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  redirect(`/admin/departures`)
}