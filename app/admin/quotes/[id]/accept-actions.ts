'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { acceptQuoteAtomically, mapQuoteAcceptanceError } from '@/lib/server/quote-booking'
import { logActivity } from '@/lib/server/audit'
import { revalidatePath } from 'next/cache'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Your session has expired — please log in again.')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

// Accept on behalf uses the same transactional operation as the public portal.
// Only the authenticated admin guard and version-selection step differ.
export async function acceptQuoteOnBehalf(quoteId: string) {
  const { user, admin } = await authGuard()

  const { data: quote } = await admin
    .from('quotes')
    .select('id, client_id')
    .eq('id', quoteId)
    .single()
  if (!quote) throw new Error('Quote not found.')

  const [{ data: version }, { data: client }] = await Promise.all([
    admin
      .from('quote_versions')
      .select('id, version_number')
      .eq('quote_id', quoteId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
    quote.client_id
      ? admin.from('clients').select('first_name, last_name').eq('id', quote.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  if (!version) throw new Error('This quote has no version to accept.')

  const clientName = client
    ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()
    : 'Accepted by operator'

  let accepted
  try {
    accepted = await acceptQuoteAtomically(admin, {
      quoteId,
      versionId: version.id,
      clientName,
      userAgent: `admin:${user.email ?? 'operator'} (on behalf)`,
      isAdmin: true,
    })
  } catch (error) {
    const mapped = mapQuoteAcceptanceError(error)
    throw new Error(mapped.error)
  }

  await logActivity(admin, {
    entityType: 'quote',
    action: 'accepted_on_behalf',
    summary: `Accepted quote on behalf of ${clientName}`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { quoteId, versionId: version.id, bookingId: accepted.bookingId },
  })

  revalidatePath(`/admin/quotes/${quoteId}`)
  revalidatePath('/admin/bookings')
  revalidatePath('/admin/quotes')
  revalidatePath('/admin/departures')
  revalidatePath(`/admin/departures/${accepted.departureId}`)
}
