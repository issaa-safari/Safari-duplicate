// Optional Google Maps Platform enrichment (server-only).
//
// The itinerary map ships on the free path — OpenStreetMap tiles + pasted-link
// coordinates parsed by lib/geo.ts — so this module is a no-op until a key is
// configured. Setting GOOGLE_MAPS_API_KEY (see .env.example) enables:
//   geocodePlace()     — resolve a place name to lat/lng + place_id
//   fetchPlacePhotos() — photo URLs for a place_id (curated into gallery_urls)
//
// All calls must stay server-side: the CSP connect-src allows only self +
// Supabase, so the browser can never call Google directly. Failures are
// logged and swallowed (same contract as lib/email.ts) — geo enrichment must
// never break a content save.

import type { LatLng } from './geo'

const apiKey = () => process.env.GOOGLE_MAPS_API_KEY

export const isGooglePlacesEnabled = () => !!apiKey()

export type GeocodedPlace = LatLng & { placeId: string; formattedAddress: string | null }

/** Resolve a free-text place name to coordinates. Null when disabled or not found. */
export async function geocodePlace(query: string): Promise<GeocodedPlace | null> {
  const key = apiKey()
  if (!key || !query.trim()) return null
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`geocode HTTP ${res.status}`)
    const json = await res.json()
    const hit = json?.results?.[0]
    const loc = hit?.geometry?.location
    if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null
    return {
      lat: loc.lat,
      lng: loc.lng,
      placeId: hit.place_id ?? '',
      formattedAddress: hit.formatted_address ?? null,
    }
  } catch (err) {
    console.warn('[google-places] geocode failed:', err instanceof Error ? err.message : err)
    return null
  }
}

/** Photo URLs for a place. Empty when disabled, unknown, or on failure. */
export async function fetchPlacePhotos(placeId: string, maxPhotos = 4): Promise<string[]> {
  const key = apiKey()
  if (!key || !placeId) return []
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${key}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`place details HTTP ${res.status}`)
    const json = await res.json()
    const photos: { photo_reference?: string }[] = json?.result?.photos ?? []
    return photos
      .slice(0, maxPhotos)
      .map(p => p.photo_reference)
      .filter((r): r is string => !!r)
      .map(ref => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${ref}&key=${key}`)
  } catch (err) {
    console.warn('[google-places] photos failed:', err instanceof Error ? err.message : err)
    return []
  }
}
