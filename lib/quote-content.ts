// Per-proposal copy overrides.
//
// A proposal's destination / hotel / activity descriptions are looked up live
// in the Content library, so every proposal using a record shares its text.
// The Preview content editor can instead write text that belongs to one
// proposal only; it rides in the jsonb snapshot column already attached to the
// row (`quote_days.destination_snapshot`, `quote_day_items.content_snapshot`),
// under the key for the proposal's language.
//
// Overrides win over the library — that is the whole point of overriding — and
// a blank override is treated as absent so the library still shows through.

export function overrideDescription(snapshot: unknown, isArabic: boolean): string | null {
  if (typeof snapshot !== 'object' || snapshot === null) return null
  const key = isArabic ? 'description_ar' : 'description_en'
  const value = (snapshot as Record<string, unknown>)[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** First non-empty candidate, in priority order. */
export function firstFilled(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c
  }
  return null
}
