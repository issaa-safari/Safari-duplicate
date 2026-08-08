'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { getTripBalance, resolveTripRef } from '@/lib/server/accounting'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

/**
 * Record money received against a trip, identified by its quote or its booking.
 *
 * It used to take a quote id only, which is why a booking made through the
 * website could never be marked as paid — its payment row was written 'pending'
 * at booking time and no screen could touch it again.
 */
export async function recordPayment(formData: FormData) {
  const { user, admin } = await authGuard()

  const quoteId = (formData.get('quoteId') as string) || null
  const bookingId = (formData.get('bookingId') as string) || null
  const amount = parseFloat(formData.get('amount') as string)
  const paymentType = formData.get('paymentType') as string
  const method = (formData.get('method') as string) || null
  const reference = (formData.get('reference') as string) || null
  const notes = (formData.get('notes') as string) || null
  const receivedAt = formData.get('receivedAt') as string

  if (!quoteId && !bookingId) throw new Error('A payment must belong to a quote or a booking.')
  if (isNaN(amount) || amount <= 0) throw new Error('Invalid payment data.')
  if (!['deposit', 'balance', 'full', 'partial', 'refund'].includes(paymentType)) {
    throw new Error('Invalid payment type.')
  }

  // A quote has to be live enough to be taking money. A booking carries no such
  // gate: it exists only once it is confirmed.
  if (quoteId) {
    const { data: quote } = await admin.from('quotes').select('id, status').eq('id', quoteId).single()
    if (!quote) throw new Error('Quote not found.')
    if (!['accepted', 'sent', 'viewed'].includes(quote.status)) {
      throw new Error('Can only record payment on accepted or active quotes.')
    }
  }

  const ref = await resolveTripRef(admin, { quoteId, bookingId })

  // Received may never exceed what the trip is worth.
  if (paymentType !== 'refund') {
    const { invoicedUsd, receivedUsd } = await getTripBalance(admin, ref)
    if (invoicedUsd > 0 && receivedUsd + amount > invoicedUsd + 0.01) {
      throw new Error(
        `This receipt would exceed the invoiced total: invoiced $${invoicedUsd.toFixed(2)}, ` +
        `already received $${receivedUsd.toFixed(2)}, balance $${(invoicedUsd - receivedUsd).toFixed(2)}.`,
      )
    }
  }

  const { error } = await admin.from('trip_payments').insert({
    quote_id: ref.quoteId,
    booking_id: ref.bookingId,
    amount_usd: amount,
    payment_type: paymentType,
    method: method || null,
    reference: reference || null,
    notes: notes || null,
    received_at: receivedAt || new Date().toISOString().slice(0, 10),
    created_by: user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/finance')
  revalidatePath('/admin/finance/receipts')
  if (ref.quoteId) revalidatePath(`/admin/quotes/${ref.quoteId}`)
  if (ref.bookingId) revalidatePath(`/admin/bookings/${ref.bookingId}`)
}
