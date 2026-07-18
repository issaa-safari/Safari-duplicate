'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { syncQuoteStatus } from '@/lib/server/quote-status'
import { safeAction } from '@/lib/server/action-result'
import { logActivity } from '@/lib/server/audit'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Your session has expired — please log in again.')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

/** Same allowed values + transitions as the single-quote version status control. */
const ALLOWED_STATUSES = ['draft', 'ready', 'sent']
const TRANSITIONS: Record<string, string[]> = {
  ready: ['draft', 'sent'],
  sent: ['ready'],
}

export const bulkDeleteQuotes = safeAction(async (ids: string[]) => {
  const { admin, user } = await authGuard()
  if (!ids.length) throw new Error('No quotes selected.')

  // quote_acceptances.quote_version_id is ON DELETE RESTRICT (an accepted
  // version can't silently vanish); clear those rows first so the cascade
  // from quotes -> quote_versions -> ... isn't blocked by an accepted quote.
  await admin.from('quote_acceptances').delete().in('quote_id', ids)

  const { error } = await admin.from('quotes').delete().in('id', ids)
  if (error) throw new Error(error.message)

  await logActivity(admin, {
    entityType: 'quote',
    action: 'bulk_deleted',
    summary: `Bulk-deleted ${ids.length} quote${ids.length === 1 ? '' : 's'}`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { ids },
  })

  revalidatePath('/admin/quotes')
  revalidatePath('/admin/tour-templates')
})

export const bulkSetQuoteStatus = safeAction(async (ids: string[], newStatus: string) => {
  const { admin, user } = await authGuard()
  if (!ids.length) throw new Error('No quotes selected.')
  if (!ALLOWED_STATUSES.includes(newStatus)) throw new Error('Invalid status.')

  const { data: versions } = await admin
    .from('quote_versions')
    .select('id, quote_id, status, version_number')
    .in('quote_id', ids)
    .order('version_number', { ascending: false })

  // Latest version per quote — same target the single-quote status control uses.
  const latestByQuote = new Map<string, { id: string; status: string }>()
  for (const v of versions ?? []) {
    if (!latestByQuote.has(v.quote_id)) latestByQuote.set(v.quote_id, { id: v.id, status: v.status })
  }

  let succeeded = 0
  let failed = 0
  for (const quoteId of ids) {
    const version = latestByQuote.get(quoteId)
    if (!version) { failed++; continue }
    if (!TRANSITIONS[version.status]?.includes(newStatus)) { failed++; continue }

    if (newStatus === 'ready' || newStatus === 'sent') {
      const { count } = await admin
        .from('quote_days')
        .select('id', { count: 'exact', head: true })
        .eq('quote_version_id', version.id)
      if (!count || count < 1) { failed++; continue }
    }

    const { error } = await admin.from('quote_versions').update({ status: newStatus }).eq('id', version.id)
    if (error) { failed++; continue }
    await syncQuoteStatus(admin, quoteId)
    succeeded++
  }

  await logActivity(admin, {
    entityType: 'quote',
    action: 'bulk_status_changed',
    summary: `Bulk-set ${succeeded} quote${succeeded === 1 ? '' : 's'} to ${newStatus}${failed ? ` (${failed} skipped)` : ''}`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { ids, newStatus, succeeded, failed },
  })

  revalidatePath('/admin/quotes')
  revalidatePath('/admin/tour-templates')

  if (failed > 0) {
    throw new Error(
      succeeded > 0
        ? `Updated ${succeeded} of ${ids.length} quotes. ${failed} could not move to "${newStatus}" (locked, missing itinerary days, or invalid transition).`
        : `None of the selected quotes could move to "${newStatus}" (locked, missing itinerary days, or invalid transition).`
    )
  }
})
