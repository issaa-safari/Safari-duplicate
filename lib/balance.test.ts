import { describe, expect, it } from 'vitest'
import { computeBalance, signedPaymentSum } from './balance'

const pay = (amount: number, type = 'partial') => ({ amount_usd: amount, payment_type: type })

describe('signedPaymentSum', () => {
  it('sums plain payments', () => {
    expect(signedPaymentSum([pay(100), pay(50)])).toBe(150)
  })

  it('treats a refund as negative', () => {
    expect(signedPaymentSum([pay(200, 'full'), pay(50, 'refund')])).toBe(150)
  })

  it('is zero for an empty list', () => {
    expect(signedPaymentSum([])).toBe(0)
  })
})

describe('computeBalance', () => {
  it('reports the whole total outstanding when nothing has been paid', () => {
    const b = computeBalance({ invoicedUsd: 2160, payments: [] })
    expect(b).toMatchObject({ receivedUsd: 0, balanceUsd: 2160, paidPercent: 0, isSettled: false })
  })

  it('subtracts a part payment', () => {
    const b = computeBalance({ invoicedUsd: 2160, payments: [pay(648, 'deposit')] })
    expect(b.receivedUsd).toBe(648)
    expect(b.balanceUsd).toBe(1512)
    expect(b.paidPercent).toBe(30)
    expect(b.isSettled).toBe(false)
  })

  it('settles when the total is met', () => {
    const b = computeBalance({ invoicedUsd: 2160, payments: [pay(648, 'deposit'), pay(1512, 'balance')] })
    expect(b.balanceUsd).toBe(0)
    expect(b.isSettled).toBe(true)
  })

  it('treats a refund as money going back out', () => {
    // This is the half that three of the six original copies got wrong: they
    // summed every row, so refunding a client made their balance *fall*.
    const b = computeBalance({ invoicedUsd: 2160, payments: [pay(2160, 'full'), pay(500, 'refund')] })
    expect(b.receivedUsd).toBe(1660)
    expect(b.balanceUsd).toBe(500)
    expect(b.isSettled).toBe(false)
  })

  it('never reports a negative balance on an overpayment', () => {
    const b = computeBalance({ invoicedUsd: 1000, payments: [pay(1200)] })
    expect(b.receivedUsd).toBe(1200)
    expect(b.balanceUsd).toBe(0)
    expect(b.paidPercent).toBe(100)
    expect(b.isSettled).toBe(true)
  })

  it('is not settled when there is nothing to settle', () => {
    // A trip with no price yet must not read as paid in full.
    expect(computeBalance({ invoicedUsd: 0, payments: [] }).isSettled).toBe(false)
    expect(computeBalance({ invoicedUsd: 0, payments: [] }).paidPercent).toBe(0)
  })

  it('accepts numeric strings, which is how Postgres returns numeric columns', () => {
    const b = computeBalance({ invoicedUsd: 2160, payments: [{ amount_usd: '648.00', payment_type: 'deposit' }] })
    expect(b.receivedUsd).toBe(648)
    expect(b.balanceUsd).toBe(1512)
  })

  it('ignores rows with an unusable amount rather than producing NaN', () => {
    const b = computeBalance({
      invoicedUsd: 500,
      payments: [{ amount_usd: 100 }, { amount_usd: null as unknown as number }],
    })
    expect(b.receivedUsd).toBe(100)
    expect(b.balanceUsd).toBe(400)
  })

  describe('deposit due', () => {
    it('is the deposit share while nothing has been received', () => {
      const b = computeBalance({ invoicedUsd: 2000, payments: [], depositPercent: 30 })
      expect(b.depositDueUsd).toBe(600)
    })

    it('falls as money arrives, and reaches zero once covered', () => {
      expect(computeBalance({ invoicedUsd: 2000, payments: [pay(200)], depositPercent: 30 }).depositDueUsd).toBe(400)
      expect(computeBalance({ invoicedUsd: 2000, payments: [pay(600)], depositPercent: 30 }).depositDueUsd).toBe(0)
      expect(computeBalance({ invoicedUsd: 2000, payments: [pay(1900)], depositPercent: 30 }).depositDueUsd).toBe(0)
    })

    it('is zero when no deposit policy is set', () => {
      expect(computeBalance({ invoicedUsd: 2000, payments: [] }).depositDueUsd).toBe(0)
      expect(computeBalance({ invoicedUsd: 2000, payments: [], depositPercent: 0 }).depositDueUsd).toBe(0)
    })

    it('never asks for more than the trip costs', () => {
      // A misconfigured policy above 100% must not invent money.
      expect(computeBalance({ invoicedUsd: 1000, payments: [], depositPercent: 150 }).depositDueUsd).toBe(1000)
    })
  })

  it('rounds to cents rather than carrying float noise', () => {
    const b = computeBalance({ invoicedUsd: 0.1 + 0.2, payments: [pay(0.1)] })
    expect(b.invoicedUsd).toBe(0.3)
    expect(b.balanceUsd).toBe(0.2)
  })
})
