'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { syncQuoteStatus } from '@/lib/server/quote-status'
import { sendEmail, emailShell, escapeHtml } from '@/lib/email'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

export async function createShareLink(formData: FormData) {
  const { user, admin } = await authGuard()
  const quoteId = formData.get('quoteId') as string
  const versionId = formData.get('versionId') as string

  const { data: version } = await admin
    .from('quote_versions')
    .select('id, status, quote_id')
    .eq('id', versionId)
    .eq('quote_id', quoteId)
    .single()

  if (!version) throw new Error('Version not found.')
  if (!['ready', 'sent', 'viewed'].includes(version.status)) {
    throw new Error('Only ready, sent, or viewed versions can be shared.')
  }

  // Set expiry 90 days out
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 90)

  const { data: delivery, error } = await admin.from('quote_deliveries').insert({
    quote_id: quoteId,
    quote_version_id: versionId,
    channel: 'share_link',
    expires_at: expiresAt.toISOString(),
    sent_at: new Date().toISOString(),
    created_by: user.id,
  }).select('id, access_token').single()

  if (error) throw new Error(error.message)

  // Move version to 'sent' if it's still 'ready'
  if (version.status === 'ready') {
    await admin.from('quote_versions').update({ status: 'sent' }).eq('id', versionId)
    await syncQuoteStatus(admin, quoteId)
  }

  revalidatePath(`/admin/quotes/${quoteId}`)
  return { token: delivery.access_token }
}

export async function emailQuote(formData: FormData) {
  const { user, admin } = await authGuard()
  const quoteId = formData.get('quoteId') as string
  const versionId = formData.get('versionId') as string
  const baseUrl = formData.get('baseUrl') as string

  const { data: version } = await admin
    .from('quote_versions')
    .select('id, status, quote_id, title')
    .eq('id', versionId)
    .eq('quote_id', quoteId)
    .single()

  if (!version) throw new Error('Version not found.')
  if (!['ready', 'sent', 'viewed'].includes(version.status)) {
    throw new Error('Only ready, sent, or viewed versions can be emailed.')
  }

  const { data: quote } = await admin
    .from('quotes')
    .select('quote_number, client_id')
    .eq('id', quoteId)
    .single()

  const { data: client } = quote?.client_id
    ? await admin.from('clients').select('first_name, last_name, email').eq('id', quote.client_id).single()
    : { data: null }

  const recipient = client?.email?.trim()
  if (!recipient) throw new Error('This quote has no client email to send to. Add an email on the client record first.')

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 90)

  const { data: delivery, error } = await admin.from('quote_deliveries').insert({
    quote_id: quoteId,
    quote_version_id: versionId,
    channel: 'email',
    recipient_email: recipient,
    expires_at: expiresAt.toISOString(),
    sent_at: new Date().toISOString(),
    created_by: user.id,
  }).select('id, access_token').single()

  if (error) throw new Error(error.message)

  const link = `${baseUrl}/quote/${delivery.access_token}`
  const clientName = client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() : ''
  const heading = version.title ? version.title : 'Your safari proposal is ready'
  const html = emailShell(heading, `
    <p style="font-size:14px;margin:0 0 12px">${clientName ? `Hello ${escapeHtml(clientName)},` : 'Hello,'}</p>
    <p style="font-size:14px;margin:0 0 20px">Your proposal${quote?.quote_number ? ` (${escapeHtml(quote.quote_number)})` : ''} is ready to view. Click below to open your personalised itinerary and pricing.</p>
    <p style="margin:0 0 20px"><a href="${escapeHtml(link)}" style="background:#7A9A4A;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px;display:inline-block">View your proposal</a></p>
    <p style="font-size:12px;color:#6E6A59;margin:0">Or paste this link into your browser:<br>${escapeHtml(link)}</p>
  `)

  const emailed = await sendEmail({
    to: recipient,
    subject: `Your safari proposal${quote?.quote_number ? ` (${quote.quote_number})` : ''}`,
    html,
  })

  if (version.status === 'ready') {
    await admin.from('quote_versions').update({ status: 'sent' }).eq('id', versionId)
    await syncQuoteStatus(admin, quoteId)
  }

  revalidatePath(`/admin/quotes/${quoteId}`)
  return { token: delivery.access_token, recipient, emailed }
}

export async function revokeDelivery(formData: FormData) {
  const { admin } = await authGuard()
  const deliveryId = formData.get('deliveryId') as string
  const quoteId = formData.get('quoteId') as string

  const { error } = await admin.from('quote_deliveries')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', deliveryId)
    .eq('quote_id', quoteId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}`)
}
