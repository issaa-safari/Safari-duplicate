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
  return { admin }
}

export async function assignStaff(formData: FormData) {
  const { admin } = await authGuard()
  const requestId = (formData.get('requestId') as string)?.trim()
  const staffId = (formData.get('staffId') as string)?.trim()
  const role = (formData.get('role') as string)?.trim() || null
  if (!requestId || !staffId) throw new Error('Missing request or staff.')
  const { error } = await admin.from('request_staff_assignments')
    .insert({ request_id: requestId, staff_id: staffId, role })
  if (error) throw new Error(error.code === '23505' ? 'That staff member is already assigned.' : error.message)
  revalidatePath(`/admin/requests/${requestId}`)
}

export async function unassignStaff(formData: FormData) {
  const { admin } = await authGuard()
  const id = (formData.get('id') as string)?.trim()
  const requestId = (formData.get('requestId') as string)?.trim()
  if (!id || !requestId) throw new Error('Missing id.')
  const { error } = await admin.from('request_staff_assignments').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/requests/${requestId}`)
}

export async function assignVehicle(formData: FormData) {
  const { admin } = await authGuard()
  const requestId = (formData.get('requestId') as string)?.trim()
  const vehicleId = (formData.get('vehicleId') as string)?.trim()
  const seatsRaw = Number(formData.get('seatsUsed'))
  const seatsUsed = Number.isInteger(seatsRaw) && seatsRaw > 0 ? seatsRaw : null
  if (!requestId || !vehicleId) throw new Error('Missing request or vehicle.')
  const { error } = await admin.from('request_vehicle_assignments')
    .insert({ request_id: requestId, vehicle_id: vehicleId, seats_used: seatsUsed })
  if (error) throw new Error(error.code === '23505' ? 'That vehicle is already assigned.' : error.message)
  revalidatePath(`/admin/requests/${requestId}`)
}

export async function unassignVehicle(formData: FormData) {
  const { admin } = await authGuard()
  const id = (formData.get('id') as string)?.trim()
  const requestId = (formData.get('requestId') as string)?.trim()
  if (!id || !requestId) throw new Error('Missing id.')
  const { error } = await admin.from('request_vehicle_assignments').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/requests/${requestId}`)
}
