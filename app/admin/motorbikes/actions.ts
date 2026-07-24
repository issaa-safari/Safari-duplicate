'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { admin }
}

function fields(formData: FormData) {
  const str = (n: string) => (formData.get(n) as string)?.trim() || null
  const engineRaw = str('engineCc')
  const engineCc = engineRaw ? parseInt(engineRaw, 10) : null
  const status = (formData.get('status') as string) || 'available'
  return {
    name: str('name'),
    make: str('make'),
    model: str('model'),
    plate_number: str('plateNumber'),
    engine_cc: engineCc != null && !isNaN(engineCc) ? engineCc : null,
    color: str('color'),
    status: ['available', 'maintenance', 'retired'].includes(status) ? status : 'available',
    notes: str('notes'),
  }
}

export async function createMotorbike(formData: FormData) {
  const { admin } = await authGuard()
  const data = fields(formData)
  if (!data.name) throw new Error('Bike name is required.')
  const { error } = await admin.from('motorbikes').insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/motorbikes')
}

export async function updateMotorbike(id: string, formData: FormData) {
  const { admin } = await authGuard()
  const data = fields(formData)
  if (!data.name) throw new Error('Bike name is required.')
  const { error } = await admin.from('motorbikes').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/motorbikes')
}

export async function archiveMotorbike(id: string) {
  const { admin } = await authGuard()
  // Soft-delete: keep the record so existing assignments/history stay intact.
  const { error } = await admin
    .from('motorbikes')
    .update({ is_active: false, status: 'retired' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/motorbikes')
}

export async function restoreMotorbike(id: string) {
  const { admin } = await authGuard()
  const { error } = await admin
    .from('motorbikes')
    .update({ is_active: true, status: 'available' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/motorbikes')
}
