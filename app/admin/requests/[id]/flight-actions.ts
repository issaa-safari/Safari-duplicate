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

export async function addFlight(formData: FormData) {
  const { admin } = await authGuard()
  const requestId = (formData.get('requestId') as string)?.trim()
  const direction = (formData.get('direction') as string) === 'departure' ? 'departure' : 'arrival'
  const str = (n: string) => (formData.get(n) as string)?.trim() || null
  const scheduledRaw = str('scheduledAt')

  if (!requestId) throw new Error('Request ID is required.')

  const { data: request } = await admin.from('requests').select('id').eq('id', requestId).single()
  if (!request) throw new Error('Request not found.')

  const { error } = await admin.from('request_flights').insert({
    request_id: requestId,
    direction,
    traveller_name: str('travellerName'),
    flight_number: str('flightNumber'),
    airline: str('airline'),
    airport: str('airport'),
    scheduled_at: scheduledRaw ? new Date(scheduledRaw).toISOString() : null,
    notes: str('notes'),
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/requests/${requestId}`)
}

export async function deleteFlight(formData: FormData) {
  const { admin } = await authGuard()
  const id = (formData.get('id') as string)?.trim()
  const requestId = (formData.get('requestId') as string)?.trim()
  if (!id || !requestId) throw new Error('Missing id.')
  const { error } = await admin.from('request_flights').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/requests/${requestId}`)
}
