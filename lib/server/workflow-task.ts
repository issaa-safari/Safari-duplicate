import type { SupabaseClient } from '@supabase/supabase-js'

export type WorkflowTaskInput = {
  automationKey: string
  title: string
  type?: 'payment' | 'accommodation' | 'activity' | 'other'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  dueDate?: string | null
  ownerId?: string | null
  requestId?: string | null
  quoteId?: string | null
  departureId?: string | null
  bookingId?: string | null
  sortOrder?: number
}

/**
 * Inserts an automated task once. The database automation_key index is the
 * concurrency backstop, so webhook and cron retries cannot create duplicates.
 */
export async function ensureWorkflowTask(admin: SupabaseClient, input: WorkflowTaskInput) {
  const { error } = await admin.from('tasks').insert({
    automation_key: input.automationKey,
    title: input.title,
    type: input.type ?? 'other',
    priority: input.priority ?? 'normal',
    due_date: input.dueDate ?? null,
    owner_id: input.ownerId ?? null,
    request_id: input.requestId ?? null,
    quote_id: input.quoteId ?? null,
    departure_id: input.departureId ?? null,
    booking_id: input.bookingId ?? null,
    auto_generated: true,
    status: 'pending',
    is_done: false,
    sort_order: input.sortOrder ?? 0,
  })

  if (!error) return true
  if (error.code === '23505') return false
  throw error
}

