import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { findOrCreateClientByEmail, refreshClientTotals } from '@/lib/server/clients'
import type { BookingTraveller } from '@/lib/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 2. Resolve the client — mandatory; abort if this fails
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
      return NextResponse.json(
        { error: 'Could not identify client — please check the lead traveller email.' },
        { status: 500 }
      )
    }

    // 3. Create a tracked request for attribution before the booking row exists
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

    // 4. Create booking with client_id + departure_id set from the start
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
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // 5. Insert traveller records
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
      return NextResponse.json(
        { error: 'Failed to save traveller information' },
        { status: 500 }
      )
    }

    // 6. Update booked seats — required for availability accuracy
    const { error: updateError } = await admin
      .from('departures')
      .update({ booked_seats: departure.booked_seats + groupSize })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
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
