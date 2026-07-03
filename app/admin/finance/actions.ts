'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
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

export async function recordPayment(formData: FormData) {
  const { user, admin } = await authGuard()

  const quoteId = formData.get('quoteId') as string
  const amount = parseFloat(formData.get('amount') as string)
  const paymentType = formData.get('paymentType') as string
  const method = (formData.get('method') as string) || null
  const reference = (formData.get('reference') as string) || null
  const notes = (formData.get('notes') as string) || null
  const receivedAt = formData.get('receivedAt') as string

  if (!quoteId || isNaN(amount) || amount <= 0) throw new Error('Invalid payment data.')
  if (!['deposit', 'balance', 'full', 'partial', 'refund'].includes(paymentType)) {
    throw new Error('Invalid payment type.')
  }

  const { data: quote } = await admin.from('quotes').select('id, status').eq('id', quoteId).single()
  if (!quote) throw new Error('Quote not found.')
  if (!['accepted', 'sent', 'viewed'].includes(quote.status)) {
    throw new Error('Can only record payment on accepted or active quotes.')
  }

  // Received may never exceed invoiced (the accepted version's selling total).
  if (paymentType !== 'refund') {
    const [{ data: acceptedVersion }, { data: existingPayments }] = await Promise.all([
      admin.from('quote_versions')
        .select('total_selling_usd')
        .eq('quote_id', quoteId)
        .eq('status', 'accepted')
        .maybeSingle(),
      admin.from('quote_payments').select('amount_usd, payment_type').eq('quote_id', quoteId),
    ])
    const invoiced = Number(acceptedVersion?.total_selling_usd ?? 0)
    if (invoiced > 0) {
      const received = (existingPayments ?? []).reduce(
        (s: number, p: { amount_usd: number; payment_type: string | null }) =>
          p.payment_type === 'refund' ? s - Number(p.amount_usd) : s + Number(p.amount_usd), 0)
      if (received + amount > invoiced + 0.01) {
        throw new Error(
          `This receipt would exceed the invoiced total: invoiced $${invoiced.toFixed(2)}, ` +
          `already received $${received.toFixed(2)}, balance $${(invoiced - received).toFixed(2)}.`,
        )
      }
    }
  }

  const { error } = await admin.from('quote_payments').insert({
    quote_id: quoteId,
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
  revalidatePath(`/admin/quotes/${quoteId}`)
}
