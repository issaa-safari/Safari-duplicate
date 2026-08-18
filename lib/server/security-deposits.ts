// Refundable security deposits: fetching and writing (server-only).
//
// Thin, like lib/server/accounting.ts — the decisions live in
// lib/security-deposit.ts, which is pure and tested. This module only fetches
// and inserts/updates security_deposits (group_81).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SecurityDeposit } from '@/lib/types'

const COLUMNS =
  'id, booking_id, booking_traveller_id, motorbike_id, rider_name, amount_usd, method, ' +
  'reference, notes, taken_at, returned_amount_usd, returned_at, retained_reason, ' +
  'created_by, created_at, updated_at'

/** Every deposit taken on a booking, oldest first. */
export async function getBookingDeposits(
  admin: SupabaseClient,
  bookingId: string
): Promise<SecurityDeposit[]> {
  const { data } = await admin
    .from('security_deposits')
    .select(COLUMNS)
    .eq('booking_id', bookingId)
    .order('taken_at', { ascending: true })

  return (data ?? []) as unknown as SecurityDeposit[]
}

/** Every deposit ever taken, across every booking — the finance overview's "held" figure. */
export async function getAllSecurityDeposits(admin: SupabaseClient): Promise<SecurityDeposit[]> {
  const { data } = await admin
    .from('security_deposits')
    .select(COLUMNS)
    .order('taken_at', { ascending: true })

  return (data ?? []) as unknown as SecurityDeposit[]
}
