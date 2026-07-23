'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { safeAction } from '@/lib/server/action-result'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { admin }
}

/** Flag / unflag an existing quote as a reusable template. */
export async function setTemplateFlag(formData: FormData) {
  const { admin } = await authGuard()
  const quoteId = (formData.get('quoteId') as string)?.trim()
  const isTemplate = formData.get('isTemplate') === 'true'
  if (!quoteId) throw new Error('Missing quote id.')
  const { error } = await admin.from('quotes').update({ is_template: isTemplate }).eq('id', quoteId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/tour-templates')
  revalidatePath(`/admin/quotes/${quoteId}`)
}

/**
 * Deep-copy a template's latest version into a brand-new quote bound to a
 * request (immutable snapshot). Redirects to the new quote on success.
 */
export async function startFromTemplate(formData: FormData) {
  const { admin } = await authGuard()
  const templateId = (formData.get('templateId') as string)?.trim()
  const requestId = (formData.get('requestId') as string)?.trim()
  if (!templateId) throw new Error('Missing template id.')
  if (!requestId) throw new Error('Missing request id.')

  const { data: request } = await admin
    .from('requests').select('id, client_id').eq('id', requestId).single()
  if (!request?.client_id) throw new Error('This request has no linked client to copy the quote onto.')

  const { data: newQuoteId, error } = await admin.rpc('copy_quote_as_new', {
    p_source_quote_id: templateId,
    p_request_id: requestId,
    p_client_id: request.client_id,
  })
  if (error) throw new Error(error.message)

  redirect(`/admin/quotes/${newQuoteId}`)
}

/**
 * Copy a template's latest version into a new quote for a client directly —
 * no request required. Returns the new quote's URL so the caller can navigate
 * there to adjust pricing for the client's request. The client must already
 * exist (created inline via /api/admin/create-client when new).
 */
export const createQuoteForClient = safeAction(async (formData: FormData) => {
  const { admin } = await authGuard()
  const templateId = (formData.get('templateId') as string)?.trim()
  const clientId = (formData.get('clientId') as string)?.trim()
  if (!templateId) throw new Error('Missing template id.')
  if (!clientId) throw new Error('Please choose a client.')

  // Guard both ends: the source must be a real template, the client must exist.
  const { data: template } = await admin
    .from('quotes').select('id, is_template').eq('id', templateId).maybeSingle()
  if (!template?.is_template) throw new Error('That template no longer exists.')

  const { data: client } = await admin
    .from('clients').select('id').eq('id', clientId).maybeSingle()
  if (!client) throw new Error('That client no longer exists.')

  const { data: newQuoteId, error } = await admin.rpc('copy_quote_for_client', {
    p_source_quote_id: templateId,
    p_client_id: clientId,
  })
  if (error) throw new Error(error.message)

  return { error: null as null, redirectTo: `/admin/quotes/${newQuoteId}` }
})
