// Refundable security deposits: what state each one is in, and what we are
// holding in total.
//
// Pure, like lib/balance.ts and lib/invoice.ts. The fetching half lives in
// lib/server/security-deposits.ts.
//
// The one thing worth stating loudly: none of this touches `computeBalance`.
// A deposit is money held on a rider's behalf, not money received for a trip, so
// it must never move a trip's balance in either direction. lib/balance.test.ts
// asserts that from the other side.

export interface DepositLike {
  amount_usd: number | string
  returned_amount_usd?: number | string | null
  returned_at?: string | null
}

/**
 * `held`         — still with us, nothing given back.
 * `returned`     — the whole amount went back to the rider.
 * `part-retained`— settled, but some was kept (damage). See `retained_reason`.
 *
 * Derived from `returned_at`, never stored: a deposit with no return date is
 * held, whatever the amounts say. group_81 has a check constraint enforcing
 * that a null `returned_at` means nothing was returned.
 */
export type DepositState = 'held' | 'returned' | 'part-retained'

const round2 = (n: number) => Math.round(n * 100) / 100
const num = (v: number | string | null | undefined) => Number(v ?? 0) || 0

export function depositState(deposit: DepositLike): DepositState {
  if (!deposit.returned_at) return 'held'
  return num(deposit.returned_amount_usd) >= num(deposit.amount_usd) ? 'returned' : 'part-retained'
}

/** What was kept back from a single deposit. Zero unless it is part-retained. */
export function retainedUsd(deposit: DepositLike): number {
  if (!deposit.returned_at) return 0
  return round2(Math.max(num(deposit.amount_usd) - num(deposit.returned_amount_usd), 0))
}

export interface DepositSummary {
  /** Cash we are still sitting on. This is the liability figure. */
  heldUsd: number
  /** Given back to riders. */
  returnedUsd: number
  /** Kept against damage. Revenue, but only once someone books it as such. */
  retainedUsd: number
  /** Everything ever taken on this booking, settled or not. */
  takenUsd: number
  count: number
  heldCount: number
}

export function summariseDeposits(deposits: DepositLike[]): DepositSummary {
  let heldUsd = 0
  let returnedUsd = 0
  let retained = 0
  let takenUsd = 0
  let heldCount = 0

  for (const d of deposits) {
    const amount = num(d.amount_usd)
    takenUsd += amount

    if (!d.returned_at) {
      heldUsd += amount
      heldCount += 1
      continue
    }
    returnedUsd += num(d.returned_amount_usd)
    retained += retainedUsd(d)
  }

  return {
    heldUsd: round2(heldUsd),
    returnedUsd: round2(returnedUsd),
    retainedUsd: round2(retained),
    takenUsd: round2(takenUsd),
    count: deposits.length,
    heldCount,
  }
}

/**
 * Validate a proposed return before it reaches the database. The same rules the
 * group_81 check constraints enforce, phrased for a human — a constraint
 * violation surfaces as raw SQL text, which is not something to show an operator.
 *
 * Returns an error message, or null when the return is fine.
 */
export function validateReturn(
  deposit: DepositLike,
  input: { returnedAmountUsd: number; retainedReason?: string | null }
): string | null {
  if (deposit.returned_at) return 'This deposit has already been settled.'

  const amount = num(deposit.amount_usd)
  const returning = input.returnedAmountUsd

  if (!isFinite(returning) || returning < 0) return 'Enter how much is going back to the rider.'
  if (round2(returning) > round2(amount)) {
    return `You cannot return more than the $${amount.toFixed(2)} taken.`
  }
  if (round2(returning) < round2(amount) && !input.retainedReason?.trim()) {
    return 'Say why part of the deposit is being kept — it is the only record of the damage.'
  }
  return null
}
