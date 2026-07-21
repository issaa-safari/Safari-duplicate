// Google Routes API road distances (server-only, optional).
//
// Used when saving a quote itinerary to store the driving distance of each
// leg between consecutive stops (quote_days.road_distance_km). Falls back to
// null on any failure — the proposal then shows the straight-line estimate
// from lib/geo.ts haversineKm, exactly as before. Same key as the Places
// (New) search; the key must have "Routes API" enabled in Google Cloud.
//
// All calls must stay server-side: the CSP connect-src allows only self +
// Supabase, so the browser can never call Google directly.

import type { LatLng } from './geo'

const apiKey = () => process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY

export const isRoutesEnabled = () => !!apiKey()

// Legs repeat across saves of the same itinerary — cache per coord pair for a
// day. Coordinates are rounded so tiny float drift doesn't miss the cache.
// Only *successful* distances are cached: a transient failure must not poison
// the leg for 24h, and callers should retry it on the next save. A soft cap
// keeps the map from growing without bound on a long-lived process.
const routeCache = new Map<string, { at: number; km: number }>()
const ROUTE_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const ROUTE_CACHE_MAX = 2000
const keyOf = (a: LatLng, b: LatLng) =>
  [a.lat.toFixed(4), a.lng.toFixed(4), b.lat.toFixed(4), b.lng.toFixed(4)].join(',')

/**
 * Driving distance in km between two points via the Routes API.
 * Null when no key is configured, on any HTTP/network failure, or when no
 * drivable route exists — callers treat null as "fall back to straight line"
 * and (for null) should not overwrite a previously stored value.
 */
export async function computeRoadKm(origin: LatLng, dest: LatLng): Promise<number | null> {
  const key = apiKey()
  if (!key) return null

  const cacheKey = keyOf(origin, dest)
  const hit = routeCache.get(cacheKey)
  if (hit && Date.now() - hit.at < ROUTE_CACHE_TTL_MS) return hit.km

  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
        travelMode: 'DRIVE',
      }),
    })
    if (!res.ok) throw new Error(`computeRoutes HTTP ${res.status}`)
    const json = await res.json()
    const meters = json?.routes?.[0]?.distanceMeters
    const km = typeof meters === 'number' && meters > 0 ? meters / 1000 : null
    // Cache only real results; leave transient/no-route nulls uncached so the
    // next save retries them.
    if (km != null) {
      if (routeCache.size >= ROUTE_CACHE_MAX) routeCache.clear()
      routeCache.set(cacheKey, { at: Date.now(), km })
    }
    return km
  } catch (err) {
    console.warn('[google-routes] computeRoutes failed:', err instanceof Error ? err.message : err)
    return null
  }
}
