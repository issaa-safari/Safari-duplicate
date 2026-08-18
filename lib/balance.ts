// What a trip is owed, and what is left to pay.
//
// Pure on purpose. This arithmetic had drifted into six copies — three that
// handled refunds and three that did not — so a refund could reduce the balance
// on one screen and not on another. Everything that shows money now agrees
// because everything calls this.
//
// The fetching half lives in lib/server/accounting.ts.

export type PaymentType = 'deposit' | 'balance' | 'full' | 'partial' | 'refund'

export interface BalanceInput {
  /** What the trip is worth: the invoice total, or the trip price before one exists. */
  invoicedUsd: number
  payments: { amount_usd: number | string; payment_type?: string | null }[]
  /** Deposit share of the total, from company_settings.deposit_percent. */
  depositPercent?: number | null
}

export interface Balance {
  invoicedUsd: number
  receivedUsd: number
  /** Never negative: an overpayment shows as a zero balance, not a debt owed back. */
  balanceUsd: number
  /** 0 when no deposit policy is set, or once enough has been received to cover it. */
  depositDueUsd: number
  paidPercent: number
  isSettled: boolean
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * A refund is money going back out, so it reduces what has been received.
 * This is the one place that rule is written — it had drifted into six
 * copies once already (see the file header), so anywhere that needs "what
 * has this set of payments actually netted" should call this rather than
 * re-writing the reduce.
 */
export function signedPaymentSum(payments: { amount_usd: number | string; payment_type?: string | null }[]): number {
  return round2(
    payments.reduce((sum, p) => {
      const amount = Number(p.amount_usd) || 0
      return p.payment_type === 'refund' ? sum - amount : sum + amount
    }, 0)
  )
}

export function computeBalance({ invoicedUsd, payments, depositPercent }: BalanceInput): Balance {
  const invoiced = round2(Number(invoicedUsd) || 0)
  const received = signedPaymentSum(payments)
  const balance = round2(Math.max(invoiced - received, 0))

  const pct = Number(depositPercent) || 0
  const deposit = pct > 0 ? round2((invoiced * pct) / 100) : 0
  const depositDue = round2(Math.max(Math.min(deposit, invoiced) - received, 0))

  return {
    invoicedUsd: invoiced,
    receivedUsd: received,
    balanceUsd: balance,
    depositDueUsd: depositDue,
    paidPercent: invoiced > 0 ? Math.min(100, Math.round((received / invoiced) * 100)) : 0,
    // A trip with nothing invoiced is not settled — there is simply nothing to
    // settle yet, and calling it paid would mark every draft as complete.
    isSettled: invoiced > 0 && balance === 0,
  }
}
