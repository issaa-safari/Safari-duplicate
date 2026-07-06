'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { findOrCreateClientByEmail } from '@/lib/server/clients'
import { redirect } from 'next/navigation'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { admin, user }
}

// Step 1 — client + lead source. Persists immediately so the reference number
// exists before step 2, matching the Safari app. Returns the new request id +
// reference for the wizard to carry into step 2.
export async function createRequestStep1(formData: FormData): Promise<{ requestId: string; reference: string }> {
  const { admin, user } = await authGuard()

  const email = (formData.get('email') as string)?.toLowerCase().trim()
  const firstName = (formData.get('firstName') as string)?.trim() || null
  const lastName = (formData.get('lastName') as string)?.trim() || null
  const phone = (formData.get('phone') as string)?.trim() || null
  const whatsapp = (formData.get('whatsapp') as string)?.trim() || null
  const country = (formData.get('country') as string)?.trim() || null
  const language = (formData.get('language') as string) || 'en'
  const source = (formData.get('source') as string) || null

  if (!email) throw new Error('Client email is required.')

  // Resolve/create the client through the hardened shared resolver, then fill
  // the richer fields the resolver doesn't take.
  const clientId = await findOrCreateClientByEmail(admin, { email, first_name: firstName, last_name: lastName, phone })
  await admin.from('clients')
    .update({ first_name: firstName, last_name: lastName, phone, whatsapp, country, language })
    .eq('id', clientId)

  // Attribute the request to the current admin (Handled by).
  const { data: adminRow } = await admin
    .from('admin_users').select('id').ilike('email', user.email ?? '').limit(1).maybeSingle()

  const { data: newRequest, error } = await admin
    .from('requests')
    .insert({
      client_id: clientId,
      stage: 'new',
      source,
      handled_by: adminRow?.id ?? null,
    })
    .select('id, reference')
    .single()

  if (error || !newRequest) throw new Error(error?.message ?? 'Could not create the request.')
  return { requestId: newRequest.id, reference: newRequest.reference }
}

// Step 2 — tour details on the request created in step 1.
export async function updateRequestStep2(formData: FormData) {
  const { admin } = await authGuard()
  const requestId = (formData.get('requestId') as string)?.trim()
  if (!requestId) throw new Error('Missing request id.')

  const adults = parseInt(formData.get('adults') as string) || 2
  const childrenOlder = parseInt(formData.get('childrenOlder') as string) || 0
  const childrenYounger = parseInt(formData.get('childrenYounger') as string) || 0
  const preferredDate = (formData.get('preferredDate') as string) || null
  const clientQuestion = (formData.get('clientQuestion') as string)?.trim() || null
  const priority = formData.get('priority') === 'true'

  const { error } = await admin
    .from('requests')
    .update({
      travelers_adults: adults,
      travelers_children_older: childrenOlder,
      travelers_children_younger: childrenYounger,
      preferred_start_date: preferredDate,
      client_question: clientQuestion,
      priority,
    })
    .eq('id', requestId)

  if (error) throw new Error(error.message)
  redirect(`/admin/requests/${requestId}`)
}
