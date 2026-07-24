// Hotel-voucher generation.
//
// Walks a confirmed itinerary (tour_days.accommodation_id), groups consecutive
// nights at the same hotel into a single stay, and creates one hotel_vouchers
// row per stay — pre-filled with check-in/check-out dates, a sensible room count
// and the confirmed travellers as guests. The admin can then edit each voucher
// (rooms, room type, hotel email, special requests) and send it.
//
// Two entry points share the same core:
//   * buildVouchersForDeparture — group vouchers for a fixed departure; guests
//     are every confirmed traveller across all of the departure's bookings.
//   * buildVouchersForBooking    — vouchers scoped to a single booking; guests
//     are just that booking's travellers, and each row is tagged with booking_id
//     so it shows up under both the departure and the individual booking.
//
// Generation is idempotent: a stay that already has a voucher for the same
// anchor (departure or booking) + accommodation + check-in is skipped, so
// re-running after adding travellers only fills gaps.

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

type Stay = { accommodationId: string; startOffset: number; nights: number }

export interface VoucherGenerationResult {
  created: number
  skipped: number
  stays: number
}

type TravellerRow = {
  first_name: string | null
  last_name: string | null
  room_label: string | null
  room_type: string | null
}

// Walk a tour's itinerary and collapse it into hotel stays (consecutive nights
// at the same accommodation grouped together), ordered by check-in.
async function staysForTour(admin: SupabaseClient, tourId: string): Promise<Stay[]> {
  const { data: days } = await admin
    .from('tour_days')
    .select('day_number, day_number_end, accommodation_id')
    .eq('tour_id', tourId)
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

  const stays: Stay[] = []
  for (const slot of slots) {
    const prev = stays[stays.length - 1]
    if (prev && prev.accommodationId === slot.accommodationId && prev.startOffset + prev.nights === slot.offset) {
      prev.nights += 1
    } else {
      stays.push({ accommodationId: slot.accommodationId, startOffset: slot.offset, nights: 1 })
    }
  }
  return stays
}

// Turn a list of travellers into a guest-name list plus room/room-type estimates.
function summariseTravellers(travellers: TravellerRow[]) {
  const guestNames = travellers
    .map(t => `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim())
    .filter(Boolean)
  const numGuests = Math.max(1, guestNames.length)
  const distinctRooms = new Set(travellers.map(t => t.room_label).filter(Boolean))
  const numRooms = distinctRooms.size > 0
    ? distinctRooms.size
    : Math.max(1, Math.ceil(numGuests / 2)) // sensible default: double occupancy
  const roomTypes = new Set(travellers.map(t => t.room_type).filter(Boolean))
  const roomType = roomTypes.size === 1 ? [...roomTypes][0] : null
  return { guestNames, numGuests, numRooms, roomType }
}

// Shared insert step: resolve hotel names, build one draft row per stay, and
// insert the ones that don't exist yet (idempotent per anchor).
async function insertVouchers(
  admin: SupabaseClient,
  opts: {
    stays: Stay[]
    startDate: string
    departureId: string
    bookingId: string | null
    guests: ReturnType<typeof summariseTravellers>
  },
): Promise<VoucherGenerationResult> {
  const { stays, startDate, departureId, bookingId, guests } = opts
  if (stays.length === 0) return { created: 0, skipped: 0, stays: 0 }

  const accIds = [...new Set(stays.map(s => s.accommodationId))]
  const { data: accs } = await admin
    .from('accommodations')
    .select('id, name')
    .in('id', accIds)
  const accName = new Map(
    ((accs ?? []) as Array<{ id: string; name: string }>).map(a => [a.id, a.name]),
  )

  // Existing vouchers for this exact anchor, for idempotency. A booking-scoped
  // regen only compares against booking-scoped vouchers; a departure regen only
  // against departure-group vouchers — so the two never clobber each other.
  const existingQuery = admin
    .from('hotel_vouchers')
    .select('accommodation_id, check_in')
  const { data: existing } = bookingId
    ? await existingQuery.eq('booking_id', bookingId)
    : await existingQuery.eq('departure_id', departureId).is('booking_id', null)
  const have = new Set(
    ((existing ?? []) as Array<{ accommodation_id: string; check_in: string }>)
      .map(v => `${v.accommodation_id}|${v.check_in}`),
  )

  const rows = stays
    .map(stay => {
      const checkIn = addDays(startDate, stay.startOffset)
      const checkOut = addDays(startDate, stay.startOffset + stay.nights)
      return {
        departure_id: departureId,
        booking_id: bookingId,
        accommodation_id: stay.accommodationId,
        hotel_name: accName.get(stay.accommodationId) ?? 'Hotel',
        check_in: checkIn,
        check_out: checkOut,
        nights: stay.nights,
        num_rooms: guests.numRooms,
        room_type: guests.roomType,
        num_guests: guests.numGuests,
        guest_names: guests.guestNames,
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

  const stays = await staysForTour(admin, departure.tour_id)

  // Confirmed travellers across every booking on this departure → shared guests.
  const { data: bookings } = await admin
    .from('bookings')
    .select('status, booking_travellers ( first_name, last_name, room_label, room_type )')
    .eq('departure_id', departureId)

  type BookingRow = { status: string; booking_travellers: TravellerRow[] | null }
  const travellers: TravellerRow[] = []
  for (const b of (bookings ?? []) as BookingRow[]) {
    if (b.status === 'cancelled') continue
    for (const t of b.booking_travellers ?? []) travellers.push(t)
  }

  return insertVouchers(admin, {
    stays,
    startDate: departure.start_date,
    departureId,
    bookingId: null,
    guests: summariseTravellers(travellers),
  })
}

export async function buildVouchersForBooking(
  admin: SupabaseClient,
  bookingId: string,
): Promise<VoucherGenerationResult> {
  const { data: booking } = await admin
    .from('bookings')
    .select('id, departure_id, status, booking_travellers ( first_name, last_name, room_label, room_type )')
    .eq('id', bookingId)
    .single()
  if (!booking) throw new Error('Booking not found.')
  if (booking.status === 'cancelled') throw new Error('This booking is cancelled.')

  const { data: departure } = await admin
    .from('departures')
    .select('id, tour_id, start_date')
    .eq('id', booking.departure_id)
    .single()
  if (!departure || !departure.start_date) {
    throw new Error('The booking’s departure has no start date.')
  }

  const stays = await staysForTour(admin, departure.tour_id)
  const travellers = (booking.booking_travellers ?? []) as TravellerRow[]

  return insertVouchers(admin, {
    stays,
    startDate: departure.start_date,
    departureId: booking.departure_id,
    bookingId,
    guests: summariseTravellers(travellers),
  })
}
