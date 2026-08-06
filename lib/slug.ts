// Tour URLs accept either the slug (canonical) or the UUID (what every link
// used before slugs existed). Callers use this to pick which column to match,
// because querying `id` with a non-UUID string is a Postgres type error rather
// than an empty result.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (value: string): boolean => UUID_RE.test(value)

/** Canonical public path segment for a tour: its slug, or the id as fallback. */
export const tourSegment = (tour: { slug?: string | null; id: string }): string =>
  tour.slug && tour.slug.trim() !== '' ? tour.slug : tour.id
