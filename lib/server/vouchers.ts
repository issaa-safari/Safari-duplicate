// Hotel-voucher generation.
//
// Walks a confirmed itinerary, groups consecutive nights at the same hotel into
// a single stay, and creates one hotel_vouchers row per stay — pre-filled with
// check-in/check-out dates, a sensible room count and the travellers as guests.
// The admin can then edit each voucher (rooms, room type, hotel email, special
// requests) and send it.
//
// Three entry points share the same insert core, each anchoring the voucher to
// what it was generated from:
//   * buildVouchersForDeparture — group vouchers for a fixed departure; guests
//     are every confirmed traveller across all of the departure's bookings.
//   * buildVouchersForBooking    — vouchers scoped to a single booking; guests
//     are just that booking's travellers.
//   * buildVouchersForQuote      — vouchers from an accepted quote's itinerary
//     (quote_days → accommodation items); guests are the quote's travellers.
//
// Generation is idempotent: a stay that already has a voucher for the same
// anchor + hotel + check-in is skipped, so re-running only fills gaps.

import type { SupabaseClient } from '@supabase/supabase-js'

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// A hotel stay resolved to everything a voucher row needs. accommodationId may
// be null when the itinerary named the hotel free-hand (quote snapshots).
type Stay = {
  accommodationId: string | null
  hotelName: string
  startOffset: number   // nights since trip start (0-based)
  nights: number
}

type Anchor = { departure_id: string | null; booking_id: string | null; quote_id: string | null }

type Guests = { guestNames: string[]; numGuests: number; numRooms: number; roomType: string | null }

export interface VoucherGenerationResult {
  created: number
  skipped: number
  stays: number
}

// Group a per-night sequence of (offset → hotel) into consecutive stays. `key`
// distinguishes hotels — an accommodation id where we have one, else the name.
function groupStays(
  nights: Array<{ offset: number; accommodationId: string | null; hotelName: string }>,
): Stay[] {
  const ordered = [...nights].sort((a, b) => a.offset - b.offset)
  const stays: Stay[] = []
  for (const n of ordered) {
    const key = n.accommodationId ?? n.hotelName
    const prev = stays[stays.length - 1]
    const prevKey = prev ? (prev.accommodationId ?? prev.hotelName) : null
    if (prev && prevKey === key && prev.startOffset + prev.nights === n.offset) {
      prev.nights += 1
    } else {
      stays.push({ accommodationId: n.accommodationId, hotelName: n.hotelName, startOffset: n.offset, nights: 1 })
    }
  }
  return stays
}

// Shared insert step: build one draft row per stay and insert the ones that
// don't exist yet (idempotent per anchor).
async function insertVouchers(
  admin: SupabaseClient,
  opts: { stays: Stay[]; startDate: string; anchor: Anchor; guests: Guests },
): Promise<VoucherGenerationResult> {
  const { stays, startDate, anchor, guests } = opts
  if (stays.length === 0) return { created: 0, skipped: 0, stays: 0 }

  // Existing vouchers for this exact anchor, for idempotency. Each anchor type
  // compares only against its own vouchers, so the three never clobber each
  // other even when they cover the same trip.
  let existingQuery = admin.from('hotel_vouchers').select('accommodation_id, hotel_name, check_in')
  if (anchor.booking_id) existingQuery = existingQuery.eq('booking_id', anchor.booking_id)
  else if (anchor.quote_id) existingQuery = existingQuery.eq('quote_id', anchor.quote_id).is('booking_id', null)
  else existingQuery = existingQuery.eq('departure_id', anchor.departure_id!).is('booking_id', null).is('quote_id', null)
  const { data: existing } = await existingQuery
  const have = new Set(
    ((existing ?? []) as Array<{ accommodation_id: string | null; hotel_name: string; check_in: string }>)
      .map(v => `${v.accommodation_id ?? v.hotel_name}|${v.check_in}`),
  )

  const rows = stays
    .map(stay => {
      const checkIn = addDays(startDate, stay.startOffset)
      const checkOut = addDays(startDate, stay.startOffset + stay.nights)
      return {
        departure_id: anchor.departure_id,
        booking_id: anchor.booking_id,
        quote_id: anchor.quote_id,
        accommodation_id: stay.accommodationId,
        hotel_name: stay.hotelName || 'Hotel',
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
    .filter(row => !have.has(`${row.accommodation_id ?? row.hotel_name}|${row.check_in}`))

  if (rows.length === 0) {
    return { created: 0, skipped: stays.length, stays: stays.length }
  }

  const { error } = await admin.from('hotel_vouchers').insert(rows)
  if (error) throw new Error(error.message)

  return { created: rows.length, skipped: stays.length - rows.length, stays: stays.length }
}

// Walk a tour's itinerary (tour_days.accommodation_id, which may span several
// days) into resolved hotel stays.
async function staysForTour(admin: SupabaseClient, tourId: string): Promise<Stay[]> {
  const { data: days } = await admin
    .from('tour_days')
    .select('day_number, day_number_end, accommodation_id')
    .eq('tour_id', tourId)
    .order('day_number', { ascending: true })

  const nights: Array<{ offset: number; accommodationId: string; hotelName: string }> = []
  for (const day of days ?? []) {
    if (!day.accommodation_id) continue
    const first = day.day_number
    const last = day.day_number_end && day.day_number_end >= day.day_number ? day.day_number_end : day.day_number
    for (let n = first; n <= last; n++) {
      nights.push({ offset: n - 1, accommodationId: day.accommodation_id, hotelName: '' })
    }
  }
  if (nights.length === 0) return []

  const accIds = [...new Set(nights.map(n => n.accommodationId))]
  const { data: accs } = await admin.from('accommodations').select('id, name').in('id', accIds)
  const accName = new Map(((accs ?? []) as Array<{ id: string; name: string }>).map(a => [a.id, a.name]))
  for (const n of nights) n.hotelName = accName.get(n.accommodationId) ?? 'Hotel'

  return groupStays(nights)
}

// Turn a plain traveller list (first/last name + room hints) into guest names
// plus room/room-type estimates.
function summariseTravellers(
  travellers: Array<{ first_name: string | null; last_name: string | null; room_label: string | null; room_type: string | null }>,
): Guests {
  const guestNames = travellers
    .map(t => `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim())
    .filter(Boolean)
  const numGuests = Math.max(1, guestNames.length)
  const distinctRooms = new Set(travellers.map(t => t.room_label).filter(Boolean))
  const numRooms = distinctRooms.size > 0 ? distinctRooms.size : Math.max(1, Math.ceil(numGuests / 2))
  const roomTypes = new Set(travellers.map(t => t.room_type).filter(Boolean))
  const roomType = roomTypes.size === 1 ? [...roomTypes][0] : null
  return { guestNames, numGuests, numRooms, roomType }
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

  const { data: bookings } = await admin
    .from('bookings')
    .select('status, booking_travellers ( first_name, last_name, room_label, room_type )')
    .eq('departure_id', departureId)

  type TravellerRow = { first_name: string | null; last_name: string | null; room_label: string | null; room_type: string | null }
  type BookingRow = { status: string; booking_travellers: TravellerRow[] | null }
  const travellers: TravellerRow[] = []
  for (const b of (bookings ?? []) as BookingRow[]) {
    if (b.status === 'cancelled') continue
    for (const t of b.booking_travellers ?? []) travellers.push(t)
  }

  return insertVouchers(admin, {
    stays,
    startDate: departure.start_date,
    anchor: { departure_id: departureId, booking_id: null, quote_id: null },
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
  const travellers = (booking.booking_travellers ?? []) as Array<{
    first_name: string | null; last_name: string | null; room_label: string | null; room_type: string | null
  }>

  return insertVouchers(admin, {
    stays,
    startDate: departure.start_date,
    anchor: { departure_id: booking.departure_id, booking_id: bookingId, quote_id: null },
    guests: summariseTravellers(travellers),
  })
}

export async function buildVouchersForQuote(
  admin: SupabaseClient,
  quoteId: string,
): Promise<VoucherGenerationResult> {
  const { data: quote } = await admin
    .from('quotes')
    .select('id, accepted_version_id')
    .eq('id', quoteId)
    .single()
  if (!quote) throw new Error('Quote not found.')

  // Prefer the accepted version; fall back to any version marked accepted.
  let versionId = quote.accepted_version_id as string | null
  if (!versionId) {
    const { data: acceptedVersion } = await admin
      .from('quote_versions')
      .select('id')
      .eq('quote_id', quoteId)
      .eq('status', 'accepted')
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    versionId = acceptedVersion?.id ?? null
  }
  if (!versionId) throw new Error('Accept a quote version before generating vouchers.')

  const { data: version } = await admin
    .from('quote_versions')
    .select('id, travel_start_date')
    .eq('id', versionId)
    .single()
  if (!version?.travel_start_date) {
    throw new Error('The accepted quote has no travel start date — set it on the quote first.')
  }

  const { data: days } = await admin
    .from('quote_days')
    .select('id, day_number')
    .eq('quote_version_id', versionId)
    .order('day_number', { ascending: true })
  const dayIds = (days ?? []).map(d => d.id)
  if (dayIds.length === 0) return { created: 0, skipped: 0, stays: 0 }

  const { data: items } = await admin
    .from('quote_day_items')
    .select('quote_day_id, accommodation_id, title_snapshot, sort_order')
    .eq('item_type', 'accommodation')
    .in('quote_day_id', dayIds)
    .order('sort_order', { ascending: true })

  // First accommodation item per day (by sort order) = that night's hotel.
  const hotelByDay = new Map<string, { accommodationId: string | null; hotelName: string }>()
  for (const it of (items ?? []) as Array<{ quote_day_id: string; accommodation_id: string | null; title_snapshot: string | null }>) {
    if (hotelByDay.has(it.quote_day_id)) continue
    hotelByDay.set(it.quote_day_id, {
      accommodationId: it.accommodation_id ?? null,
      hotelName: it.title_snapshot?.trim() || 'Hotel',
    })
  }

  // Prefer the library name when the item links to an accommodation record.
  const accIds = [...new Set(
    [...hotelByDay.values()].map(h => h.accommodationId).filter((v): v is string => !!v),
  )]
  if (accIds.length > 0) {
    const { data: accs } = await admin.from('accommodations').select('id, name').in('id', accIds)
    const accName = new Map(((accs ?? []) as Array<{ id: string; name: string }>).map(a => [a.id, a.name]))
    for (const h of hotelByDay.values()) {
      if (h.accommodationId && accName.has(h.accommodationId)) h.hotelName = accName.get(h.accommodationId)!
    }
  }

  const nights: Array<{ offset: number; accommodationId: string | null; hotelName: string }> = []
  for (const day of days ?? []) {
    const hotel = hotelByDay.get(day.id)
    if (!hotel) continue // day with no accommodation (e.g. departure day)
    nights.push({ offset: day.day_number - 1, accommodationId: hotel.accommodationId, hotelName: hotel.hotelName })
  }
  const stays = groupStays(nights)

  const { data: travellers } = await admin
    .from('quote_travellers')
    .select('display_name, room_category')
    .eq('quote_version_id', versionId)
  const names = ((travellers ?? []) as Array<{ display_name: string | null; room_category: string | null }>)
    .map(t => t.display_name?.trim())
    .filter((v): v is string => !!v)
  const numGuests = Math.max(1, names.length)
  const singles = ((travellers ?? []) as Array<{ room_category: string | null }>)
    .filter(t => t.room_category === 'single').length
  const shared = Math.max(0, numGuests - singles)
  const numRooms = Math.max(1, singles + Math.ceil(shared / 2))

  return insertVouchers(admin, {
    stays,
    startDate: version.travel_start_date,
    anchor: { departure_id: null, booking_id: null, quote_id: quoteId },
    guests: { guestNames: names, numGuests, numRooms, roomType: null },
  })
}
