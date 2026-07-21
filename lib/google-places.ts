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

// Places API (New) text search — prefers its own key (restricted to
// "Places API (New)" + "Routes API" in Google Cloud) and falls back to the
// legacy key so a single-key setup keeps working.
const newApiKey = () => process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY

export const isGooglePlacesEnabled = () => !!apiKey()

export const isPlacesSearchEnabled = () => !!newApiKey()

export type PlaceSearchResult = {
  placeId: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  rating: number | null
}

// Repeated admin searches for the same property are common — cache for a day.
const searchCache = new Map<string, { at: number; results: PlaceSearchResult[] }>()
const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Places API (New) Text Search, biased to Kenya. Returns up to 5 results.
 * Field mask is intentionally limited to id/name/address/location/rating —
 * adding photos or reviews moves billing to the Enterprise SKU.
 * Throws on HTTP/network failure so the API route can surface a message;
 * returns [] for no matches.
 */
export async function searchPlacesText(query: string): Promise<PlaceSearchResult[]> {
  const key = newApiKey()
  const q = query.trim()
  if (!key || !q) return []

  const cacheKey = q.toLowerCase()
  const hit = searchCache.get(cacheKey)
  if (hit && Date.now() - hit.at < SEARCH_CACHE_TTL_MS) return hit.results

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating',
    },
    body: JSON.stringify({
      textQuery: q,
      languageCode: 'en',
      pageSize: 5,
      // Rectangle roughly covering Kenya (the operator's main territory).
      locationBias: {
        rectangle: {
          low: { latitude: -4.9, longitude: 33.9 },
          high: { latitude: 4.7, longitude: 41.9 },
        },
      },
    }),
  })
  if (!res.ok) throw new Error(`places searchText HTTP ${res.status}`)
  const json = await res.json()
  type RawPlace = {
    id?: string
    displayName?: { text?: string }
    formattedAddress?: string | null
    location?: { latitude?: number; longitude?: number }
    rating?: number
  }
  const results: PlaceSearchResult[] = ((json?.places ?? []) as RawPlace[])
    .slice(0, 5)
    .map(p => ({
      placeId: String(p.id ?? ''),
      name: String(p.displayName?.text ?? ''),
      address: p.formattedAddress ?? null,
      lat: typeof p.location?.latitude === 'number' ? p.location.latitude : null,
      lng: typeof p.location?.longitude === 'number' ? p.location.longitude : null,
      rating: typeof p.rating === 'number' ? p.rating : null,
    }))
    .filter(p => p.placeId && p.name)
  searchCache.set(cacheKey, { at: Date.now(), results })
  return results
}

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
