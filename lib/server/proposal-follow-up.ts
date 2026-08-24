import type { SupabaseClient } from '@supabase/supabase-js'
import { proposalFollowUpDueDate } from '@/lib/automation'
import { ensureWorkflowTask } from '@/lib/server/workflow-task'

interface ProposalFollowUpInput {
  requestId: string | null | undefined
  quoteId: string
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
  const { requestId, quoteId, quoteNumber, status } = input
  if (!requestId) return false

  const dueDate = proposalFollowUpDueDate(status, input.referenceDate ?? new Date())
  if (!dueDate) return false

  const { error: workflowError } = await admin
    .from('quotes')
    .update({
      next_action: status === 'viewed' ? 'Follow up: client viewed proposal' : 'Follow up on sent proposal',
      next_action_due_at: `${dueDate}T09:00:00.000Z`,
    })
    .eq('id', quoteId)
  if (workflowError) throw workflowError

  return ensureWorkflowTask(admin, {
    automationKey: `proposal_follow_up:${quoteId}`,
    requestId,
    quoteId,
    title: `Follow up proposal ${quoteNumber}`,
    type: 'other',
    priority: status === 'viewed' ? 'high' : 'normal',
    sortOrder: 5,
    dueDate,
  })
}
