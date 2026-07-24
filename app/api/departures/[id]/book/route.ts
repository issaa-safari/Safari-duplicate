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
    const { travellers, totalPrice, currency } = await request.json()

    const admin = createAdminClient()

    // Link the booking to the signed-in portal user, if any.
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
    } catch { /* anonymous booking */ }

    const result = await createDepartureBooking(admin, id, {
      travellers,
      totalPrice,
      currency,
      userId,
      source: 'website',
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
