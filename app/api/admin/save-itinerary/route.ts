import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { assertAdminAccess } from '@/lib/auth/admin-access'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tourId, days } = await request.json()
  if (!tourId) return NextResponse.json({ error: 'Missing tourId' }, { status: 400 })

  const admin = createAdminClient()
  try {
    await assertAdminAccess(admin, user.email)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete existing days for this tour that are no longer present
  const keepIds = (days as any[]).filter((d) => d.id).map((d) => d.id)
  let delQuery = admin.from('tour_days').delete().eq('tour_id', tourId)
  if (keepIds.length > 0) {
    delQuery = delQuery.not('id', 'in', `(${keepIds.join(',')})`)
  }
  const { error: delErr } = await delQuery
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  // Upsert each day
  for (const d of days as any[]) {
    const row = {
      tour_id: tourId,
      day_number: d.day_number,
      day_number_end: d.day_number_end || null,
      title_en: (d.title_en && d.title_en.trim()) || 'Untitled day',
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
      image_url: d.image_url ?? null,
      updated_at: new Date().toISOString(),
    }
    if (d.id) {
      const { error } = await admin.from('tour_days').update(row).eq('id', d.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await admin.from('tour_days').insert(row)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
