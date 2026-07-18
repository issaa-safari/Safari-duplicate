'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'
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

const ALLOWED_STATUSES = ['draft', 'active', 'archived']

export const bulkDeleteTours = safeAction(async (ids: string[]) => {
  const { admin, user } = await authGuard()
  if (!ids.length) throw new Error('No tours selected.')

  // Deleting a tour cascades to its departures, which cascade to any
  // customer bookings — refuse tours that have real bookings attached so a
  // bulk cleanup can't silently wipe booking history.
  const { data: departures } = await admin
    .from('departures')
    .select('id, tour_id')
    .in('tour_id', ids)
  const departureIds = (departures ?? []).map(d => d.id)

  let blockedTourIds = new Set<string>()
  if (departureIds.length) {
    const { data: bookings } = await admin
      .from('bookings')
      .select('departure_id')
      .in('departure_id', departureIds)
    const bookedDepartureIds = new Set((bookings ?? []).map(b => b.departure_id))
    blockedTourIds = new Set(
      (departures ?? []).filter(d => bookedDepartureIds.has(d.id)).map(d => d.tour_id),
    )
  }

  const deletableIds = ids.filter(id => !blockedTourIds.has(id))
  if (deletableIds.length) {
    const { error } = await admin.from('tours').delete().in('id', deletableIds)
    if (error) throw new Error(error.message)
  }

  await logActivity(admin, {
    entityType: 'tour',
    action: 'bulk_deleted',
    summary: `Bulk-deleted ${deletableIds.length} tour${deletableIds.length === 1 ? '' : 's'}`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { ids: deletableIds },
  })

  revalidatePath('/admin/tours')

  if (blockedTourIds.size > 0) {
    throw new Error(
      `Deleted ${deletableIds.length} of ${ids.length}. ${blockedTourIds.size} tour${blockedTourIds.size === 1 ? ' has' : 's have'} customer bookings and were skipped — cancel or reassign those bookings first.`
    )
  }
})

export const bulkSetTourStatus = safeAction(async (ids: string[], status: string) => {
  const { admin, user } = await authGuard()
  if (!ids.length) throw new Error('No tours selected.')
  if (!ALLOWED_STATUSES.includes(status)) throw new Error('Invalid tour status.')

  const { error } = await admin.from('tours').update({ status }).in('id', ids)
  if (error) throw new Error(error.message)

  await logActivity(admin, {
    entityType: 'tour',
    action: 'bulk_status_changed',
    summary: `Bulk-set ${ids.length} tour${ids.length === 1 ? '' : 's'} to ${status}`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { ids, status },
  })

  revalidatePath('/admin/tours')
})
