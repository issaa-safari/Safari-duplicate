'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { logActivity } from '@/lib/server/audit'
import { safeAction, type ActionResult } from '@/lib/server/action-result'
import { validateReturn } from '@/lib/security-deposit'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

/**
 * Take a refundable security deposit from a rider. Not a trip payment — see
 * migrations/group_81_security_deposits.sql for why this is its own table and
 * must never reach lib/balance.ts.
 */
const takeDepositImpl = safeAction(async (formData: FormData) => {
  const { user, admin } = await authGuard()

  const bookingId = String(formData.get('bookingId') ?? '')
  if (!bookingId) throw new Error('Missing booking.')

  const riderName = String(formData.get('riderName') ?? '').trim()
  if (!riderName) throw new Error("Enter the rider's name.")

  const amountUsd = parseFloat(String(formData.get('amountUsd') ?? ''))
  if (isNaN(amountUsd) || amountUsd <= 0) throw new Error('Enter how much was taken.')

  const travellerId = String(formData.get('bookingTravellerId') ?? '').trim() || null
  const motorbikeId = String(formData.get('motorbikeId') ?? '').trim() || null
  const method = String(formData.get('method') ?? '').trim() || null
  const reference = String(formData.get('reference') ?? '').trim() || null
  const notes = String(formData.get('notes') ?? '').trim() || null
  const takenAtRaw = String(formData.get('takenAt') ?? '').trim()
  const takenAt = takenAtRaw || new Date().toISOString().slice(0, 10)

  const { error } = await admin.from('security_deposits').insert({
    booking_id: bookingId,
    booking_traveller_id: travellerId,
    motorbike_id: motorbikeId,
    rider_name: riderName,
    amount_usd: amountUsd,
    method,
    reference,
    notes,
    taken_at: takenAt,
    created_by: user.id,
  })
  if (error) throw new Error(error.message)

  await logActivity(admin, {
    entityType: 'booking',
    entityId: bookingId,
    action: 'security_deposit_taken',
    summary: `Took a $${amountUsd.toFixed(2)} security deposit from ${riderName}`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { amountUsd, riderName },
  })

  revalidatePath(`/admin/bookings/${bookingId}`)
})

export async function takeDeposit(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return takeDepositImpl(formData)
}

/**
 * Settle a held deposit: give it all back, or keep part of it against damage.
 * `retainedReason` is required whenever less than the full amount goes back —
 * lib/security-deposit.ts.validateReturn enforces the same rule the group_81
 * check constraint does, phrased for a human rather than raw SQL text.
 */
const returnDepositImpl = safeAction(async (formData: FormData) => {
  const { user, admin } = await authGuard()

  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('Missing deposit.')

  const { data: deposit } = await admin
    .from('security_deposits')
    .select('id, booking_id, amount_usd, returned_at, rider_name')
    .eq('id', id)
    .maybeSingle()
  if (!deposit) throw new Error('Deposit not found.')

  const returnedAmountUsd = parseFloat(String(formData.get('returnedAmountUsd') ?? ''))
  const retainedReason = String(formData.get('retainedReason') ?? '').trim() || null

  const validationError = validateReturn(deposit, { returnedAmountUsd, retainedReason })
  if (validationError) throw new Error(validationError)

  const { error } = await admin
    .from('security_deposits')
    .update({
      returned_amount_usd: returnedAmountUsd,
      returned_at: new Date().toISOString().slice(0, 10),
      retained_reason: retainedReason,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)

  const retained = Number(deposit.amount_usd) - returnedAmountUsd
  await logActivity(admin, {
    entityType: 'booking',
    entityId: deposit.booking_id,
    action: 'security_deposit_returned',
    summary: retained > 0
      ? `Returned $${returnedAmountUsd.toFixed(2)} of ${deposit.rider_name}'s deposit, kept $${retained.toFixed(2)}`
      : `Returned ${deposit.rider_name}'s deposit in full`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { returnedAmountUsd, retained, retainedReason },
  })

  revalidatePath(`/admin/bookings/${deposit.booking_id}`)
})

export async function returnDeposit(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return returnDepositImpl(formData)
}
