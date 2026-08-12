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

/**
 * Manually create a booking from the admin back office.
 *
 * A departure is optional (group_78). With one, this behaves as it always has —
 * the staff-side equivalent of /api/departures/[id]/book, with the same
 * optimistic seat reservation so it cannot oversell. Without one, there are no
 * seats to reserve and none of that runs: the booking is a private trip, or one
 * taken against an enquiry before anything is scheduled.
 *
 * The client is resolved in the order the operator's intent is most explicit:
 * a client they picked, then the request's client, then the lead traveller's
 * email. All three may be absent, and `bookings.client_id` is nullable, so a
 * booking can be recorded before anyone knows who it is for.
 */
export async function createManualBooking(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)

  const departureId = (formData.get('departureId') as string)?.trim() || null
  const requestId = (formData.get('requestId') as string)?.trim() || null
  const pickedClientId = (formData.get('clientId') as string)?.trim() || null
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

  // The head count stands on its own: a booking can be for four people whose
  // names are not known yet. bookings_number_of_travellers_check demands > 0.
  const declaredCount = parseInt((formData.get('travellerCount') as string) ?? '', 10)
  const groupSize = Math.max(
    travellers.length,
    !isNaN(declaredCount) && declaredCount > 0 ? declaredCount : 1
  )

  if (isNaN(totalPrice) || totalPrice < 0) throw new Error('Enter a valid total price.')
  if (deposit > totalPrice) throw new Error('Deposit cannot exceed the total price.')

  const lead = travellers[0]

  // Something has to identify the booking. Without a departure, a client, a
  // request or a named traveller there is nothing to find it by later.
  if (!departureId && !requestId && !pickedClientId && !lead) {
    throw new Error(
      'Give the booking something to hang on: a departure, a request, a client, or at least one traveller.'
    )
  }

  // 1. Resolve the departure and reserve seats — only when there is one.
  let departure: { id: string; max_seats: number; booked_seats: number } | null = null
  if (departureId) {
    const { data } = await admin
      .from('departures')
      .select('id, max_seats, booked_seats')
      .eq('id', departureId)
      .single()
    if (!data) throw new Error('Departure not found.')
    departure = data

    if (groupSize > departure.max_seats - departure.booked_seats) {
      throw new Error('Not enough seats left on this departure for that many travellers.')
    }

    // Optimistic compare-and-swap — rejects on concurrent oversell.
    const { data: reserved } = await admin
      .from('departures')
      .update({ booked_seats: departure.booked_seats + groupSize })
      .eq('id', departureId)
      .eq('booked_seats', departure.booked_seats)
      .select('id')
    if (!reserved || reserved.length === 0) {
      throw new Error('Seats just changed — please refresh and try again.')
    }
  }

  const releaseSeats = async () => {
    if (!departureId) return
    try {
      const { data: current } = await admin
        .from('departures').select('booked_seats').eq('id', departureId).single()
      if (!current) return
      await admin.from('departures')
        .update({ booked_seats: Math.max(0, current.booked_seats - groupSize) })
        .eq('id', departureId).eq('booked_seats', current.booked_seats)
    } catch { /* best-effort release */ }
  }

  // 2. Resolve the client, most explicit intent first.
  let clientId: string | null = pickedClientId
  if (!clientId && requestId) {
    const { data: request } = await admin
      .from('requests').select('client_id').eq('id', requestId).maybeSingle()
    clientId = (request?.client_id as string | null) ?? null
  }
  if (!clientId && lead?.email?.trim()) {
    try {
      clientId = await findOrCreateClientByEmail(admin, {
        email: lead.email, first_name: lead.firstName, last_name: lead.lastName, phone: lead.phone,
      })
    } catch (err) {
      await releaseSeats()
      throw new Error(err instanceof Error ? err.message : 'Could not resolve the client.')
    }
  }

  // 3. Create the booking.
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      departure_id: departureId,
      request_id: requestId,
      client_id: clientId,
      number_of_travellers: groupSize,
      total_price_usd: totalPrice,
      status,
    })
    .select('id')
    .single()
  if (bookingError || !booking) {
    await releaseSeats()
    throw new Error(bookingError?.message ?? 'Failed to create the booking.')
  }

  // 4. Insert whatever traveller detail was given. None is allowed — the head
  //    count above is what the booking is actually sized by.
  if (travellers.length > 0) {
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
  }

  // Best-effort: record the deposit actually taken at booking time. Only that —
  // the outstanding balance used to be written as a 'pending' row, which read
  // like a payment in every total that summed the table. The balance is derived
  // now (lib/server/accounting.ts), so the ledger holds receipts only.
  if (deposit > 0) {
    try {
      await admin.from('trip_payments').insert({
        booking_id: booking.id,
        amount_usd: deposit,
        payment_type: 'deposit',
        method: depositMethod || null,
        reference: depositReference || null,
        notes: 'Deposit at booking (admin)',
        created_by: user.id,
      })
    } catch { /* finance record is non-critical */ }
  }
  if (clientId) {
    try { await refreshClientTotals(admin, clientId) } catch { /* totals are a cache */ }
  }

  redirect(`/admin/bookings/${booking.id}`)
}
