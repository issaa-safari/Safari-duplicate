'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

const TASK_TYPES = ['payment', 'accommodation', 'activity', 'other']

export async function addTask(formData: FormData) {
  const { admin } = await authGuard()
  const requestId = (formData.get('requestId') as string)?.trim()
  const title = (formData.get('title') as string)?.trim()
  const typeRaw = (formData.get('type') as string)?.trim()
  const type = TASK_TYPES.includes(typeRaw) ? typeRaw : 'other'

  if (!requestId) throw new Error('Request ID is required.')
  if (!title) throw new Error('Task title is required.')
  if (title.length > 500) throw new Error('Task title is too long.')

  const { data: request } = await admin.from('requests').select('id').eq('id', requestId).single()
  if (!request) throw new Error('Request not found.')

  const { data: inserted, error } = await admin
    .from('tasks')
    .insert({ request_id: requestId, title, type, is_done: false })
    .select('id, title, is_done, created_at, type, auto_generated, sort_order')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/requests/${requestId}`)
  return inserted
}

export async function toggleTask(formData: FormData) {
  const { admin } = await authGuard()
  const taskId = (formData.get('taskId') as string)?.trim()
  const requestId = (formData.get('requestId') as string)?.trim()
  const isDone = formData.get('isDone') === 'true'

  if (!taskId || !requestId) throw new Error('Missing task or request ID.')

  const { error } = await admin.from('tasks').update({ is_done: isDone }).eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/requests/${requestId}`)
}

export async function deleteTask(formData: FormData) {
  const { admin } = await authGuard()
  const taskId = (formData.get('taskId') as string)?.trim()
  const requestId = (formData.get('requestId') as string)?.trim()

  if (!taskId || !requestId) throw new Error('Missing task or request ID.')

  const { error } = await admin.from('tasks').delete().eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/requests/${requestId}`)
}
