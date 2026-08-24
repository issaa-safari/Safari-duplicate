import type { SupabaseClient } from '@supabase/supabase-js'
import { proposalFollowUpDueDate } from '@/lib/automation'

interface ProposalFollowUpInput {
  requestId: string | null | undefined
  quoteNumber: string
  status: string
  referenceDate?: Date | string
}

/**
 * Adds exactly one request task for an active client proposal. The exact title
 * lookup makes this safe to call on every portal view and from the daily
 * backfill job without creating duplicate work.
 */
export async function ensureProposalFollowUpTask(
  admin: SupabaseClient,
  input: ProposalFollowUpInput,
): Promise<boolean> {
  const { requestId, quoteNumber, status } = input
  if (!requestId) return false

  const dueDate = proposalFollowUpDueDate(status, input.referenceDate ?? new Date())
  if (!dueDate) return false

  const title = `Follow up proposal ${quoteNumber}`
  const { data: existing, error: lookupError } = await admin
    .from('tasks')
    .select('id')
    .eq('request_id', requestId)
    .eq('title', title)
    .limit(1)
    .maybeSingle()

  if (lookupError) throw lookupError
  if (existing) return false

  const { error: insertError } = await admin.from('tasks').insert({
    request_id: requestId,
    title,
    type: 'other',
    status: 'pending',
    auto_generated: true,
    sort_order: 5,
    due_date: dueDate,
  })
  if (insertError) throw insertError
  return true
}
