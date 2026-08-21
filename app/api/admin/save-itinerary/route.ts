import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { computeRoadKm, isRoutesEnabled } from '@/lib/google-routes'
import type { LatLng } from '@/lib/geo'

// The itinerary builder's day payload, as posted to this route.
interface DayPayload {
  id?: string
  day_number: number
  day_number_end?: number | null
  title_en?: string | null
  title_ar?: string | null
  description_en?: string | null
  description_ar?: string | null
  destination_id?: string | null
  accommodation_id?: string | null
  accommodation_alt_id?: string | null
  activity_ids?: string[]
  activities?: unknown[]
  meal_breakfast?: boolean
  meal_lunch?: boolean
  meal_dinner?: boolean
  distance_km?: number | null
  road_distance_km?: number | null
  image_url?: string | null
}

// Attach the Google Maps driving distance of each leg (previous stop → this
// stop) as road_distance_km. Mirrors withRoadDistances() in
// save-quote-itinerary/route.ts, adapted to tour_days' plain destination_id
// (tours have no destination_snapshot). Best-effort: without a key,
// coordinates, or Google, days stay untouched and the public page falls back
// to the straight-line estimate (lib/tour-map.ts).
async function withRoadDistances(admin: ReturnType<typeof createAdminClient>, tourId: string, days: DayPayload[]): Promise<DayPayload[]> {
  if (!isRoutesEnabled()) return days

  const destIds = [...new Set(days.map((d) => d?.destination_id).filter(Boolean))] as string[]
  if (destIds.length < 2) return days
  const { data: dests } = await admin.from('destinations').select('id, latitude, longitude').in('id', destIds)
  const coordMap: Record<string, LatLng> = {}
  for (const d of dests ?? []) {
    if (d.latitude != null && d.longitude != null) coordMap[d.id] = { lat: d.latitude, lng: d.longitude }
  }

  // Existing stored distances, so a leg that can't be recomputed this save (a
  // transient Google failure) keeps its previous value instead of being wiped.
  const { data: prior } = await admin.from('tour_days').select('id, road_distance_km').eq('tour_id', tourId)
  const priorRoadKm: Record<string, number | null> = {}
  for (const p of prior ?? []) priorRoadKm[p.id] = p.road_distance_km

  const lastDistinctDestBefore = (i: number): string | null => {
    for (let j = i - 1; j >= 0; j--) {
      const id = days[j]?.destination_id ?? null
      if (id) return id
    }
    return null
  }

  // The legs are independent — resolve them concurrently rather than serially.
  const roadKms = await Promise.all(days.map((day, i) => {
    const destId = day?.destination_id ?? null
    const prevDestId = lastDistinctDestBefore(i)
    const isNewStop = !!destId && destId !== prevDestId
    const coord = destId ? coordMap[destId] : undefined
    const prevCoord = prevDestId ? coordMap[prevDestId] : undefined
    return isNewStop && coord && prevCoord ? computeRoadKm(prevCoord, coord) : Promise.resolve(null)
  }))

  return days.map((day, i) => {
    const fresh = roadKms[i]
    const dayId = typeof day?.id === 'string' ? day.id : null
    // Fresh value wins; on null keep the previously stored value (avoids
    // clobbering good data when a single leg's lookup transiently fails).
    const value = fresh != null ? Math.round(fresh * 10) / 10 : (dayId ? priorRoadKm[dayId] ?? null : null)
    return { ...day, road_distance_km: value }
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tourId, days } = (await request.json()) as { tourId?: string; days: DayPayload[] }
  if (!tourId) return NextResponse.json({ error: 'Missing tourId' }, { status: 400 })

  const admin = createAdminClient()
  try {
    await assertAdminAccess(admin, user.email)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isUuid = (v: unknown): v is string =>
    typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)

  // Delete existing days for this tour that are no longer present
  const keepIds = days.filter((d) => isUuid(d.id)).map((d) => d.id)
  let delQuery = admin.from('tour_days').delete().eq('tour_id', tourId)
  if (keepIds.length > 0) {
    delQuery = delQuery.not('id', 'in', `(${keepIds.join(',')})`)
  }
  const { error: delErr } = await delQuery
  if (delErr) {
    console.error('[save-itinerary] delete failed', delErr)
    return NextResponse.json({ error: 'Failed to save itinerary' }, { status: 500 })
  }

  // Upsert each day
  const enrichedDays = await withRoadDistances(admin, tourId, days)
  for (const d of enrichedDays) {
    const row = {
      tour_id: tourId,
      day_number: d.day_number,
      day_number_end: d.day_number_end || null,
      // An empty title stays empty. Storing filler here published it to
      // customers as if it were real content; the public pages fall back to
      // the day label instead, and admin shows 'No title set'.
      title_en: (d.title_en && d.title_en.trim()) || null,
      title_ar: d.title_ar || null,
      description_en: d.description_en || null,
      description_ar: d.description_ar || null,
      destination_id: d.destination_id || null,
      accommodation_id: d.accommodation_id || null,
      accommodation_alt_id: d.accommodation_alt_id || null,
      activity_ids: d.activity_ids || [],
      activities: Array.isArray(d.activities) ? d.activities : [],
      meal_breakfast: !!d.meal_breakfast,
      meal_lunch: !!d.meal_lunch,
      meal_dinner: !!d.meal_dinner,
      distance_km: d.distance_km ?? null,
      road_distance_km: d.road_distance_km ?? null,
      image_url: d.image_url ?? null,
      updated_at: new Date().toISOString(),
    }
    if (isUuid(d.id)) {
      const { error } = await admin.from('tour_days').update(row).eq('id', d.id)
      if (error) {
        console.error('[save-itinerary] update failed', error)
        return NextResponse.json({ error: 'Failed to save itinerary' }, { status: 500 })
      }
    } else {
      const { error } = await admin.from('tour_days').insert(row)
      if (error) {
        console.error('[save-itinerary] insert failed', error)
        return NextResponse.json({ error: 'Failed to save itinerary' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ success: true })
}
