'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'

const TASK_TYPES = ['payment', 'accommodation', 'activity', 'other']

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { admin }
}

export async function addDefaultTask(formData: FormData) {
  const { admin } = await authGuard()
  const description = (formData.get('description') as string)?.trim()
  const typeRaw = (formData.get('type') as string)?.trim()
  const type = TASK_TYPES.includes(typeRaw) ? typeRaw : 'other'
  if (!description) throw new Error('Description is required.')
  if (description.length > 500) throw new Error('Description is too long.')

  const { data: max } = await admin
    .from('default_tasks').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const sort_order = (max?.sort_order ?? 0) + 10

  const { error } = await admin.from('default_tasks')
    .insert({ stage: 'booked', description, type, sort_order, is_active: true })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/settings/default-tasks')
}

export async function toggleDefaultTask(formData: FormData) {
  const { admin } = await authGuard()
  const id = (formData.get('id') as string)?.trim()
  const isActive = formData.get('isActive') === 'true'
  if (!id) throw new Error('Missing id.')
  const { error } = await admin.from('default_tasks').update({ is_active: isActive }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/settings/default-tasks')
}

export async function deleteDefaultTask(formData: FormData) {
  const { admin } = await authGuard()
  const id = (formData.get('id') as string)?.trim()
  if (!id) throw new Error('Missing id.')
  const { error } = await admin.from('default_tasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/settings/default-tasks')
}
