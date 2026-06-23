import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { assertAdminAccess } from '@/lib/auth/admin-access'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const tourId = typeof body.tour_id === 'string' ? body.tour_id : ''
  const startDate = typeof body.start_date === 'string' ? body.start_date : ''
  const endDate = typeof body.end_date === 'string' ? body.end_date : ''
  const maxSeats = Number(body.max_seats)
  const bookedSeats = Number(body.booked_seats ?? 0)
  const priceUsd = Number(body.price_usd)
  const status = typeof body.status === 'string' ? body.status : 'available'
  const allowedStatuses = new Set(['available', 'limited', 'full', 'closed', 'cancelled'])

  if (!tourId || !startDate || !endDate) {
    return NextResponse.json({ error: 'Tour, start date, and end date are required.' }, { status: 400 })
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: 'End date cannot be before start date.' }, { status: 400 })
  }
  if (!Number.isInteger(maxSeats) || maxSeats < 1 || !Number.isInteger(bookedSeats) || bookedSeats < 0 || bookedSeats > maxSeats) {
    return NextResponse.json({ error: 'Seat counts are invalid.' }, { status: 400 })
  }
  if (!Number.isFinite(priceUsd) || priceUsd < 0 || !allowedStatuses.has(status)) {
    return NextResponse.json({ error: 'Price or status is invalid.' }, { status: 400 })
  }

  const admin = createAdminClient()
  try {
    await assertAdminAccess(admin, user.email)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: tour } = await admin.from('tours').select('id').eq('id', tourId).single()
  if (!tour) return NextResponse.json({ error: 'Tour not found.' }, { status: 404 })

  const { data, error } = await admin
    .from('departures')
    .insert({
      tour_id: tourId,
      start_date: startDate,
      end_date: endDate,
      max_seats: maxSeats,
      booked_seats: bookedSeats,
      price_usd: priceUsd,
      status,
      internal_notes: typeof body.internal_notes === 'string' ? body.internal_notes.trim() || null : null,
      is_active: body.is_active !== false,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, id: data.id })
}
