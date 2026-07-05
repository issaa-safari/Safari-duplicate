import { createAdminClient } from '@/lib/supabase/admin'
import { shouldComplete, shouldArchive, shouldDelete, type AutomationSettings } from '@/lib/automation'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Daily request-lifecycle automation, driven by a Vercel Cron Job (see
// vercel.json). Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically
// when CRON_SECRET is set in the project env. All writes use the service-role
// client. Safe to run repeatedly — every step is idempotent.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const admin = createAdminClient()
  const now = new Date()

  const { data: settings } = await admin
    .from('company_settings')
    .select('auto_complete_on_end_date, auto_archive_enabled, auto_archive_days, auto_archive_stages, auto_delete_enabled, auto_delete_days')
    .limit(1)
    .single()

  if (!settings) return NextResponse.json({ error: 'No company settings' }, { status: 500 })
  const s = settings as AutomationSettings

  const result = { completed: 0, archived: 0, deleted: 0 }

  async function logSystem(requestId: string, summary: string) {
    try {
      await admin.from('communication_logs').insert({ request_id: requestId, type: 'note', summary })
    } catch { /* audit note is non-critical */ }
  }

  // 1) Auto-complete booked trips whose end date has passed.
  if (s.auto_complete_on_end_date) {
    const { data: booked } = await admin
      .from('quotes')
      .select('request_id, quote_versions!inner(travel_end_date, status)')
      .not('request_id', 'is', null)
      .in('status', ['accepted'])
    const seen = new Set<string>()
    for (const q of booked ?? []) {
      const rid = (q as { request_id: string }).request_id
      if (!rid || seen.has(rid)) continue
      const versions = (q as { quote_versions: { travel_end_date: string | null; status: string }[] }).quote_versions ?? []
      const end = versions.find(v => v.status === 'accepted')?.travel_end_date ?? versions[0]?.travel_end_date
      if (shouldComplete(end, now)) {
        const { data: reqRow } = await admin.from('requests').select('stage').eq('id', rid).single()
        if (reqRow?.stage === 'booked') {
          await admin.from('requests').update({ stage: 'completed' }).eq('id', rid)
          await logSystem(rid, 'Auto-completed: trip end date passed.')
          seen.add(rid)
          result.completed++
        }
      }
    }
  }

  // 2) Auto-archive stale requests in the configured stages.
  if (s.auto_archive_enabled) {
    const { data: candidates } = await admin
      .from('requests')
      .select('id, stage, status_changed_at')
      .in('stage', s.auto_archive_stages ?? [])
    for (const r of candidates ?? []) {
      const row = r as { id: string; stage: string; status_changed_at: string | null }
      if (shouldArchive(row.stage, row.status_changed_at, s, now)) {
        await admin.from('requests').update({ stage: 'archived' }).eq('id', row.id)
        await logSystem(row.id, `Auto-archived: no activity for ${s.auto_archive_days}+ days.`)
        result.archived++
      }
    }
  }

  // 3) Hard-delete requests archived past the delete threshold.
  if (s.auto_delete_enabled) {
    const { data: archived } = await admin
      .from('requests')
      .select('id, archived_at')
      .eq('stage', 'archived')
      .not('archived_at', 'is', null)
    for (const r of archived ?? []) {
      const row = r as { id: string; archived_at: string | null }
      if (shouldDelete(row.archived_at, s, now)) {
        await admin.from('requests').delete().eq('id', row.id)
        result.deleted++
      }
    }
  }

  return NextResponse.json({ ok: true, ...result })
}
