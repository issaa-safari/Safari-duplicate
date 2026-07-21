import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { computeRoadKm, isRoutesEnabled } from '@/lib/google-routes'
import type { LatLng } from '@/lib/geo'

// The builder's Day payload — only destinationId matters here; everything
// else passes through to the RPC untouched.
type DayPayload = { destinationId?: string | null } & Record<string, unknown>

// Attach the Google Maps driving distance of each leg (previous stop → this
// stop) as roadDistanceKm, persisted by the RPC into quote_days.road_distance_km.
// Best-effort: without a key, coordinates, or Google, days stay untouched and
// the proposal falls back to the straight-line estimate.
async function withRoadDistances(admin: ReturnType<typeof createAdminClient>, days: DayPayload[]): Promise<DayPayload[]> {
  if (!isRoutesEnabled()) return days

  const destIds = [...new Set(days.map(d => d?.destinationId).filter(Boolean))] as string[]
  if (destIds.length < 2) return days
  const { data: dests } = await admin
    .from('destinations')
    .select('id, latitude, longitude')
    .in('id', destIds)
  const coordMap: Record<string, LatLng> = {}
  for (const d of dests ?? []) {
    if (d.latitude != null && d.longitude != null) coordMap[d.id] = { lat: d.latitude, lng: d.longitude }
  }

  // Existing stored distances, so a leg that can't be recomputed this save (a
  // transient Google failure) keeps its previous value instead of being wiped.
  const dayIds = days.map(d => d?.id).filter(Boolean) as string[]
  const priorRoadKm: Record<string, number | null> = {}
  if (dayIds.length) {
    const { data: prior } = await admin.from('quote_days').select('id, road_distance_km').in('id', dayIds)
    for (const p of prior ?? []) priorRoadKm[p.id] = p.road_distance_km
  }

  // The legs are independent — resolve them concurrently rather than serially.
  const roadKms = await Promise.all(days.map((day, i) => {
    const destId = day?.destinationId ?? null
    const prevDestId = lastDistinctDestBefore(days, i)
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
    return { ...day, roadDistanceKm: value }
  })
}

// The destination id of the most recent earlier day that has one — i.e. the
// previous stop's destination, skipping days without a destination.
function lastDistinctDestBefore(days: DayPayload[], i: number): string | null {
  for (let j = i - 1; j >= 0; j--) {
    const id = days[j]?.destinationId ?? null
    if (id) return id
  }
  return null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { versionId, days } = await request.json()
  if (!versionId || !Array.isArray(days)) {
    return NextResponse.json({ error: 'A version ID and days array are required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  try {
    await assertAdminAccess(admin, user.email)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { error } = await admin.rpc('save_quote_itinerary', {
    p_version_id: versionId,
    p_days: await withRoadDistances(admin, days),
  })

  if (error) {
    console.error('[save-quote-itinerary] rpc failed', error)
    // Pass the DB guard's message through so the builder can tell the user
    // *why* the save failed (e.g. the version is sent/locked) instead of a
    // generic failure that leaves "Unsaved changes" unexplained.
    const message = /locked/i.test(error.message ?? '')
      ? 'This quote version has been sent and is locked — create a new version to edit the itinerary.'
      : (error.message || 'Failed to save itinerary')
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
