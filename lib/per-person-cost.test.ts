import { describe, expect, it } from 'vitest'
import {
  allocateWeighted,
  computePerPersonCost,
  type PerPersonCostInput,
  type PerPersonTraveller,
} from './per-person-cost'

const A1: PerPersonTraveller = { id: 'a1', category: 'adult' }
const A2: PerPersonTraveller = { id: 'a2', category: 'adult' }
const C1: PerPersonTraveller = { id: 'c1', category: 'child', age: 8 }
const I1: PerPersonTraveller = { id: 'i1', category: 'infant', age: 1 }

function input(over: Partial<PerPersonCostInput> = {}): PerPersonCostInput {
  return {
    travellers: [A1, A2],
    accommodations: [],
    sharedLines: [],
    parkFees: [],
    ...over,
  }
}

describe('allocateWeighted', () => {
  it('splits evenly and sums exactly to the total', () => {
    const parts = allocateWeighted(100, [1, 1, 1])
    expect(parts.reduce((s, x) => s + x, 0)).toBe(100)
    // 100/3 = 33.33/33.33/33.34 — leftover cent goes to the first
    expect(parts).toEqual([33.34, 33.33, 33.33])
  })

  it('distributes leftover cents by largest fractional remainder', () => {
    const parts = allocateWeighted(10, [1, 1, 1])
    expect(parts.reduce((s, x) => s + x, 0)).toBe(10)
    expect(parts).toEqual([3.34, 3.33, 3.33])
  })

  it('honours weights', () => {
    const parts = allocateWeighted(300, [2, 1])
    expect(parts).toEqual([200, 100])
  })

  it('falls back to an even split when all weights are zero', () => {
    const parts = allocateWeighted(100, [0, 0])
    expect(parts).toEqual([50, 50])
  })

  it('returns [] for no recipients', () => {
    expect(allocateWeighted(100, [])).toEqual([])
  })
})

describe('computePerPersonCost — accommodation', () => {
  it('per-person hotel assigns each band its own resolved cost', () => {
    const result = computePerPersonCost(input({
      travellers: [A1, C1, I1],
      accommodations: [{
        label: 'Mara Lodge',
        mode: 'per_person',
        perBandUsd: { adult: 200, child: 100, infant: 0 },
      }],
    }))
    const by = Object.fromEntries(result.perPerson.map(p => [p.travellerId, p.accommodationUsd]))
    expect(by).toEqual({ a1: 200, c1: 100, i1: 0 })
  })

  it('per-room hotel splits the room total evenly and sums to the total', () => {
    const result = computePerPersonCost(input({
      travellers: [A1, A2],
      accommodations: [{ label: 'Beach Camp', mode: 'per_room', totalUsd: 300 }],
    }))
    expect(result.perPerson.map(p => p.accommodationUsd)).toEqual([150, 150])
    expect(result.totalUsd).toBe(300)
  })

  it('per-room weights let a child carry a smaller share while preserving the total', () => {
    const result = computePerPersonCost(input({
      travellers: [A1, C1],
      accommodations: [{
        label: 'Serena',
        mode: 'per_room',
        totalUsd: 300,
        bandWeights: { adult: 1, child: 0.5 },
      }],
    }))
    const by = Object.fromEntries(result.perPerson.map(p => [p.travellerId, p.accommodationUsd]))
    expect(by).toEqual({ a1: 200, c1: 100 })
    expect(result.totalUsd).toBe(300)
  })

  it('only bills occupants named in travellerIds', () => {
    const result = computePerPersonCost(input({
      travellers: [A1, A2],
      accommodations: [{
        label: 'Single supplement room',
        mode: 'per_room',
        totalUsd: 200,
        travellerIds: ['a1'],
      }],
    }))
    const by = Object.fromEntries(result.perPerson.map(p => [p.travellerId, p.accommodationUsd]))
    expect(by).toEqual({ a1: 200, a2: 0 })
  })

  it('sums multiple stays per person', () => {
    const result = computePerPersonCost(input({
      travellers: [A1],
      accommodations: [
        { label: 'Night 1', mode: 'per_person', perBandUsd: { adult: 120 } },
        { label: 'Night 2', mode: 'per_room', totalUsd: 80 },
      ],
    }))
    expect(result.perPerson[0].accommodationUsd).toBe(200)
  })
})

describe('computePerPersonCost — shared lines', () => {
  it('splits shared lines equally across every traveller', () => {
    const result = computePerPersonCost(input({
      travellers: [A1, A2, C1],
      sharedLines: [
        { label: 'Land Cruiser', category: 'transport', totalUsd: 600 },
        { label: 'Guide', category: 'transport', totalUsd: 90 },
      ],
    }))
    expect(result.perPerson.map(p => p.transportShareUsd)).toEqual([230, 230, 230])
    expect(result.totalUsd).toBe(690)
  })

  it('keeps the shared total exact when it does not divide evenly', () => {
    const result = computePerPersonCost(input({
      travellers: [A1, A2, C1],
      sharedLines: [{ label: 'Transfer', category: 'transport', totalUsd: 100 }],
    }))
    const shares = result.perPerson.map(p => p.transportShareUsd)
    expect(shares.reduce((s, x) => s + x, 0)).toBe(100)
    expect(shares).toEqual([33.34, 33.33, 33.33])
  })
})

describe('computePerPersonCost — park fees', () => {
  it('bills each person only their own band fee', () => {
    const result = computePerPersonCost(input({
      travellers: [A1, A2, C1, I1],
      parkFees: [
        { label: 'Masai Mara', category: 'adult', perPersonUsd: 70 },
        { label: 'Masai Mara', category: 'child', perPersonUsd: 40 },
        { label: 'Nakuru', category: 'adult', perPersonUsd: 60 },
      ],
    }))
    const by = Object.fromEntries(result.perPerson.map(p => [p.travellerId, p.parkFeesUsd]))
    expect(by).toEqual({ a1: 130, a2: 130, c1: 40, i1: 0 })
  })
})

describe('computePerPersonCost — roll-up and totals', () => {
  it('combines accommodation, transport share and park fees per person', () => {
    const result = computePerPersonCost({
      travellers: [A1, A2, C1, I1],
      accommodations: [{
        label: 'Lodge',
        mode: 'per_person',
        perBandUsd: { adult: 200, child: 100, infant: 0 },
      }],
      sharedLines: [{ label: 'Vehicle', category: 'transport', totalUsd: 400 }],
      parkFees: [
        { label: 'Park', category: 'adult', perPersonUsd: 70 },
        { label: 'Park', category: 'child', perPersonUsd: 40 },
      ],
    })
    const a1 = result.perPerson.find(p => p.travellerId === 'a1')!
    expect(a1).toMatchObject({ accommodationUsd: 200, transportShareUsd: 100, parkFeesUsd: 70, totalUsd: 370 })
    const i1 = result.perPerson.find(p => p.travellerId === 'i1')!
    expect(i1).toMatchObject({ accommodationUsd: 0, transportShareUsd: 100, parkFeesUsd: 0, totalUsd: 100 })

    // Grand total equals every input cost summed:
    // hotel 200+200+100+0 = 500, vehicle 400, parks 70+70+40 = 180 → 1080.
    expect(result.totalUsd).toBe(1080)
  })

  it('summarises by band with counts and average per person', () => {
    const result = computePerPersonCost({
      travellers: [A1, A2, C1],
      accommodations: [{ label: 'Lodge', mode: 'per_person', perBandUsd: { adult: 200, child: 100 } }],
      sharedLines: [],
      parkFees: [],
    })
    const adult = result.byBand.find(b => b.category === 'adult')!
    expect(adult).toMatchObject({ count: 2, perPersonUsd: 200, totalUsd: 400 })
    const child = result.byBand.find(b => b.category === 'child')!
    expect(child).toMatchObject({ count: 1, perPersonUsd: 100, totalUsd: 100 })
    // No infants on this trip → no infant band row.
    expect(result.byBand.find(b => b.category === 'infant')).toBeUndefined()
  })

  it('handles an empty roster without dividing by zero', () => {
    const result = computePerPersonCost({
      travellers: [],
      accommodations: [{ label: 'Lodge', mode: 'per_room', totalUsd: 300 }],
      sharedLines: [{ label: 'Van', category: 'transport', totalUsd: 100 }],
      parkFees: [],
    })
    expect(result.perPerson).toEqual([])
    expect(result.byBand).toEqual([])
    expect(result.totalUsd).toBe(0)
  })
})
