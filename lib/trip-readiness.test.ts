import { describe, expect, it } from 'vitest'
import { calculateTripReadiness } from './trip-readiness'

const ready = {
  travellers: 4,
  passports: 4,
  arrivals: 4,
  riders: 4,
  bikes: 4,
  agreements: 4,
  tasks: 6,
  openTasks: 0,
  vouchers: 2,
  confirmedVouchers: 2,
  bookingValueUsd: 8_000,
  paidUsd: 8_000,
}

describe('calculateTripReadiness', () => {
  it('returns ready only when every operational area is complete', () => {
    expect(calculateTripReadiness(ready)).toEqual({ score: 100, label: 'Ready', blockers: [] })
  })

  it('does not penalise trips without riders for bike allocation', () => {
    const result = calculateTripReadiness({ ...ready, riders: 0, bikes: 0 })
    expect(result.score).toBe(100)
  })

  it('reports the operational blockers behind a partial score', () => {
    const result = calculateTripReadiness({
      ...ready,
      passports: 2,
      arrivals: 3,
      agreements: 1,
      openTasks: 2,
      confirmedVouchers: 1,
      paidUsd: 4_000,
    })
    expect(result.score).toBeLessThan(85)
    expect(result.blockers).toEqual(expect.arrayContaining([
      '2 passports missing',
      '1 arrival missing',
      '3 agreements unsigned',
      '2 open tasks',
      '1 voucher unconfirmed',
      'Payment balance outstanding',
    ]))
  })

  it('shows not started when no travellers exist', () => {
    expect(calculateTripReadiness({ ...ready, travellers: 0 })).toEqual({
      score: 0,
      label: 'Not started',
      blockers: ['No travellers booked'],
    })
  })
})
