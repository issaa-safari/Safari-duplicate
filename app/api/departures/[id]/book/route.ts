import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createDepartureBooking } from '@/lib/server/create-booking'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = enforceRateLimit(request, 'book', 5, 60_000)
  if (limited) return limited

  try {
    const { id } = await params
    // Pricing is resolved server-side from the departure record — see the note
    // in lib/server/create-booking.ts. Anything the client sends about price is
    // ignored rather than trusted; roomType only selects which of the
    // departure's own prices applies.
    const { travellers, roomType } = await request.json()

    const admin = createAdminClient()

    // Do not let a guessed URL book a departure whose tour is hidden or no
    // longer on sale. Public list, detail, booking page and POST now use the
    // same eligibility rules.
    const { data: eligibleDeparture, error: eligibilityError } = await admin
      .from('departures')
      .select('id, tours!inner(id)')
      .eq('id', id)
      .eq('kind', 'scheduled_group')
      .eq('is_active', true)
      .eq('is_public', true)
      .eq('tours.status', 'active')
      .eq('tours.show_on_website', true)
      .maybeSingle()

    if (eligibilityError) {
      console.error('[book] departure eligibility check failed', eligibilityError)
      return NextResponse.json({ error: 'Unable to verify departure availability' }, { status: 500 })
    }
    if (!eligibleDeparture) {
      return NextResponse.json({ error: 'Departure not found or unavailable' }, { status: 404 })
    }

    // Link the booking to the signed-in portal user, if any.
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
    } catch { /* anonymous booking */ }

    const result = await createDepartureBooking(admin, id, {
      travellers,
      userId,
      source: 'website',
      roomType: roomType === 'single' ? 'single' : 'sharing',
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      bookingId: result.bookingId,
      message: 'Booking confirmed successfully',
    })
  } catch (error) {
    console.error('[book] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
