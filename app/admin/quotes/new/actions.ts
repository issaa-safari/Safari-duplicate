'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { assertAdminAccess } from '@/lib/auth/admin-access'

export async function createQuote(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const mode = formData.get('mode') as string
  const clientId = formData.get('clientId') as string
  const requestId = (formData.get('requestId') as string) || null
  const tourId = (formData.get('tourId') as string) || null
  const departureId = (formData.get('departureId') as string) || null
  const title = (formData.get('title') as string)?.trim() || null

  if (!mode || !['custom', 'fixed_departure'].includes(mode)) {
    throw new Error('Please select a quote mode.')
  }
  if (!clientId) throw new Error('Please select a client.')
  if (mode === 'fixed_departure' && !departureId) {
    throw new Error('Please select a departure for fixed-departure quotes.')
  }

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  const { data: newQuoteId, error } = await admin.rpc('create_quote_with_version', {
    p_client_id: clientId,
    p_request_id: requestId,
    p_mode: mode,
    p_tour_id: tourId,
    p_departure_id: departureId,
    p_title: title,
    p_created_by: user.id,
  })

  if (error) throw new Error(error.message)
  if (!newQuoteId) throw new Error('Quote was not created.')

  // redirect() outside try/catch — Next.js throws NEXT_REDIRECT internally
  // and it must not be caught
  redirect(`/admin/quotes/${newQuoteId}`)
}
