// Coordinate helpers for the itinerary map and content-library geo capture.
//
// The free path: staff paste a Google Maps link into the content forms and we
// extract lat/lng from the URL itself — no API key, no billing. The optional
// Google enrichment (lib/google-places.ts) can fill the same columns later.

export type LatLng = { lat: number; lng: number }

const inRange = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180

/**
 * Extract coordinates from a pasted Google Maps URL.
 *
 * Handles the common shapes:
 *  - place pin:  …!3d-1.2920659!4d36.8219462…   (most precise — the marker)
 *  - query:      …?q=-1.29,36.82 / ?query=… / ?ll=… / ?destination=…
 *  - viewport:   …/@-1.2920659,36.8219462,12z   (fallback — the map centre)
 *
 * Returns null when nothing parseable is found or values are out of range.
 */
export function parseLatLngFromMapsUrl(url: string | null | undefined): LatLng | null {
  if (!url) return null
  const s = decodeURIComponent(String(url))

  const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)'
  const patterns = [
    new RegExp(`!3d${NUM}!4d${NUM}`),                       // place marker
    new RegExp(`[?&](?:q|query|ll|destination)=${NUM}\\s*,\\s*${NUM}`), // explicit query coords
    new RegExp(`/@${NUM},${NUM}`),                          // viewport centre
  ]
  for (const re of patterns) {
    const m = s.match(re)
    if (m) {
      const lat = parseFloat(m[1])
      const lng = parseFloat(m[2])
      if (inRange(lat, lng)) return { lat, lng }
    }
  }
  return null
}

/**
 * Read the shared location fields (googleMapsUrl / latitude / longitude /
 * googlePlaceId) from a content-form submission into DB column values.
 * Explicit lat/lng wins; otherwise coordinates are parsed from the pasted
 * Maps link. Invalid or partial input degrades to null rather than failing
 * the save.
 */
export function geoColumnsFromForm(formData: FormData): {
  google_maps_url: string | null
  latitude: number | null
  longitude: number | null
  google_place_id: string | null
} {
  const url = ((formData.get('googleMapsUrl') as string) ?? '').trim() || null
  const placeId = ((formData.get('googlePlaceId') as string) ?? '').trim() || null
  const latRaw = ((formData.get('latitude') as string) ?? '').trim()
  const lngRaw = ((formData.get('longitude') as string) ?? '').trim()
  let lat: number | null = latRaw ? Number(latRaw) : null
  let lng: number | null = lngRaw ? Number(lngRaw) : null
  if ((lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) && url) {
    const parsed = parseLatLngFromMapsUrl(url)
    if (parsed) { lat = parsed.lat; lng = parsed.lng }
  }
  if (lat == null || lng == null || !inRange(lat, lng)) { lat = null; lng = null }
  return { google_maps_url: url, latitude: lat, longitude: lng, google_place_id: placeId }
}

/**
 * Client-facing Google Maps link for a content record: the stored URL when
 * present, else one built from the place id, else one built from the saved
 * coordinates, else null. The coordinate fallback means any accommodation or
 * destination with a located pin is clickable, even without a pasted link.
 */
export function googleMapsLinkFor(
  row:
    | { google_maps_url?: string | null; google_place_id?: string | null; latitude?: number | null; longitude?: number | null }
    | null
    | undefined,
): string | null {
  if (!row) return null
  if (row.google_maps_url) return row.google_maps_url
  if (row.google_place_id) return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(row.google_place_id)}`
  if (typeof row.latitude === 'number' && typeof row.longitude === 'number' && inRange(row.latitude, row.longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${row.latitude},${row.longitude}`
  }
  return null
}

/** Great-circle distance in kilometres (straight line, not road distance). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// ── Web-Mercator projection (for the OSM tile map) ────────────────────────

/** Project to world pixel coordinates at a given zoom (256px tiles). */
export function mercatorPx(p: LatLng, zoom: number): { x: number; y: number } {
  const scale = 256 * 2 ** zoom
  const x = ((p.lng + 180) / 360) * scale
  const sinLat = Math.sin((p.lat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  return { x, y }
}

/**
 * Largest zoom (clamped to [minZoom, maxZoom]) at which all points fit inside
 * width×height pixels, leaving `padding` px around the edge for pin markers.
 */
export function fitZoom(
  points: LatLng[],
  width: number,
  height: number,
  { padding = 48, minZoom = 2, maxZoom = 12 }: { padding?: number; minZoom?: number; maxZoom?: number } = {},
): number {
  for (let z = maxZoom; z > minZoom; z--) {
    const xs = points.map(p => mercatorPx(p, z).x)
    const ys = points.map(p => mercatorPx(p, z).y)
    const w = Math.max(...xs) - Math.min(...xs)
    const h = Math.max(...ys) - Math.min(...ys)
    if (w <= width - padding * 2 && h <= height - padding * 2) return z
  }
  return minZoom
}
