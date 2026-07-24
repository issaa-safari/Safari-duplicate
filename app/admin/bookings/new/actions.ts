'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { findOrCreateClientByEmail, refreshClientTotals } from '@/lib/server/clients'
import { redirect } from 'next/navigation'

type TravellerInput = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  nationality?: string
  passportNumber?: string
  dateOfBirth?: string
  isRider?: boolean
  emergencyContact?: string
}

// Manually create a booking against a departure from the admin back office —
// the staff-side equivalent of the public /api/departures/[id]/book flow, with
// the same optimistic seat reservation so it can't oversell.
export async function createManualBooking(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)

  const departureId = (formData.get('departureId') as string)?.trim()
  const status = (formData.get('status') as string) === 'pending' ? 'pending' : 'confirmed'
  const totalPrice = parseFloat((formData.get('totalPrice') as string) ?? '')
  const depositRaw = parseFloat((formData.get('deposit') as string) ?? '')
  const deposit = !isNaN(depositRaw) && depositRaw > 0 ? depositRaw : 0
  const depositMethod = (formData.get('depositMethod') as string)?.trim() || null
  const depositReference = (formData.get('depositReference') as string)?.trim() || null

  let travellers: TravellerInput[] = []
  try {
    travellers = JSON.parse((formData.get('travellers') as string) || '[]')
  } catch {
    throw new Error('Could not read traveller details.')
  }
  travellers = travellers.filter(t => (t.firstName?.trim() || t.lastName?.trim() || t.email?.trim()))

  if (!departureId) throw new Error('Please choose a departure.')
  if (travellers.length === 0) throw new Error('Add at least one traveller.')
  if (isNaN(totalPrice) || totalPrice < 0) throw new Error('Enter a valid total price.')
  if (deposit > totalPrice) throw new Error('Deposit cannot exceed the total price.')

  const lead = travellers[0]
  if (!lead.email?.trim()) throw new Error('The lead traveller needs an email (used to create/link the client record).')

  // 1. Resolve the departure + current seat count.
  const { data: departure } = await admin
    .from('departures')
    .select('id, max_seats, booked_seats')
    .eq('id', departureId)
    .single()
  if (!departure) throw new Error('Departure not found.')

  const groupSize = travellers.length
  if (groupSize > departure.max_seats - departure.booked_seats) {
    throw new Error('Not enough seats left on this departure for that many travellers.')
  }

  // 2. Reserve seats (optimistic compare-and-swap — rejects on concurrent oversell).
  const { data: reserved } = await admin
    .from('departures')
    .update({ booked_seats: departure.booked_seats + groupSize })
    .eq('id', departureId)
    .eq('booked_seats', departure.booked_seats)
    .select('id')
  if (!reserved || reserved.length === 0) {
    throw new Error('Seats just changed — please refresh and try again.')
  }

  const releaseSeats = async () => {
    try {
      const { data: current } = await admin
        .from('departures').select('booked_seats').eq('id', departureId).single()
      if (!current) return
      await admin.from('departures')
        .update({ booked_seats: Math.max(0, current.booked_seats - groupSize) })
        .eq('id', departureId).eq('booked_seats', current.booked_seats)
    } catch { /* best-effort release */ }
  }

  // 3. Resolve the client from the lead traveller.
  let clientId: string
  try {
    clientId = await findOrCreateClientByEmail(admin, {
      email: lead.email, first_name: lead.firstName, last_name: lead.lastName, phone: lead.phone,
    })
  } catch (err) {
    await releaseSeats()
    throw new Error(err instanceof Error ? err.message : 'Could not resolve the client.')
  }

  // 4. Create the booking.
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      departure_id: departureId,
      client_id: clientId,
      number_of_travellers: groupSize,
      total_price_usd: totalPrice,
      status,
    })
    .select('id')
    .single()
  if (bookingError || !booking) {
    await releaseSeats()
    throw new Error('Failed to create the booking.')
  }

  // 5. Insert traveller rows.
  const rows = travellers.map(t => ({
    booking_id: booking.id,
    first_name: t.firstName?.trim() || null,
    last_name: t.lastName?.trim() || null,
    email: t.email?.trim() || null,
    phone: t.phone?.trim() || null,
    nationality: t.nationality?.trim() || null,
    passport_number: t.passportNumber?.trim() || null,
    date_of_birth: t.dateOfBirth?.trim() || null,
    is_rider: t.isRider !== false,
    emergency_contact: t.emergencyContact?.trim() || null,
  }))
  const { error: travellerError } = await admin.from('booking_travellers').insert(rows)
  if (travellerError) {
    await releaseSeats()
    await admin.from('bookings').delete().eq('id', booking.id)
    throw new Error('Failed to save traveller details.')
  }

  // Best-effort: finance records. Record a paid deposit (if any) plus the
  // outstanding balance as pending, so Finance reflects reality from the start.
  try {
    const payments: Record<string, unknown>[] = []
    if (deposit > 0) {
      payments.push({
        booking_id: booking.id, amount_usd: deposit, status: 'paid',
        method: depositMethod, reference: depositReference, notes: 'Deposit at booking (admin)',
      })
    }
    const balance = totalPrice - deposit
    if (balance > 0) {
      payments.push({
        booking_id: booking.id, amount_usd: balance, status: 'pending', notes: 'Balance (manual booking)',
      })
    }
    if (payments.length === 0) {
      payments.push({ booking_id: booking.id, amount_usd: 0, status: 'pending', notes: 'Manual booking (admin)' })
    }
    await admin.from('booking_payments').insert(payments)
  } catch { /* finance record is non-critical */ }
  try { await refreshClientTotals(admin, clientId) } catch { /* totals are a cache */ }

  redirect(`/admin/bookings/${booking.id}`)
}
