import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { findOrCreateClientByEmail, refreshClientTotals } from '@/lib/server/clients'
import { sendEmail, notifyAdmin, emailShell, detailRows, escapeHtml } from '@/lib/email'
import { enforceRateLimit } from '@/lib/rate-limit'
import { site } from '@/lib/site'
import type { BookingTraveller } from '@/lib/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = enforceRateLimit(request, 'book', 5, 60_000)
  if (limited) return limited

  try {
    const { id } = await params
    const { travellers, totalPrice, currency } = await request.json()

    if (!id || !travellers || travellers.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // 1. Resolve the departure — fetch tour_id up front (required for request attribution)
    const { data: departure, error: fetchError } = await admin
      .from('departures')
      .select('id, tour_id, max_seats, booked_seats')
      .eq('id', id)
      .single()

    if (fetchError || !departure) {
      return NextResponse.json({ error: 'Departure not found' }, { status: 404 })
    }

    const groupSize = travellers.length
    const availableSpots = departure.max_seats - departure.booked_seats

    if (groupSize > availableSpots) {
      return NextResponse.json(
        { error: 'Not enough available spots for this group size' },
        { status: 400 }
      )
    }

    // 2. Reserve the seats atomically. The .eq('booked_seats', ...) check makes
    // this an optimistic-concurrency compare-and-swap: if another request has
    // booked in the meantime, booked_seats will have moved and this update
    // affects zero rows, so we can detect and reject the conflict instead of
    // overselling.
    const { data: reserved, error: reserveError } = await admin
      .from('departures')
      .update({ booked_seats: departure.booked_seats + groupSize })
      .eq('id', id)
      .eq('booked_seats', departure.booked_seats)
      .select('id')

    if (reserveError) {
      console.error('[book] seat reservation failed', reserveError)
      return NextResponse.json({ error: 'Failed to reserve seats' }, { status: 500 })
    }
    if (!reserved || reserved.length === 0) {
      return NextResponse.json(
        { error: 'These spots were just booked by someone else — please refresh and try again.' },
        { status: 409 }
      )
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
          .eq('id', id)
          .single()
        if (!current) return
        await admin
          .from('departures')
          .update({ booked_seats: Math.max(0, current.booked_seats - groupSize) })
          .eq('id', id)
          .eq('booked_seats', current.booked_seats)
      } catch { /* best-effort release */ }
    }

    // 3. Resolve the client — mandatory; abort if this fails
    const lead = travellers[0]
    let clientId: string
    try {
      clientId = await findOrCreateClientByEmail(admin, {
        email: lead?.email,
        first_name: lead?.firstName,
        last_name: lead?.lastName,
        phone: lead?.phone,
      })
    } catch (err) {
      console.error('[book] client resolution failed', err)
      await releaseSeats()
      return NextResponse.json(
        { error: 'Could not identify client — please check the lead traveller email.' },
        { status: 500 }
      )
    }

    // 4. Create a tracked request for attribution before the booking row exists
    const { data: newRequest, error: requestError } = await admin
      .from('requests')
      .insert({
        client_id: clientId,
        tour_id: departure.tour_id ?? null,
        stage: 'booked',
        source: 'website',
        travelers_adults: groupSize,
      })
      .select('id')
      .single()

    if (requestError) {
      console.error('[book] request creation failed', requestError)
      // Not fatal — proceed without request attribution rather than block the booking
    }

    // 5. Create booking with client_id + departure_id set from the start
    const { data: booking, error: bookingError } = await admin
      .from('bookings')
      .insert({
        departure_id: id,
        client_id: clientId,
        number_of_travellers: groupSize,
        total_price_usd: totalPrice,
        status: 'confirmed',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (bookingError || !booking) {
      await releaseSeats()
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // 6. Insert traveller records
    const travellerRecords = travellers.map((t: BookingTraveller & { firstName?: string; lastName?: string; dateOfBirth?: string; passportNumber?: string; nationality?: string }) => ({
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
      return NextResponse.json(
        { error: 'Failed to save traveller information' },
        { status: 500 }
      )
    }

    // Best-effort: finance stub (requires group_25 migration)
    try {
      await admin.from('booking_payments').insert({
        booking_id: booking.id,
        amount_usd: totalPrice,
        status: 'pending',
        notes: 'Website booking',
      })
    } catch { /* finance record is non-critical */ }

    // Best-effort: link to auth user if signed in (requires group_22 migration)
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await admin.from('bookings').update({ user_id: user.id }).eq('id', booking.id)
      }
    } catch { /* dashboard falls back to email match */ }

    // Best-effort: refresh client totals
    try {
      await refreshClientTotals(admin, clientId)
    } catch { /* totals are a convenience cache */ }

    // Best-effort: email notifications (never block or fail the booking)
    const leadName = `${lead?.firstName ?? ''} ${lead?.lastName ?? ''}`.trim()
    const bookingRows = detailRows([
      ['Lead traveller', leadName],
      ['Email', lead?.email],
      ['Phone', lead?.phone],
      ['Travellers', groupSize],
      ['Total (USD)', totalPrice],
      ['Booking ID', booking.id],
    ])
    await notifyAdmin(
      `New booking — ${leadName || lead?.email || 'website'} (${groupSize} traveller${groupSize > 1 ? 's' : ''})`,
      emailShell(
        'New website booking',
        bookingRows +
          `<p style="margin:16px 0 0;font-size:14px"><a href="${site.url}/admin/bookings/${booking.id}">Open in admin</a></p>`
      ),
      lead?.email
    )
    if (lead?.email) {
      await sendEmail({
        to: lead.email,
        subject: `Your booking with ${site.name} is confirmed`,
        html: emailShell(
          'Booking confirmed 🎉',
          `<p style="margin:0 0 16px;font-size:14px">Thank you${leadName ? `, ${escapeHtml(leadName)}` : ''}! Your booking is confirmed. Our team will contact you shortly with payment and preparation details.</p>` +
            bookingRows +
            `<p style="margin:16px 0 0;font-size:14px">Questions? Reply to this email or WhatsApp us at ${site.phoneDisplay}.</p>`
        ),
        replyTo: site.email,
      })
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      message: 'Booking confirmed successfully',
    })
  } catch (error) {
    console.error('[book] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
