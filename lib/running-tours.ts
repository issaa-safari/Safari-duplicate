// Pure helpers for the Running Tours view — a booked trip is "running" when
// today falls within its travel window (inclusive of both ends).

/** True when `today` is on or between the travel start and end dates. */
export function isTripRunning(
  travelStart: string | null | undefined,
  travelEnd: string | null | undefined,
  now: Date | string,
): boolean {
  if (!travelStart || !travelEnd) return false
  const start = dateOnly(travelStart)
  const end = dateOnly(travelEnd)
  const today = dateOnly(now)
  return start <= today && today <= end
}

/** 1-based day number of the trip for `now` (1 on the start date). Null if not running. */
export function dayOfTrip(
  travelStart: string | null | undefined,
  travelEnd: string | null | undefined,
  now: Date | string,
): number | null {
  if (!isTripRunning(travelStart, travelEnd, now)) return null
  const start = dateOnly(travelStart!)
  const today = dateOnly(now)
  return Math.floor((today - start) / 86_400_000) + 1
}

function dateOnly(d: Date | string): number {
  const x = new Date(d)
  return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate())
}
