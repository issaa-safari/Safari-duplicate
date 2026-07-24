import type { SupabaseClient } from '@supabase/supabase-js'
import { refreshClientTotals } from '@/lib/server/clients'

// The subset of quote_travellers a booking row is seeded from.
type QuoteTravellerRow = {
  display_name: string | null
  room_category: string | null
  dietary_requirements: string | null
  allergies: string | null
}

function splitName(display: string | null | undefined): { first: string | null; last: string | null } {
  const s = (display ?? '').trim()
  if (!s) return { first: null, last: null }
  const parts = s.split(/\s+/)
  if (parts.length === 1) return { first: parts[0], last: null }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

// Turn an accepted quote into a confirmed booking (idempotent — one booking per
// quote), including per-traveller rows so the booking is manifest-ready. Shared
// by the public /api/quote/accept route and the admin "accept on behalf" action.
// Requires group_27 (bookings.quote_id) and group_66/67/68 (traveller columns).
export async function createBookingFromAcceptedQuote(
  admin: SupabaseClient,
  quoteId: string,
  versionId: string,
): Promise<void> {
  // Idempotency — one booking per quote.
  const { data: existing } = await admin
    .from('bookings').select('id').eq('quote_id', quoteId).limit(1).maybeSingle()
  if (existing?.id) return

  const { data: quote } = await admin
    .from('quotes').select('client_id, departure_id').eq('id', quoteId).single()

  // A booking must have a client. Guard explicitly so the failure is named.
  if (!quote?.client_id) {
    console.error('[quote-booking] skipped — quote has no client_id', { quoteId, versionId })
    return
  }

  const [{ data: version }, { data: quoteTravellers }, { data: client }] = await Promise.all([
    admin.from('quote_versions').select('total_selling_usd').eq('id', versionId).single(),
    admin.from('quote_travellers')
      .select('display_name, traveller_category, room_category, dietary_requirements, allergies, sort_order')
      .eq('quote_version_id', versionId)
      .order('sort_order'),
    admin.from('clients').select('first_name, last_name, email, phone').eq('id', quote.client_id).single(),
  ])

  const travellers = quoteTravellers ?? []
  const numTravellers = Math.max(1, travellers.length)
  const total = Number(version?.total_selling_usd ?? 0)

  const { data: booking } = await admin
    .from('bookings')
    .insert({
      quote_id: quoteId,
      client_id: quote.client_id,
      departure_id: quote.departure_id ?? null,
      number_of_travellers: numTravellers,
      total_price_usd: total,
      status: 'confirmed',
    })
    .select('id')
    .single()
  if (!booking) return

  // Per-traveller rows. Only the lead carries the client's contact details;
  // the rest start with what the quote knows (name/room/dietary) and are
  // completed later on the manifest. Columns are nullable since group_68.
  const source: (QuoteTravellerRow | null)[] =
    travellers.length > 0 ? (travellers as QuoteTravellerRow[]) : [null]
  const rows = source.map((qt, i) => {
    const nm = splitName(qt?.display_name)
    const isLead = i === 0
    return {
      booking_id: booking.id,
      first_name: nm.first ?? (isLead ? client?.first_name ?? null : null),
      last_name: nm.last ?? (isLead ? client?.last_name ?? null : null),
      email: isLead ? client?.email ?? null : null,
      phone: isLead ? client?.phone ?? null : null,
      room_type: qt?.room_category ?? null,
      dietary_requirements: qt?.dietary_requirements ?? null,
      allergies: qt?.allergies ?? null,
      is_rider: true,
    }
  })
  try {
    await admin.from('booking_travellers').insert(rows)
  } catch (e) {
    console.error('[quote-booking] traveller rows skipped', e)
  }

  // Best-effort: finance stub.
  try {
    await admin.from('booking_payments').insert({
      booking_id: booking.id, amount_usd: total, status: 'pending', notes: 'Accepted quote',
    })
  } catch { /* finance record is non-critical */ }

  // Best-effort: seat reservation on the linked departure.
  if (quote.departure_id) {
    try {
      const { data: dep } = await admin
        .from('departures').select('booked_seats').eq('id', quote.departure_id).single()
      if (dep) {
        await admin.from('departures')
          .update({ booked_seats: (dep.booked_seats ?? 0) + numTravellers })
          .eq('id', quote.departure_id)
          .eq('booked_seats', dep.booked_seats)
      }
    } catch { /* seat reservation is non-critical */ }
  }

  // Best-effort: refresh client totals.
  try {
    await refreshClientTotals(admin, quote.client_id)
  } catch { /* totals are a convenience cache */ }
}
