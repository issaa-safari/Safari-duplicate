// Seat reservation on a departure (server-only).
//
// One optimistic compare-and-swap, shared by every path that moves seats:
// admin manual bookings, website bookings, and admin edit/cancel. It used to
// be written three times — read booked_seats, refuse an oversell, write it
// back guarded by `.eq('booked_seats', current)` so a concurrent write loses
// the race safely — with no mechanism to keep the copies in step.

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Reserve (positive delta) or release (negative delta) seats on a departure.
 * Refuses a reservation that would oversell; a concurrent write racing this
 * one loses the optimistic-lock guard and is reported as a conflict rather
 * than silently overwritten.
 */
export async function adjustDepartureSeats(
  admin: SupabaseClient,
  departureId: string,
  delta: number
): Promise<{ error: string | null }> {
  if (delta === 0) return { error: null }

  const { data: departure } = await admin
    .from('departures')
    .select('max_seats, booked_seats')
    .eq('id', departureId)
    .maybeSingle()
  if (!departure) return { error: 'Departure not found.' }

  const nextBooked = departure.booked_seats + delta
  if (delta > 0 && nextBooked > departure.max_seats) {
    return { error: 'Not enough seats left on this departure.' }
  }

  const { data: updated, error } = await admin
    .from('departures')
    .update({ booked_seats: Math.max(0, nextBooked) })
    .eq('id', departureId)
    .eq('booked_seats', departure.booked_seats)
    .select('id')
  if (error) return { error: error.message }
  if (!updated || updated.length === 0) {
    return { error: 'Seats just changed — please refresh and try again.' }
  }
  return { error: null }
}
