import type { SupabaseClient } from '@supabase/supabase-js'

// Higher rank wins when a quote has multiple versions (dual-track Standard/Premium).
// 'superseded'/'cancelled' rank lowest so a losing track never masks the winner.
const STATUS_RANK: Record<string, number> = {
  superseded: 0,
  cancelled: 0,
  draft: 1,
  ready: 2,
  sent: 3,
  viewed: 4,
  expired: 4,
  declined: 5,
  accepted: 6,
}

/**
 * quotes.status and quote_versions.status are separate columns that can drift
 * (e.g. setVersionStatus/createShareLink/viewed-tracking only ever touched
 * quote_versions). Call this after any quote_versions.status write so the
 * parent quotes.status — used by the Quotes list tabs and dashboards — stays
 * a true reflection of the most-advanced version.
 */
export async function syncQuoteStatus(admin: SupabaseClient, quoteId: string) {
  const { data: versions } = await admin
    .from('quote_versions')
    .select('status')
    .eq('quote_id', quoteId)
  if (!versions || versions.length === 0) return

  const best = versions.reduce((a, b) =>
    (STATUS_RANK[b.status] ?? 0) > (STATUS_RANK[a.status] ?? 0) ? b : a
  )
  await admin.from('quotes').update({ status: best.status }).eq('id', quoteId)
}
