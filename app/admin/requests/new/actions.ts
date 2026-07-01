'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'

export async function createRequest(formData: FormData) {
  // Session client — used ONLY to verify the admin is logged in.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  // Service-role client — all DB work goes through this. No cookies, bypasses RLS.
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)

  const email = (formData.get('email') as string).toLowerCase().trim()
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const phone = formData.get('phone') as string
  const whatsapp = formData.get('whatsapp') as string
  const country = formData.get('country') as string
  const language = formData.get('language') as string
  const clientQuestion = formData.get('clientQuestion') as string
  const source = formData.get('source') as string
  const adults = parseInt(formData.get('adults') as string) || 2
  const childrenOlder = parseInt(formData.get('childrenOlder') as string) || 0
  const childrenYounger = parseInt(formData.get('childrenYounger') as string) || 0
  const preferredDate = formData.get('preferredDate') as string
  const priority = formData.get('priority') === 'true'

  // Check if client exists
  let clientId: string

  const { data: existingClient } = await admin
    .from('clients')
    .select('id')
    .eq('email', email)
    .single()

  if (existingClient) {
    clientId = existingClient.id
    await admin
      .from('clients')
      .update({ first_name: firstName, last_name: lastName, phone, whatsapp, country, language })
      .eq('id', clientId)
  } else {
    const { data: newClient, error: clientError } = await admin
      .from('clients')
      .insert({ email, first_name: firstName, last_name: lastName, phone, whatsapp, country, language })
      .select('id')
      .single()

    if (clientError) throw new Error(clientError.message)
    clientId = newClient.id
  }

  // Create request
  const { data: newRequest, error: requestError } = await admin
    .from('requests')
    .insert({
      client_id: clientId,
      stage: 'new',
      source: source || null,
      travelers_adults: adults,
      travelers_children_older: childrenOlder,
      travelers_children_younger: childrenYounger,
      preferred_start_date: preferredDate || null,
      client_question: clientQuestion || null,
      priority,
    })
    .select('id')
    .single()

  if (requestError) throw new Error(requestError.message)

  redirect(`/admin/requests/${newRequest.id}`)
}