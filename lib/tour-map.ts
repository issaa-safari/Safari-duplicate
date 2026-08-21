// Builds the itinerary map + per-day distance for a tour's public page —
// the same logic app/quote/[token]/page.tsx uses to build a proposal's
// tour map, applied to tour_days instead of quote_days. Shared by
// app/(public)/tours/[slug]/page.tsx and app/(public)/departures/[id]/page.tsx
// so the two pages can't drift.

import { haversineKm, type LatLng } from '@/lib/geo'
import type { MapStop } from '@/components/quote/itinerary-map'

export interface TourMapDay {
  id: string
  day_number: number
  destination_id: string | null
  distance_km: number | null
  road_distance_km: number | null
}

export interface TourMapResult {
  /** One pin per stop with known coordinates; consecutive days at the same
   * destination collapse into a single pin. Render only when length >= 2. */
  mapStops: MapStop[]
  /** Leg distance into each day, keyed by tour_days.id. */
  distanceByDayId: Record<string, number | null>
  /** Sum of every known leg distance. Null when no leg could be computed
   * (e.g. no destination has coordinates yet) — callers should fall back to
   * a manually-entered tour-level total in that case, never show "0 km". */
  totalDistanceKm: number | null
}

export function buildTourMap(
  days: TourMapDay[],
  destCoordMap: Record<string, LatLng>,
  destNameMap: Record<string, string>,
): TourMapResult {
  const mapStops: MapStop[] = []
  const distanceByDayId: Record<string, number | null> = {}

  let prevDestId: string | null = null
  for (const d of days) {
    const destId = d.destination_id
    const coord = destId ? destCoordMap[destId] : undefined
    const isNewStop = !!destId && destId !== prevDestId

    if (coord && isNewStop) {
      mapStops.push({ ...coord, label: String(d.day_number), name: destId ? (destNameMap[destId] ?? '') : '' })
    }

    const prevCoord = prevDestId ? destCoordMap[prevDestId] : undefined
    const override = d.distance_km != null ? Number(d.distance_km) : null
    const roadKm = d.road_distance_km != null ? Number(d.road_distance_km) : null
    const autoKm = isNewStop && coord && prevCoord ? haversineKm(prevCoord, coord) : null
    const km = override ?? roadKm ?? autoKm
    // Round to 1dp — haversineKm returns a long float, and this is shown
    // directly to the client (ItineraryRouteLine's "Distance" chip).
    distanceByDayId[d.id] = km != null ? Math.round(km * 10) / 10 : null

    if (destId) prevDestId = destId
  }

  const knownDistances = Object.values(distanceByDayId).filter((km): km is number => km != null)
  const totalDistanceKm = knownDistances.length > 0
    ? Math.round(knownDistances.reduce((sum, km) => sum + km, 0) * 10) / 10
    : null

  return { mapStops, distanceByDayId, totalDistanceKm }
}
