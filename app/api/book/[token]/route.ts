import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createDepartureBooking } from '@/lib/server/create-booking'
import { enforceRateLimit } from '@/lib/rate-limit'

// Self-service booking submission behind a shareable link token. The link
// resolves to a departure; from there it reuses the exact same booking pipeline
// as an on-site website booking (createDepartureBooking).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = enforceRateLimit(request, 'book-link', 5, 60_000)
  if (limited) return limited

  try {
    const { token } = await params
    const { travellers, totalPrice, currency } = await request.json()

    const admin = createAdminClient()

    const { data: link } = await admin
      .from('booking_links')
      .select('id, departure_id, is_active, expires_at, max_bookings, use_count')
      .eq('token', token)
      .maybeSingle()

    if (!link) return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 404 })
    if (!link.is_active) return NextResponse.json({ error: 'This booking link has been disabled.' }, { status: 410 })
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This booking link has expired.' }, { status: 410 })
    }
    if (link.max_bookings != null && link.use_count >= link.max_bookings) {
      return NextResponse.json({ error: 'This booking link has reached its limit.' }, { status: 410 })
    }

    const result = await createDepartureBooking(admin, link.departure_id, {
      travellers,
      totalPrice,
      currency,
      source: 'booking_link',
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    // Best-effort: bump the link's use counter (optimistic — not fatal if it races).
    try {
      await admin
        .from('booking_links')
        .update({ use_count: link.use_count + 1 })
        .eq('id', link.id)
    } catch { /* counter is advisory */ }

    return NextResponse.json({
      success: true,
      bookingId: result.bookingId,
      message: 'Booking confirmed successfully',
    })
  } catch (error) {
    console.error('[book-link] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
