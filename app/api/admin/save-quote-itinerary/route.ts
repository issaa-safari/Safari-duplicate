import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { versionId, days } = await request.json()
  if (!versionId) return NextResponse.json({ error: 'Missing versionId' }, { status: 400 })

  const admin = createAdminClient()

  // Delete days that were removed (cascades to quote_day_items)
  const keepIds = (days as any[]).filter(d => d.id).map(d => d.id)
  let delQuery = admin.from('quote_days').delete().eq('quote_version_id', versionId)
  if (keepIds.length > 0) delQuery = delQuery.not('id', 'in', `(${keepIds.join(',')})`)
  const { error: delErr } = await delQuery
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  for (let i = 0; i < (days as any[]).length; i++) {
    const d = (days as any[])[i]
    const dayRow = {
      quote_version_id: versionId,
      day_number: d.dayNumber,
      day_date: d.dayDate || null,
      title: d.title || null,
      description_en: d.descriptionEn || null,
      client_notes: d.clientNotes || null,
      destination_id: d.destinationId || null,
      destination_snapshot: d.destinationSnapshot ?? {},
      meals: d.meals ?? [],
      sort_order: i,
      updated_at: new Date().toISOString(),
    }

    let dayId: string
    if (d.id) {
      const { error } = await admin.from('quote_days').update(dayRow).eq('id', d.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      dayId = d.id
    } else {
      const { data: ins, error } = await admin.from('quote_days').insert(dayRow).select('id').single()
      if (error || !ins) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
      dayId = ins.id
    }

    // Re-insert all items for the day (delete-and-recreate keeps it simple)
    const { error: itemDelErr } = await admin.from('quote_day_items').delete().eq('quote_day_id', dayId)
    if (itemDelErr) return NextResponse.json({ error: itemDelErr.message }, { status: 500 })

    for (let j = 0; j < (d.items ?? []).length; j++) {
      const item = d.items[j]
      const itemRow = {
        quote_day_id: dayId,
        item_type: item.itemType,
        accommodation_id: item.itemType === 'accommodation' ? (item.entityId || null) : null,
        activity_id:      item.itemType === 'activity'      ? (item.entityId || null) : null,
        vehicle_id:       item.itemType === 'vehicle'        ? (item.entityId || null) : null,
        staff_id:         item.itemType === 'staff'          ? (item.entityId || null) : null,
        title_snapshot:   item.titleSnapshot ?? '',
        content_snapshot: item.contentSnapshot ?? {},
        sort_order: j,
      }
      const { error: itemErr } = await admin.from('quote_day_items').insert(itemRow)
      if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
