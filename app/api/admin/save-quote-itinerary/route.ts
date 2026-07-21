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

  let prevDestId: string | null = null
  const out: DayPayload[] = []
  for (const day of days) {
    const destId = day?.destinationId ?? null
    const coord = destId ? coordMap[destId] : undefined
    const prevCoord = prevDestId ? coordMap[prevDestId] : undefined
    const isNewStop = !!destId && destId !== prevDestId
    const roadKm = isNewStop && coord && prevCoord ? await computeRoadKm(prevCoord, coord) : null
    out.push({ ...day, roadDistanceKm: roadKm != null ? Math.round(roadKm * 10) / 10 : null })
    if (destId) prevDestId = destId
  }
  return out
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
