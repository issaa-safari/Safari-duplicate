'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { createBookingFromAcceptedQuote } from '@/lib/server/quote-booking'
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

// Accept a quote on the client's behalf from the back office — the admin-side
// equivalent of a portal acceptance. Records the acceptance, flips the quote +
// version to accepted, and creates a confirmed, manifest-ready booking.
export async function acceptQuoteOnBehalf(quoteId: string) {
  const { user, admin } = await authGuard()

  const { data: quote } = await admin
    .from('quotes')
    .select('id, status, client_id, request_id, accepted_version_id')
    .eq('id', quoteId)
    .single()
  if (!quote) throw new Error('Quote not found.')
  if (quote.status === 'accepted') throw new Error('This quote is already accepted.')
  if (!quote.client_id) throw new Error('Attach a client to this quote before accepting.')

  // Target the latest version.
  const { data: version } = await admin
    .from('quote_versions')
    .select('id, status, version_number')
    .eq('quote_id', quoteId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!version) throw new Error('This quote has no version to accept.')
  if (version.status === 'accepted') throw new Error('This quote is already accepted.')

  // A booking only makes sense once the itinerary exists.
  const { count: dayCount } = await admin
    .from('quote_days')
    .select('id', { count: 'exact', head: true })
    .eq('quote_version_id', version.id)
  if (!dayCount || dayCount < 1) {
    throw new Error('Build the day-by-day itinerary before accepting this quote.')
  }

  // Guard against an existing acceptance (unique on quote_version_id).
  const { data: already } = await admin
    .from('quote_acceptances').select('id').eq('quote_id', quoteId).limit(1).maybeSingle()
  if (already) throw new Error('This quote already has an acceptance on record.')

  const { data: client } = await admin
    .from('clients').select('first_name, last_name, email').eq('id', quote.client_id).single()
  const clientName = client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() : ''

  const { error: acceptError } = await admin.from('quote_acceptances').insert({
    quote_id: quoteId,
    quote_version_id: version.id,
    client_name: clientName || 'Accepted by operator',
    client_email: client?.email ?? null,
    terms_accepted: true,
    user_agent: `admin:${user.email ?? 'operator'} (on behalf)`,
  })
  if (acceptError) throw new Error(acceptError.message)

  await admin.from('quote_versions')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', version.id)
  await admin.from('quotes')
    .update({ status: 'accepted', accepted_version_id: version.id })
    .eq('id', quoteId)

  // Create the confirmed, manifest-ready booking (idempotent, best-effort).
  try {
    await createBookingFromAcceptedQuote(admin, quoteId, version.id)
  } catch (e) {
    console.error('[accept-on-behalf] booking creation skipped', e)
  }

  // Advance the linked request to 'booked' (fires the booking task checklist).
  if (quote.request_id) {
    try {
      await admin.from('requests').update({ stage: 'booked' }).eq('id', quote.request_id)
    } catch (e) {
      console.error('[accept-on-behalf] request stage advance skipped', e)
    }
  }

  await logActivity(admin, {
    entityType: 'quote',
    action: 'accepted_on_behalf',
    summary: `Accepted quote on behalf of ${clientName || 'client'}`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { quoteId, versionId: version.id },
  })

  revalidatePath(`/admin/quotes/${quoteId}`)
  revalidatePath('/admin/bookings')
  revalidatePath('/admin/quotes')
}
