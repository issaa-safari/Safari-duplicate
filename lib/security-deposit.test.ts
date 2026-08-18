import { describe, expect, it } from 'vitest'
import {
  depositState,
  retainedUsd,
  summariseDeposits,
  validateReturn,
} from './security-deposit'
import { computeBalance } from './balance'

const held = (amount: number) => ({ amount_usd: amount, returned_amount_usd: 0, returned_at: null })
const settled = (amount: number, back: number, on = '2026-08-01') => ({
  amount_usd: amount,
  returned_amount_usd: back,
  returned_at: on,
})

describe('depositState', () => {
  it('is held while there is no return date', () => {
    expect(depositState(held(500))).toBe('held')
  })

  it('is returned when the whole amount went back', () => {
    expect(depositState(settled(500, 500))).toBe('returned')
  })

  it('is part-retained when some was kept', () => {
    expect(depositState(settled(500, 350))).toBe('part-retained')
  })

  it('reads the date, not the amounts', () => {
    // The constraint in group_81 forbids this row, but the rule is worth pinning:
    // a deposit with no return date is held no matter what the amount column says.
    expect(depositState({ amount_usd: 500, returned_amount_usd: 500, returned_at: null })).toBe('held')
  })

  it('treats returning nothing at all as fully retained', () => {
    expect(depositState(settled(500, 0))).toBe('part-retained')
    expect(retainedUsd(settled(500, 0))).toBe(500)
  })
})

describe('retainedUsd', () => {
  it('is zero while the deposit is still held', () => {
    expect(retainedUsd(held(500))).toBe(0)
  })

  it('is the shortfall once settled', () => {
    expect(retainedUsd(settled(500, 350))).toBe(150)
  })

  it('rounds to cents', () => {
    expect(retainedUsd(settled(100, 33.333))).toBe(66.67)
  })
})

describe('summariseDeposits', () => {
  it('is all zeroes for a booking with none', () => {
    expect(summariseDeposits([])).toMatchObject({
      heldUsd: 0, returnedUsd: 0, retainedUsd: 0, takenUsd: 0, count: 0, heldCount: 0,
    })
  })

  it('separates what is held from what is settled', () => {
    // Two riders: one still out on the bike, one back with a cracked pannier.
    const s = summariseDeposits([held(500), settled(500, 350)])
    expect(s).toMatchObject({
      heldUsd: 500,
      returnedUsd: 350,
      retainedUsd: 150,
      takenUsd: 1000,
      count: 2,
      heldCount: 1,
    })
  })

  it('does not count a held deposit as returned or retained', () => {
    const s = summariseDeposits([held(500), held(500)])
    expect(s.heldUsd).toBe(1000)
    expect(s.returnedUsd).toBe(0)
    expect(s.retainedUsd).toBe(0)
  })

  it('copes with numeric columns arriving as strings', () => {
    // Postgres numeric comes back as a string through PostgREST.
    const s = summariseDeposits([
      { amount_usd: '500.00', returned_amount_usd: '0', returned_at: null },
      { amount_usd: '250.50', returned_amount_usd: '200.50', returned_at: '2026-08-01' },
    ])
    expect(s.heldUsd).toBe(500)
    expect(s.returnedUsd).toBe(200.5)
    expect(s.retainedUsd).toBe(50)
  })
})

describe('validateReturn', () => {
  it('accepts a full return', () => {
    expect(validateReturn(held(500), { returnedAmountUsd: 500 })).toBeNull()
  })

  it('accepts a partial return with a reason', () => {
    expect(
      validateReturn(held(500), { returnedAmountUsd: 350, retainedReason: 'Cracked pannier' })
    ).toBeNull()
  })

  it('refuses a partial return with no reason', () => {
    expect(validateReturn(held(500), { returnedAmountUsd: 350 })).toMatch(/why/i)
    expect(validateReturn(held(500), { returnedAmountUsd: 350, retainedReason: '   ' })).toMatch(/why/i)
  })

  it('refuses returning more than was taken', () => {
    expect(validateReturn(held(500), { returnedAmountUsd: 600 })).toMatch(/more than/i)
  })

  it('refuses a negative amount', () => {
    expect(validateReturn(held(500), { returnedAmountUsd: -1 })).toMatch(/how much/i)
  })

  it('refuses settling the same deposit twice', () => {
    expect(validateReturn(settled(500, 500), { returnedAmountUsd: 500 })).toMatch(/already/i)
  })
})

describe('deposits and the trip balance', () => {
  // The whole reason security_deposits is its own table rather than a
  // payment_type on trip_payments. If a deposit ever reached computeBalance, an
  // unpaid trip would read as settled the moment a rider handed over cash for
  // the bike.
  it('leaves the trip balance untouched', () => {
    const payments = [{ amount_usd: 600, payment_type: 'deposit' }]
    const withoutDeposits = computeBalance({ invoicedUsd: 2000, payments })

    // Deposits are simply not in the payments array — they are a different query.
    summariseDeposits([held(500), settled(500, 350)])

    const after = computeBalance({ invoicedUsd: 2000, payments })
    expect(after).toEqual(withoutDeposits)
    expect(after.balanceUsd).toBe(1400)
    expect(after.isSettled).toBe(false)
  })
})
