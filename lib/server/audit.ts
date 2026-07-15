import type { SupabaseClient } from '@supabase/supabase-js'

export type ActivityEntry = {
  entityType: string
  entityId?: string | null
  action: string
  summary?: string | null
  actorId?: string | null
  actorEmail?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Append a row to activity_log (group_55). Fire-and-forget: failures are
 * logged and swallowed so an audit-write can never fail the operation it is
 * recording. Always call with the service-role admin client — the table has
 * RLS enabled with no policies.
 */
export async function logActivity(admin: SupabaseClient, entry: ActivityEntry): Promise<void> {
  try {
    const { error } = await admin.from('activity_log').insert({
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      action: entry.action,
      summary: entry.summary ?? null,
      actor_id: entry.actorId ?? null,
      actor_email: entry.actorEmail ?? null,
      metadata: entry.metadata ?? {},
    })
    if (error) console.error('[audit] failed to log activity', error.message)
  } catch (err) {
    console.error('[audit] logActivity threw', err)
  }
}
