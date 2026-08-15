'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { getTripBalance, resolveTripRef } from '@/lib/server/accounting'
import { logActivity } from '@/lib/server/audit'

/**
 * What a payment action gives back.
 *
 * These return refusals rather than throwing them. A server action that throws
 * has its message replaced in production builds with Next's generic "an error
 * occurred in the Server Components render" — so the overpayment guard, which
 * exists precisely to tell an operator why the figure was rejected, was showing
 * them nothing usable. Returned values are not redacted.
 */
export type PaymentResult = { error?: string }

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

/**
 * What a freehand invoice (no quote, no booking) has been paid so far — the
 * signed sum of its own trip_payments rows, refunds counted as negative, same
 * convention as lib/balance.ts. There is no "trip" to resolve for one of
 * these, so this reads trip_payments by invoice_id directly rather than going
 * through getTripBalance.
 */
async function getInvoiceReceivedUsd(admin: SupabaseClient, invoiceId: string): Promise<number> {
  const { data } = await admin
    .from('trip_payments')
    .select('amount_usd, payment_type')
    .eq('invoice_id', invoiceId)
  return (data ?? []).reduce((sum, p) => {
    const amt = Number(p.amount_usd) || 0
    return p.payment_type === 'refund' ? sum - amt : sum + amt
  }, 0)
}

/**
 * Record money received against a trip (by quote or booking) or, for a
 * freehand invoice with neither, against the invoice directly (group_83).
 *
 * It used to take a quote id only, which is why a booking made through the
 * website could never be marked as paid — its payment row was written 'pending'
 * at booking time and no screen could touch it again.
 */
export async function recordPayment(formData: FormData): Promise<PaymentResult> {
  const { user, admin } = await authGuard()

  const quoteId = (formData.get('quoteId') as string) || null
  const bookingId = (formData.get('bookingId') as string) || null
  const invoiceId = (formData.get('invoiceId') as string) || null
  const amount = parseFloat(formData.get('amount') as string)
  const paymentType = formData.get('paymentType') as string
  const method = (formData.get('method') as string) || null
  const reference = (formData.get('reference') as string) || null
  const notes = (formData.get('notes') as string) || null
  const receivedAt = formData.get('receivedAt') as string

  if (!quoteId && !bookingId && !invoiceId) {
    return { error: 'A payment must belong to a quote, a booking, or an invoice.' }
  }
  if (isNaN(amount) || amount <= 0) return { error: 'Enter an amount greater than zero.' }
  if (!['deposit', 'balance', 'full', 'partial', 'refund'].includes(paymentType)) {
    return { error: 'Invalid payment type.' }
  }

  // A quote has to be live enough to be taking money. A booking carries no such
  // gate: it exists only once it is confirmed.
  if (quoteId) {
    const { data: quote } = await admin.from('quotes').select('id, status').eq('id', quoteId).single()
    if (!quote) return { error: 'Quote not found.' }
    if (!['accepted', 'sent', 'viewed'].includes(quote.status)) {
      return { error: 'Can only record payment on accepted or active quotes.' }
    }
  }

  // A freehand invoice with no trip behind it: measure the ceiling against its
  // own total rather than a resolvable trip, which doesn't exist for one of these.
  if (!quoteId && !bookingId && invoiceId) {
    const { data: invoice } = await admin.from('invoices').select('id, status, total_usd').eq('id', invoiceId).maybeSingle()
    if (!invoice) return { error: 'Invoice not found.' }
    if (invoice.status !== 'issued') return { error: 'Only an issued invoice can take a payment.' }

    if (paymentType !== 'refund') {
      const receivedUsd = await getInvoiceReceivedUsd(admin, invoiceId)
      const totalUsd = Number(invoice.total_usd) || 0
      if (totalUsd > 0 && receivedUsd + amount > totalUsd + 0.01) {
        return {
          error:
            `This receipt would exceed the invoiced total: invoiced $${totalUsd.toFixed(2)}, ` +
            `already received $${receivedUsd.toFixed(2)}, balance $${(totalUsd - receivedUsd).toFixed(2)}.`,
        }
      }
    }

    const { error } = await admin.from('trip_payments').insert({
      invoice_id: invoiceId,
      amount_usd: amount,
      payment_type: paymentType,
      method: method || null,
      reference: reference || null,
      notes: notes || null,
      received_at: receivedAt || new Date().toISOString().slice(0, 10),
      created_by: user.id,
    })

    if (error) return { error: error.message }
    revalidateTrip(null, null, invoiceId)
    return {}
  }

  const ref = await resolveTripRef(admin, { quoteId, bookingId })

  // Received may never exceed what the trip is worth.
  if (paymentType !== 'refund') {
    const { invoicedUsd, receivedUsd } = await getTripBalance(admin, ref)
    if (invoicedUsd > 0 && receivedUsd + amount > invoicedUsd + 0.01) {
      return {
        error:
          `This receipt would exceed the invoiced total: invoiced $${invoicedUsd.toFixed(2)}, ` +
          `already received $${receivedUsd.toFixed(2)}, balance $${(invoicedUsd - receivedUsd).toFixed(2)}.`,
      }
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

  if (error) return { error: error.message }
  revalidateTrip(ref.quoteId, ref.bookingId)
  return {}
}

/** Every screen that shows a trip's — or a freehand invoice's — money, refreshed after the ledger moves. */
function revalidateTrip(quoteId: string | null, bookingId: string | null, invoiceId?: string | null) {
  revalidatePath('/admin/finance')
  revalidatePath('/admin/finance/receipts')
  revalidatePath('/admin/finance/invoices')
  if (quoteId) revalidatePath(`/admin/quotes/${quoteId}`)
  if (bookingId) revalidatePath(`/admin/bookings/${bookingId}`)
  if (invoiceId) revalidatePath(`/admin/finance/invoices/${invoiceId}`)
}

/**
 * Correct a payment that was entered wrongly.
 *
 * A correction is not a refund. A refund is money genuinely going back to the
 * client and belongs in the ledger as its own row with payment_type 'refund';
 * editing here is for the case where the figure, date or method was simply
 * mistyped. Keeping those separate is what stops "we refunded $500" and "I typed
 * 500 instead of 50" looking identical six months later.
 *
 * The trip a payment belongs to is deliberately not editable — moving money
 * between trips changes two balances at once and deserves its own deliberate
 * action, not a dropdown on a correction form.
 */
export async function updatePayment(formData: FormData): Promise<PaymentResult> {
  const { user, admin } = await authGuard()

  const id = (formData.get('id') as string)?.trim()
  if (!id) return { error: 'Missing payment.' }

  const amount = parseFloat(formData.get('amount') as string)
  const paymentType = formData.get('paymentType') as string
  const method = (formData.get('method') as string) || null
  const reference = (formData.get('reference') as string) || null
  const notes = (formData.get('notes') as string) || null
  const receivedAt = formData.get('receivedAt') as string

  if (isNaN(amount) || amount <= 0) return { error: 'Enter an amount greater than zero.' }
  if (!['deposit', 'balance', 'full', 'partial', 'refund'].includes(paymentType)) {
    return { error: 'Invalid payment type.' }
  }

  const { data: existing } = await admin
    .from('trip_payments')
    .select('id, quote_id, booking_id, invoice_id, amount_usd, payment_type, method, reference, received_at')
    .eq('id', id)
    .maybeSingle()

  if (!existing) return { error: 'Payment not found.' }

  const oldSigned = existing.payment_type === 'refund'
    ? -Number(existing.amount_usd)
    : Number(existing.amount_usd)

  // Same ceiling as recording a new one, but measured *without* this payment —
  // otherwise editing a payment down would still be compared against a total
  // that already includes its old, larger self.
  if (!existing.quote_id && !existing.booking_id && existing.invoice_id) {
    if (paymentType !== 'refund') {
      const { data: invoice } = await admin.from('invoices').select('total_usd').eq('id', existing.invoice_id).maybeSingle()
      const totalUsd = Number(invoice?.total_usd) || 0
      const receivedUsd = await getInvoiceReceivedUsd(admin, existing.invoice_id)
      const receivedWithout = receivedUsd - oldSigned

      if (totalUsd > 0 && receivedWithout + amount > totalUsd + 0.01) {
        return {
          error:
            `That would exceed the invoiced total: invoiced $${totalUsd.toFixed(2)}, ` +
            `other receipts $${receivedWithout.toFixed(2)}.`,
        }
      }
    }
  } else if (paymentType !== 'refund') {
    const ref = { quoteId: existing.quote_id, bookingId: existing.booking_id }
    const { invoicedUsd, receivedUsd } = await getTripBalance(admin, ref)
    const receivedWithout = receivedUsd - oldSigned

    if (invoicedUsd > 0 && receivedWithout + amount > invoicedUsd + 0.01) {
      return {
        error:
          `That would exceed the invoiced total: invoiced $${invoicedUsd.toFixed(2)}, ` +
          `other receipts $${receivedWithout.toFixed(2)}.`,
      }
    }
  }

  const { error } = await admin
    .from('trip_payments')
    .update({
      amount_usd: amount,
      payment_type: paymentType,
      method: method || null,
      reference: reference || null,
      notes: notes || null,
      received_at: receivedAt || existing.received_at,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  await logActivity(admin, {
    entityType: 'trip_payment',
    entityId: id,
    action: 'payment_updated',
    summary: `Payment corrected: $${Number(existing.amount_usd).toFixed(2)} → $${amount.toFixed(2)}`,
    actorId: user.id,
    actorEmail: user.email,
    metadata: {
      before: {
        amount_usd: existing.amount_usd,
        payment_type: existing.payment_type,
        method: existing.method,
        reference: existing.reference,
        received_at: existing.received_at,
      },
      after: { amount_usd: amount, payment_type: paymentType, method, reference, received_at: receivedAt },
    },
  })

  revalidateTrip(existing.quote_id, existing.booking_id, existing.invoice_id)
  return {}
}

/**
 * Remove a payment that should never have been recorded.
 *
 * Hard delete rather than a soft flag, because the row is a mistake rather than
 * an event — a soft-deleted receipt still has to be excluded from every sum, and
 * the exclusion is exactly the sort of thing that gets forgotten in one place.
 * What survives is the activity_log entry written here, which carries the full
 * row, so a deletion is recoverable by hand and never silent.
 */
export async function deletePayment(formData: FormData): Promise<PaymentResult> {
  const { user, admin } = await authGuard()

  const id = (formData.get('id') as string)?.trim()
  if (!id) return { error: 'Missing payment.' }

  const { data: existing } = await admin
    .from('trip_payments')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!existing) return { error: 'Payment not found.' }

  const { error } = await admin.from('trip_payments').delete().eq('id', id)
  if (error) return { error: error.message }

  await logActivity(admin, {
    entityType: 'trip_payment',
    entityId: id,
    action: 'payment_deleted',
    summary: `Payment of $${Number(existing.amount_usd).toFixed(2)} deleted`,
    actorId: user.id,
    actorEmail: user.email,
    metadata: { deleted: existing },
  })

  revalidateTrip(
    existing.quote_id as string | null,
    existing.booking_id as string | null,
    existing.invoice_id as string | null
  )
  return {}
}
