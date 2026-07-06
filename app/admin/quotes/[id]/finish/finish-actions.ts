'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { sendEmail, emailShell, escapeHtml } from '@/lib/email'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

async function baseUrl() {
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

function proposalHtml(subject: string, message: string, url: string, signature: string) {
  return emailShell(
    subject,
    `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>
     <p style="margin:20px 0"><a href="${url}" style="background:#5c6b3c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">View your proposal</a></p>
     ${signature ? `<p style="color:#6E6A59;white-space:pre-wrap">${escapeHtml(signature)}</p>` : ''}`,
  )
}

// Mint a share link for the version, record sender/subject/message on the delivery,
// flip the version to 'sent' (which auto-advances the parent request to Open),
// and email the client the link.
export async function sendQuote(formData: FormData) {
  const { user, admin } = await authGuard()
  const quoteId = (formData.get('quoteId') as string)?.trim()
  const versionId = (formData.get('versionId') as string)?.trim()
  const senderEmail = (formData.get('senderEmail') as string)?.trim() || null
  const recipientEmail = (formData.get('recipientEmail') as string)?.trim()
  const subject = (formData.get('subject') as string)?.trim() || 'Your safari proposal'
  const message = (formData.get('message') as string)?.trim() || ''
  const signature = (formData.get('signature') as string)?.trim() || ''

  if (!quoteId || !versionId) throw new Error('Missing quote or version.')
  if (!recipientEmail) throw new Error('A recipient email is required.')

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 90)

  const { data: delivery, error } = await admin.from('quote_deliveries').insert({
    quote_id: quoteId,
    quote_version_id: versionId,
    channel: 'share_link',
    recipient_email: recipientEmail,
    sender_email: senderEmail,
    subject,
    message,
    expires_at: expiresAt.toISOString(),
    sent_at: new Date().toISOString(),
    created_by: user.id,
  }).select('access_token').single()
  if (error || !delivery) throw new Error(error?.message ?? 'Could not create the share link.')

  // Advancing to 'sent' fires the trigger that moves the request to Open.
  await admin.from('quote_versions')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', versionId)
    .in('status', ['draft', 'ready'])

  const url = `${await baseUrl()}/quote/${delivery.access_token}`
  await sendEmail({ to: recipientEmail, subject, html: proposalHtml(subject, message, url, signature), replyTo: senderEmail ?? undefined })

  redirect(`/admin/quotes/${quoteId}?sent=1`)
}

// Send the same proposal email to the sender for a dry run. Does not create a
// share link or change status. Returns whether the provider accepted it.
export async function sendTestEmail(formData: FormData): Promise<{ ok: boolean; reason?: string }> {
  await authGuard()
  const senderEmail = (formData.get('senderEmail') as string)?.trim()
  const subject = (formData.get('subject') as string)?.trim() || 'Your safari proposal'
  const message = (formData.get('message') as string)?.trim() || ''
  const signature = (formData.get('signature') as string)?.trim() || ''
  if (!senderEmail) return { ok: false, reason: 'Enter a sender email to receive the test.' }

  const url = `${await baseUrl()}/quote/TEST-LINK`
  const ok = await sendEmail({
    to: senderEmail,
    subject: `[TEST] ${subject}`,
    html: proposalHtml(subject, message, url, signature),
  })
  return ok ? { ok: true } : { ok: false, reason: 'Email provider not configured (RESEND_API_KEY unset) or send failed.' }
}
