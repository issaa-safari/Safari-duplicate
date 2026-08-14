// When a trip runs, from whichever of the two places holds that answer.
//
// Dates used to live only on `departures`. Since group_78 a booking need not
// have one, and group_79 gave bookings their own `start_date` / `end_date` for
// exactly that case. This module is the one place that decides between them, so
// the admin list, the booking screen and the client dashboard cannot disagree.
//
// Pure, like lib/balance.ts and lib/invoice.ts. Nothing here fetches.

export interface DatedBooking {
  start_date?: string | null
  end_date?: string | null
  /** The joined departure, when the booking is a seat on one. */
  departures?: { start_date?: string | null; end_date?: string | null } | null
}

export interface TripDates {
  startDate: string | null
  endDate: string | null
  /** Which side answered — useful for copy, and for spotting an undated trip. */
  source: 'departure' | 'booking' | 'none'
}

const clean = (v: string | null | undefined): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? null : s
}

/**
 * The departure wins whenever the booking is on one.
 *
 * Not "whichever is set": a seat on a scheduled departure runs when that
 * departure runs, and letting a booking hold a second, editable answer is how
 * two travellers on the same trip end up printing different dates. The
 * booking's own columns are the fallback for a trip that has no departure at
 * all — which is why the New Booking form only offers them then.
 */
export function resolveTripDates(booking: DatedBooking | null | undefined): TripDates {
  const departure = booking?.departures ?? null

  const depStart = clean(departure?.start_date)
  const depEnd = clean(departure?.end_date)
  if (depStart || depEnd) {
    return { startDate: depStart, endDate: depEnd, source: 'departure' }
  }

  const ownStart = clean(booking?.start_date)
  const ownEnd = clean(booking?.end_date)
  if (ownStart || ownEnd) {
    return { startDate: ownStart, endDate: ownEnd, source: 'booking' }
  }

  return { startDate: null, endDate: null, source: 'none' }
}

export type TripTiming = 'upcoming' | 'past' | 'undated'

/**
 * Where a trip sits relative to today.
 *
 * `undated` is its own answer rather than being folded into either side. The
 * client dashboard used to test `new Date(departure?.end_date) > new Date()`,
 * and every comparison against an Invalid Date is false — so an undated booking
 * was neither upcoming nor completed and disappeared from the client's account
 * entirely. A trip whose dates are not agreed yet is still a trip they booked.
 *
 * A trip with a start but no end is judged on its start date: a one-day trip
 * that has not started yet is upcoming.
 */
export function tripTiming(dates: TripDates, today: Date = new Date()): TripTiming {
  const boundary = dates.endDate ?? dates.startDate
  if (!boundary) return 'undated'

  // Compare whole days: a trip ending today has not finished yet.
  const end = new Date(`${boundary}T23:59:59`)
  if (isNaN(end.getTime())) return 'undated'

  return end.getTime() >= today.getTime() ? 'upcoming' : 'past'
}

/** Convenience for the common "resolve, then classify" pair. */
export function bookingTiming(booking: DatedBooking, today?: Date): TripTiming {
  return tripTiming(resolveTripDates(booking), today)
}
