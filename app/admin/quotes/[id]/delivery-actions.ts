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
  }

  revalidatePath(`/admin/quotes/${quoteId}`)
  return { token: delivery.access_token }
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
