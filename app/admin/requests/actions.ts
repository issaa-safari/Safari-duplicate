'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { assertValidClientIdentity } from '@/lib/server/validate-client'
import { safeAction } from '@/lib/server/action-result'

type Admin = ReturnType<typeof createAdminClient>

async function authGuard() {
  // Session client — used ONLY to verify the admin is logged in.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // Service-role client — all DB work goes through this. No cookies, bypasses RLS.
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return admin
}

// The form submits either an existing client (clientId) or the new-client
// fields. Existing clients are used as-is — their contact details are only
// rewritten when the admin typed them into the new-client path, where an
// email match doubles as an update.
async function resolveClientId(admin: Admin, formData: FormData): Promise<string> {
  const pickedId = ((formData.get('clientId') as string | null) ?? '').trim()
  if (pickedId) {
    const { data: picked } = await admin
      .from('clients').select('id').eq('id', pickedId).maybeSingle()
    if (!picked) throw new Error('Selected client no longer exists.')
    return picked.id
  }

  const email = ((formData.get('email') as string | null) ?? '').toLowerCase().trim()
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const phone = formData.get('phone') as string
  const whatsapp = formData.get('whatsapp') as string
  const country = formData.get('country') as string
  const language = formData.get('language') as string

  if (!email) throw new Error('Email is required for a new client.')
  assertValidClientIdentity({ firstName, lastName, email })

  const { data: existingClient } = await admin
    .from('clients')
    .select('id')
    .eq('email', email)
    .single()

  if (existingClient) {
    await admin
      .from('clients')
      .update({ first_name: firstName, last_name: lastName, phone, whatsapp, country, language })
      .eq('id', existingClient.id)
    return existingClient.id
  }

  const { data: newClient, error: clientError } = await admin
    .from('clients')
    .insert({ email, first_name: firstName, last_name: lastName, phone, whatsapp, country, language })
    .select('id')
    .single()

  if (clientError) throw new Error(clientError.message)
  return newClient.id
}

function requestFieldsFromForm(formData: FormData) {
  const tripLengthNightsRaw = formData.get('tripLengthNights') as string
  return {
    source: (formData.get('source') as string) || null,
    travelers_adults: parseInt(formData.get('adults') as string) || 2,
    travelers_children_older: parseInt(formData.get('childrenOlder') as string) || 0,
    travelers_children_younger: parseInt(formData.get('childrenYounger') as string) || 0,
    preferred_start_date: (formData.get('preferredDate') as string) || null,
    trip_length_nights: tripLengthNightsRaw ? parseInt(tripLengthNightsRaw) || null : null,
    preferred_room_type: (formData.get('preferredRoomType') as string) || null,
    client_question: (formData.get('clientQuestion') as string) || null,
    priority: formData.get('priority') === 'true',
  }
}

export const createRequest = safeAction(async (formData: FormData) => {
  const admin = await authGuard()
  if (!admin) return { error: null, redirectTo: '/admin/login' }

  const clientId = await resolveClientId(admin, formData)

  const { data: newRequest, error: requestError } = await admin
    .from('requests')
    .insert({
      client_id: clientId,
      stage: 'new',
      ...requestFieldsFromForm(formData),
    })
    .select('id')
    .single()

  if (requestError) throw new Error(requestError.message)

  revalidatePath('/admin/requests')
  revalidatePath(`/admin/clients/${clientId}`)
  return { error: null, redirectTo: `/admin/requests/${newRequest.id}` }
})

export const updateRequest = safeAction(async (requestId: string, formData: FormData) => {
  const admin = await authGuard()
  if (!admin) return { error: null, redirectTo: '/admin/login' }

  const { data: request } = await admin
    .from('requests').select('id, client_id').eq('id', requestId).maybeSingle()
  if (!request) throw new Error('Request not found.')

  const clientId = await resolveClientId(admin, formData)

  const { error: updateError } = await admin
    .from('requests')
    .update({
      client_id: clientId,
      ...requestFieldsFromForm(formData),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (updateError) throw new Error(updateError.message)

  revalidatePath('/admin/requests')
  revalidatePath(`/admin/requests/${requestId}`)
  revalidatePath(`/admin/clients/${clientId}`)
  if (request.client_id && request.client_id !== clientId) {
    revalidatePath(`/admin/clients/${request.client_id}`)
  }
  return { error: null, redirectTo: `/admin/requests/${requestId}` }
})
