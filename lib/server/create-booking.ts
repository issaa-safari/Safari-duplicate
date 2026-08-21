// Shared departure-booking pipeline.
//
// Used by both the website booking endpoint (/api/departures/:id/book) and the
// token-linked self-service booking form (/api/book/:token). Keeping this in one
// place means WhatsApp booking links and on-site bookings behave identically:
// same atomic seat reservation, client resolution, request attribution,
// traveller records, finance stub and confirmation emails.

import type { SupabaseClient } from '@supabase/supabase-js'
import { findOrCreateClientByEmail, refreshClientTotals } from '@/lib/server/clients'
import { sendEmail, notifyAdmin, emailShell, detailRows, escapeHtml } from '@/lib/email'
import { site } from '@/lib/site'

export interface IncomingTraveller {
  firstName?: string
  lastName?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  dateOfBirth?: string
  date_of_birth?: string
  nationality?: string
  passportNumber?: string
  passport_number?: string
}

export interface CreateBookingInput {
  travellers: IncomingTraveller[]
  userId?: string | null
  source?: string
  /** 'single' only takes effect when the departure has a price_single_usd; otherwise falls back to the sharing price. */
  roomType?: 'sharing' | 'single'
}

export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; status: number; error: string }

export async function createDepartureBooking(
  admin: SupabaseClient,
  departureId: string,
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const { travellers, userId, source, roomType } = input

  if (!departureId || !travellers || travellers.length === 0) {
    return { ok: false, status: 400, error: 'Missing required fields' }
  }

  // 1. Resolve the departure — fetch tour_id up front (required for request
  // attribution), and price_usd / price_single_usd / security_deposit_usd so
  // the money is priced from what is actually on sale rather than trusted
  // from the request body. A prior version took `totalPrice` straight off
  // the client, which made the amount charged for a website booking whatever
  // the visitor's browser sent.
  const { data: departure, error: fetchError } = await admin
    .from('departures')
    .select('id, tour_id, max_seats, booked_seats, price_usd, price_single_usd, security_deposit_usd')
    .eq('id', departureId)
    .single()

  if (fetchError || !departure) {
    return { ok: false, status: 404, error: 'Departure not found' }
  }

  // A single-room price only applies if the departure actually offers one;
  // otherwise every booking is priced at the sharing rate regardless of what
  // room type was requested.
  const usingSingle = roomType === 'single' && departure.price_single_usd != null
  const pricePerPerson = usingSingle ? Number(departure.price_single_usd) : Number(departure.price_usd)
  const bookedRoomType: 'sharing' | 'single' | null = departure.price_single_usd != null
    ? (usingSingle ? 'single' : 'sharing')
    : null

  const groupSize = travellers.length
  const totalPrice = pricePerPerson * groupSize
  const depositDue = Number(departure.security_deposit_usd ?? 0) * groupSize
  const availableSpots = departure.max_seats - departure.booked_seats

  if (groupSize > availableSpots) {
    return { ok: false, status: 400, error: 'Not enough available spots for this group size' }
  }

  // 2. Reserve the seats atomically. The .eq('booked_seats', ...) check makes
  // this an optimistic-concurrency compare-and-swap: if another request has
  // booked in the meantime, booked_seats will have moved and this update
  // affects zero rows, so we can detect and reject the conflict instead of
  // overselling.
  const { data: reserved, error: reserveError } = await admin
    .from('departures')
    .update({ booked_seats: departure.booked_seats + groupSize })
    .eq('id', departureId)
    .eq('booked_seats', departure.booked_seats)
    .select('id')

  if (reserveError) {
    console.error('[book] seat reservation failed', reserveError)
    return { ok: false, status: 500, error: 'Failed to reserve seats' }
  }
  if (!reserved || reserved.length === 0) {
    return {
      ok: false,
      status: 409,
      error: 'These spots were just booked by someone else — please refresh and try again.',
    }
  }

  // From here on, seats are reserved. Any fatal failure below must release
  // them again so we don't leak booked_seats without a matching booking.
  // Re-read the current value and CAS it down rather than resetting to the
  // pre-reservation snapshot, so we don't clobber a seat count that moved
  // due to another concurrent (successful) booking in the meantime.
  const releaseSeats = async () => {
    try {
      const { data: current } = await admin
        .from('departures')
        .select('booked_seats')
        .eq('id', departureId)
        .single()
      if (!current) return
      await admin
        .from('departures')
        .update({ booked_seats: Math.max(0, current.booked_seats - groupSize) })
        .eq('id', departureId)
        .eq('booked_seats', current.booked_seats)
    } catch { /* best-effort release */ }
  }

  // 3. Resolve the client — mandatory; abort if this fails
  const lead = travellers[0]
  let clientId: string
  try {
    clientId = await findOrCreateClientByEmail(admin, {
      email: lead?.email,
      first_name: lead?.firstName ?? lead?.first_name,
      last_name: lead?.lastName ?? lead?.last_name,
      phone: lead?.phone,
    })
  } catch (err) {
    console.error('[book] client resolution failed', err)
    await releaseSeats()
    return {
      ok: false,
      status: 500,
      error: 'Could not identify client — please check the lead traveller email.',
    }
  }

  // 4. Create a tracked request for attribution before the booking row exists
  const { error: requestError } = await admin
    .from('requests')
    .insert({
      client_id: clientId,
      tour_id: departure.tour_id ?? null,
      stage: 'booked',
      source: source ?? 'website',
      travelers_adults: groupSize,
    })

  if (requestError) {
    console.error('[book] request creation failed', requestError)
    // Not fatal — proceed without request attribution rather than block the booking
  }

  // 5. Create booking with client_id + departure_id set from the start
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      departure_id: departureId,
      client_id: clientId,
      number_of_travellers: groupSize,
      total_price_usd: totalPrice,
      deposit_due_usd: depositDue,
      room_type: bookedRoomType,
      status: 'confirmed',
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (bookingError || !booking) {
    await releaseSeats()
    return { ok: false, status: 500, error: 'Failed to create booking' }
  }

  // 6. Insert traveller records
  const travellerRecords = travellers.map((t) => ({
    booking_id: booking.id,
    first_name: t.firstName ?? t.first_name,
    last_name: t.lastName ?? t.last_name,
    email: t.email,
    phone: t.phone,
    date_of_birth: t.dateOfBirth ?? t.date_of_birth,
    nationality: t.nationality,
    passport_number: t.passportNumber ?? t.passport_number,
  }))

  const { error: travellerError } = await admin
    .from('booking_travellers')
    .insert(travellerRecords)

  if (travellerError) {
    await releaseSeats()
    return { ok: false, status: 500, error: 'Failed to save traveller information' }
  }

  // No finance row here — see the note in lib/server/quote-booking.ts. The
  // amount owed comes from the booking itself; the ledger holds receipts only.

  // Best-effort: link to auth user if one was supplied (requires group_22 migration)
  if (userId) {
    try {
      await admin.from('bookings').update({ user_id: userId }).eq('id', booking.id)
    } catch { /* dashboard falls back to email match */ }
  }

  // Best-effort: refresh client totals
  try {
    await refreshClientTotals(admin, clientId)
  } catch { /* totals are a convenience cache */ }

  // Best-effort: email notifications (never block or fail the booking)
  const leadName = `${lead?.firstName ?? lead?.first_name ?? ''} ${lead?.lastName ?? lead?.last_name ?? ''}`.trim()
  const bookingRows = detailRows([
    ['Lead traveller', leadName],
    ['Email', lead?.email],
    ['Phone', lead?.phone],
    ['Travellers', groupSize],
    ['Trip total (USD)', totalPrice],
    ['Refundable security deposit (USD)', depositDue > 0 ? depositDue : null],
    ['Booking ID', booking.id],
  ])
  await notifyAdmin(
    `New booking — ${leadName || lead?.email || 'website'} (${groupSize} traveller${groupSize > 1 ? 's' : ''})`,
    emailShell(
      'New booking',
      bookingRows +
        `<p style="margin:16px 0 0;font-size:14px"><a href="${site.url}/admin/bookings/${booking.id}">Open in admin</a></p>`,
    ),
    lead?.email,
  )
  if (lead?.email) {
    const depositNote = depositDue > 0
      ? `<p style="margin:0 0 16px;font-size:14px">This trip carries a refundable security deposit of $${depositDue.toLocaleString()}, held against damage to the bike and returned in full at the end of the trip.</p>`
      : ''
    await sendEmail({
      to: lead.email,
      subject: `Your booking with ${site.name} is confirmed`,
      html: emailShell(
        'Booking confirmed 🎉',
        `<p style="margin:0 0 16px;font-size:14px">Thank you${leadName ? `, ${escapeHtml(leadName)}` : ''}! Your booking is confirmed. Our team will contact you shortly with payment and preparation details.</p>` +
          bookingRows +
          depositNote +
          `<p style="margin:16px 0 0;font-size:14px">Questions? Reply to this email or WhatsApp us at ${site.phoneDisplay}.</p>`,
      ),
      replyTo: site.email,
    })
  }

  return { ok: true, bookingId: booking.id }
}
