'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function guard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return admin
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

async function validateDeparture(admin: ReturnType<typeof createAdminClient>, departureId: string) {
  const { data } = await admin.from('departures').select('id').eq('id', departureId).maybeSingle()
  if (!data) throw new Error('Trip not found.')
}

function refresh(departureId: string) {
  revalidatePath(`/admin/departures/${departureId}`)
}

export async function assignDepartureStaff(formData: FormData) {
  const admin = await guard()
  const departureId = value(formData, 'departureId')
  const staffId = value(formData, 'staffId')
  if (!departureId || !staffId) throw new Error('Select a staff member.')
  await validateDeparture(admin, departureId)
  const { error } = await admin.from('departure_staff_assignments').insert({ departure_id: departureId, staff_id: staffId })
  if (error) throw new Error(error.code === '23505' ? 'That staff member is already assigned.' : error.message)
  refresh(departureId)
}

export async function unassignDepartureStaff(formData: FormData) {
  const admin = await guard()
  const departureId = value(formData, 'departureId')
  const id = value(formData, 'id')
  if (!departureId || !id) throw new Error('Assignment not found.')
  await validateDeparture(admin, departureId)
  const { error } = await admin.from('departure_staff_assignments').delete().eq('id', id).eq('departure_id', departureId)
  if (error) throw new Error(error.message)
  refresh(departureId)
}

export async function assignDepartureVehicle(formData: FormData) {
  const admin = await guard()
  const departureId = value(formData, 'departureId')
  const vehicleId = value(formData, 'vehicleId')
  const seatsRaw = Number(value(formData, 'seatsUsed'))
  const seatsUsed = Number.isInteger(seatsRaw) && seatsRaw > 0 ? seatsRaw : null
  if (!departureId || !vehicleId) throw new Error('Select a vehicle.')
  await validateDeparture(admin, departureId)
  const { error } = await admin.from('departure_vehicle_assignments').insert({ departure_id: departureId, vehicle_id: vehicleId, seats_used: seatsUsed })
  if (error) throw new Error(error.code === '23505' ? 'That vehicle is already assigned.' : error.message)
  refresh(departureId)
}

export async function unassignDepartureVehicle(formData: FormData) {
  const admin = await guard()
  const departureId = value(formData, 'departureId')
  const id = value(formData, 'id')
  if (!departureId || !id) throw new Error('Assignment not found.')
  await validateDeparture(admin, departureId)
  const { error } = await admin.from('departure_vehicle_assignments').delete().eq('id', id).eq('departure_id', departureId)
  if (error) throw new Error(error.message)
  refresh(departureId)
}

