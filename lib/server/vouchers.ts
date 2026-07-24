// Hotel-voucher generation.
//
// Walks a confirmed departure's itinerary (tour_days.accommodation_id), groups
// consecutive nights at the same hotel into a single stay, and creates one
// hotel_vouchers row per stay — pre-filled with check-in/check-out dates, a
// sensible room count and the confirmed travellers as guests. The admin can then
// edit each voucher (rooms, room type, hotel email, special requests) and send
// it. Generation is idempotent: a stay that already has a voucher
// (same departure + accommodation + check-in) is skipped, so re-running after
// adding travellers only fills gaps.

import type { SupabaseClient } from '@supabase/supabase-js'

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

interface NightSlot {
  offset: number            // nights since departure start (0-based)
  accommodationId: string
}

export interface VoucherGenerationResult {
  created: number
  skipped: number
  stays: number
}

export async function buildVouchersForDeparture(
  admin: SupabaseClient,
  departureId: string,
): Promise<VoucherGenerationResult> {
  const { data: departure } = await admin
    .from('departures')
    .select('id, tour_id, start_date')
    .eq('id', departureId)
    .single()
  if (!departure || !departure.start_date) {
    throw new Error('Departure not found or has no start date.')
  }

  const { data: days } = await admin
    .from('tour_days')
    .select('day_number, day_number_end, accommodation_id')
    .eq('tour_id', departure.tour_id)
    .order('day_number', { ascending: true })

  // Expand each itinerary day (which may span several days) into per-night slots.
  const slots: NightSlot[] = []
  for (const day of days ?? []) {
    if (!day.accommodation_id) continue
    const first = day.day_number
    const last = day.day_number_end && day.day_number_end >= day.day_number
      ? day.day_number_end
      : day.day_number
    for (let n = first; n <= last; n++) {
      slots.push({ offset: n - 1, accommodationId: day.accommodation_id })
    }
  }
  slots.sort((a, b) => a.offset - b.offset)

  // Group consecutive nights at the same accommodation into stays.
  type Stay = { accommodationId: string; startOffset: number; nights: number }
  const stays: Stay[] = []
  for (const slot of slots) {
    const prev = stays[stays.length - 1]
    if (prev && prev.accommodationId === slot.accommodationId && prev.startOffset + prev.nights === slot.offset) {
      prev.nights += 1
    } else {
      stays.push({ accommodationId: slot.accommodationId, startOffset: slot.offset, nights: 1 })
    }
  }

  if (stays.length === 0) {
    return { created: 0, skipped: 0, stays: 0 }
  }

  // Resolve hotel names.
  const accIds = [...new Set(stays.map(s => s.accommodationId))]
  const { data: accs } = await admin
    .from('accommodations')
    .select('id, name')
    .in('id', accIds)
  const accName = new Map(
    ((accs ?? []) as Array<{ id: string; name: string }>).map(a => [a.id, a.name]),
  )

  // Confirmed travellers on this departure → guests + a room-count estimate.
  const { data: bookings } = await admin
    .from('bookings')
    .select('id, status, booking_travellers ( first_name, last_name, room_label, room_type )')
    .eq('departure_id', departureId)

  type TravellerRow = {
    first_name: string | null
    last_name: string | null
    room_label: string | null
    room_type: string | null
  }
  type BookingRow = { status: string; booking_travellers: TravellerRow[] | null }

  const travellers: Array<{ name: string; room_label: string | null; room_type: string | null }> = []
  for (const b of (bookings ?? []) as BookingRow[]) {
    if (b.status === 'cancelled') continue
    for (const t of b.booking_travellers ?? []) {
      const name = `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim()
      travellers.push({ name, room_label: t.room_label ?? null, room_type: t.room_type ?? null })
    }
  }
  const guestNames = travellers.map(t => t.name).filter(Boolean)
  const numGuests = Math.max(1, guestNames.length)
  const distinctRooms = new Set(travellers.map(t => t.room_label).filter(Boolean))
  const numRooms = distinctRooms.size > 0
    ? distinctRooms.size
    : Math.max(1, Math.ceil(numGuests / 2)) // sensible default: double occupancy
  const roomTypes = new Set(travellers.map(t => t.room_type).filter(Boolean))
  const roomType = roomTypes.size === 1 ? [...roomTypes][0] : null

  // Existing vouchers for idempotency (skip stays already generated).
  const { data: existing } = await admin
    .from('hotel_vouchers')
    .select('accommodation_id, check_in')
    .eq('departure_id', departureId)
  const have = new Set(
    ((existing ?? []) as Array<{ accommodation_id: string; check_in: string }>)
      .map(v => `${v.accommodation_id}|${v.check_in}`),
  )

  const rows = stays
    .map(stay => {
      const checkIn = addDays(departure.start_date, stay.startOffset)
      const checkOut = addDays(departure.start_date, stay.startOffset + stay.nights)
      return {
        departure_id: departureId,
        accommodation_id: stay.accommodationId,
        hotel_name: accName.get(stay.accommodationId) ?? 'Hotel',
        check_in: checkIn,
        check_out: checkOut,
        nights: stay.nights,
        num_rooms: numRooms,
        room_type: roomType,
        num_guests: numGuests,
        guest_names: guestNames,
        status: 'draft' as const,
      }
    })
    .filter(row => !have.has(`${row.accommodation_id}|${row.check_in}`))

  if (rows.length === 0) {
    return { created: 0, skipped: stays.length, stays: stays.length }
  }

  const { error } = await admin.from('hotel_vouchers').insert(rows)
  if (error) throw new Error(error.message)

  return { created: rows.length, skipped: stays.length - rows.length, stays: stays.length }
}
