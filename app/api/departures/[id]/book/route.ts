import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // Check current availability
    const { data: departure, error: fetchError } = await admin
      .from('departures')
      .select('id, max_seats, booked_seats')
      .eq('id', id)
      .single()

    if (fetchError || !departure) {
      return NextResponse.json(
        { error: 'Departure not found' },
        { status: 404 }
      )
    }

    const groupSize = travellers.length
    const availableSpots = departure.max_seats - departure.booked_seats

    if (groupSize > availableSpots) {
      return NextResponse.json(
        { error: 'Not enough available spots for this group size' },
        { status: 400 }
      )
    }

    // Create booking record
    const { data: booking, error: bookingError } = await admin
      .from('bookings')
      .insert({
        departure_id: id,
        number_of_travellers: groupSize,
        total_price_usd: totalPrice,
        status: 'confirmed',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (bookingError) {
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      )
    }

    // Insert traveller records
    const travellerRecords = travellers.map((t: any) => ({
      booking_id: booking.id,
      first_name: t.firstName,
      last_name: t.lastName,
      email: t.email,
      phone: t.phone,
      date_of_birth: t.dateOfBirth,
      nationality: t.nationality,
      passport_number: t.passportNumber,
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

    // Update booked seats in departure
    const newBookedSeats = departure.booked_seats + groupSize
    const { error: updateError } = await admin
      .from('departures')
      .update({ booked_seats: newBookedSeats })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update availability' },
        { status: 500 }
      )
    }

    // TODO: Send booking confirmation email to first traveller's email

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      message: 'Booking confirmed successfully'
    })
  } catch (error) {
    console.error('Booking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
