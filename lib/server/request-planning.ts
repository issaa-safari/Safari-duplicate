import type { SupabaseClient } from '@supabase/supabase-js'

export async function assertRequestPlanningEditable(admin: SupabaseClient, requestId: string) {
  const { data, error } = await admin
    .from('requests')
    .select('stage')
    .eq('id', requestId)
    .maybeSingle()
  if (error || !data) throw new Error('Request not found.')
  if (['booked', 'completed'].includes(data.stage)) {
    throw new Error('This accepted request is read-only. Continue operational changes in the linked trip workspace.')
  }
}

