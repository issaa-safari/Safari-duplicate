'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const PRIORITIES = new Set(['normal', 'high', 'urgent'])

function optionalText(formData: FormData, key: string, maxLength: number) {
  const value = String(formData.get(key) ?? '').trim()
  if (!value) return null
  if (value.length > maxLength) throw new Error(`${key} is too long.`)
  return value
}

function optionalTimestamp(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim()
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid ${key}.`)
  return parsed.toISOString()
}

export async function updateCommercialWorkflow(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)

  const entityType = String(formData.get('entityType') ?? '')
  const entityId = String(formData.get('entityId') ?? '').trim()
  if (!entityId || (entityType !== 'request' && entityType !== 'quote')) {
    throw new Error('Invalid workflow record.')
  }

  const ownerId = optionalText(formData, 'ownerId', 100)
  if (ownerId) {
    const { data: owner, error } = await admin
      .from('admin_users')
      .select('id')
      .eq('id', ownerId)
      .eq('is_active', true)
      .maybeSingle()
    if (error || !owner) throw new Error('Select an active team member.')
  }

  const common = {
    next_action: optionalText(formData, 'nextAction', 500),
    next_action_due_at: optionalTimestamp(formData, 'nextActionDueAt'),
    last_contact_at: formData.get('contactNow') === 'true'
      ? new Date().toISOString()
      : optionalTimestamp(formData, 'lastContactAt'),
    follow_up_outcome: optionalText(formData, 'followUpOutcome', 1000),
  }

  if (entityType === 'request') {
    const priorityRaw = String(formData.get('priority') ?? '').trim()
    const priority = PRIORITIES.has(priorityRaw) ? priorityRaw : null
    const { error } = await admin
      .from('requests')
      .update({ ...common, handled_by: ownerId, priority })
      .eq('id', entityId)
    if (error) throw new Error(error.message)
    revalidatePath(`/admin/requests/${entityId}`)
    revalidatePath('/admin/requests')
  } else {
    const { error } = await admin
      .from('quotes')
      .update({ ...common, owner_id: ownerId })
      .eq('id', entityId)
    if (error) throw new Error(error.message)
    revalidatePath(`/admin/quotes/${entityId}`)
    revalidatePath('/admin/quotes')
  }

  revalidatePath('/admin/sales')
}

