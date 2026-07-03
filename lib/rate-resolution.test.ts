import { describe, expect, it } from 'vitest'
import {
  applyAgeBand,
  buildFxToUsd,
  nightsBetween,
  priceAccommodationStay,
  pricePark,
  priceVehicleHire,
  RateGapError,
  resolveRate,
  vehicleDaysInclusive,
  type AgeBandPricing,
  type RateCardRow,
  type SupplierRateRow,
} from './rate-resolution'

const FX = buildFxToUsd(129)

let rateSeq = 0
function rate(overrides: Partial<SupplierRateRow> = {}): SupplierRateRow {
  rateSeq += 1
  return {
    id: `rate-${rateSeq}`,
    traveller_category: null,
    room_category: null,
    residency: 'all',
    pricing_unit: 'night',
    amount: 100,
    min_group_size: null,
    max_group_size: null,
    sort_order: 0,
    ...overrides,
  }
}

let cardSeq = 0
function card(overrides: Partial<RateCardRow> = {}): RateCardRow {
  cardSeq += 1
  return {
    id: `card-${cardSeq}`,
    name: 'High Season',
    entity_type: 'accommodation',
    entity_id: 'hotel-1',
    cost_category: 'accommodation',
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
    currency: 'USD',
    is_active: true,
    supplier_rates: [rate()],
    ...overrides,
  }
}

const CHILD_BAND: AgeBandPricing = {
  code: 'child',
  pricingMethod: 'percentage',
  percentage: 50,
  fixedAmountUsd: null,
}

describe('resolveRate', () => {
  it('resolves a rate valid on the service date', () => {
    const cards = [card({ supplier_rates: [rate({ amount: 150 })] })]
    const resolved = resolveRate(
      { entityType: 'accommodation', entityId: 'hotel-1', serviceDate: '2026-06-10' },
      cards, FX,
    )
    expect(resolved.unitCostUsd).toBe(150)
    expect(resolved.sourceCurrency).toBe('USD')
    expect(resolved.exchangeRateToUsd).toBe(1)
    expect(resolved.seasonName).toBe('High Season')
  })

  it('throws RateGapError when no card covers the date — never 0', () => {
    const cards = [card({ valid_from: '2026-01-01', valid_to: '2026-06-30' })]
    expect(() =>
      resolveRate(
        {
          entityType: 'accommodation', entityId: 'hotel-1',
          serviceDate: '2026-12-24', entityLabel: 'Sarova Whitesands',
        },
        cards, FX,
      ),
    ).toThrowError(RateGapError)
    try {
      resolveRate(
        {
          entityType: 'accommodation', entityId: 'hotel-1',
          serviceDate: '2026-12-24', entityLabel: 'Sarova Whitesands',
        },
        cards, FX,
      )
    } catch (err) {
      expect(err).toBeInstanceOf(RateGapError)
      expect((err as RateGapError).message).toBe('No rate for Sarova Whitesands on 2026-12-24')
      expect((err as RateGapError).serviceDate).toBe('2026-12-24')
    }
  })

  it('throws RateGapError for inactive cards and mismatched entities', () => {
    const cards = [
      card({ is_active: false }),
      card({ entity_id: 'hotel-2' }),
      card({ entity_type: 'vehicle' }),
    ]
    expect(() =>
      resolveRate(
        { entityType: 'accommodation', entityId: 'hotel-1', serviceDate: '2026-06-10' },
        cards, FX,
      ),
    ).toThrowError(RateGapError)
  })

  it('prefers residency-specific over generic, then traveller category, then room', () => {
    const cards = [card({
      supplier_rates: [
        rate({ amount: 60, residency: 'all' }),
        rate({ amount: 30, residency: 'citizen' }),
        rate({ amount: 25, residency: 'citizen', traveller_category: 'child' }),
      ],
    })]
    const generic = resolveRate(
      { entityType: 'accommodation', entityId: 'hotel-1', serviceDate: '2026-06-10' },
      cards, FX,
    )
    expect(generic.unitCostUsd).toBe(60)

    const citizenAdult = resolveRate(
      {
        entityType: 'accommodation', entityId: 'hotel-1',
        serviceDate: '2026-06-10', residency: 'citizen', travellerCategory: 'adult',
      },
      cards, FX,
    )
    expect(citizenAdult.unitCostUsd).toBe(30)

    const citizenChild = resolveRate(
      {
        entityType: 'accommodation', entityId: 'hotel-1',
        serviceDate: '2026-06-10', residency: 'citizen', travellerCategory: 'child',
      },
      cards, FX,
    )
    expect(citizenChild.unitCostUsd).toBe(25)
    expect(citizenChild.matchedTravellerCategory).toBe('child')
  })

  it('never matches a rate for a different residency', () => {
    const cards = [card({ supplier_rates: [rate({ residency: 'citizen' })] })]
    expect(() =>
      resolveRate(
        {
          entityType: 'accommodation', entityId: 'hotel-1',
          serviceDate: '2026-06-10', residency: 'non_resident',
        },
        cards, FX,
      ),
    ).toThrowError(RateGapError)
  })

  it('respects group size windows', () => {
    const cards = [card({
      supplier_rates: [
        rate({ amount: 90, min_group_size: 1, max_group_size: 4 }),
        rate({ amount: 70, min_group_size: 5, max_group_size: null }),
      ],
    })]
    const small = resolveRate(
      { entityType: 'accommodation', entityId: 'hotel-1', serviceDate: '2026-06-10', groupSize: 3 },
      cards, FX,
    )
    expect(small.unitCostUsd).toBe(90)
    const large = resolveRate(
      { entityType: 'accommodation', entityId: 'hotel-1', serviceDate: '2026-06-10', groupSize: 7 },
      cards, FX,
    )
    expect(large.unitCostUsd).toBe(70)
  })

  it('breaks specificity ties by sort_order', () => {
    const cards = [card({
      supplier_rates: [
        rate({ amount: 110, sort_order: 20 }),
        rate({ amount: 100, sort_order: 10 }),
      ],
    })]
    const resolved = resolveRate(
      { entityType: 'accommodation', entityId: 'hotel-1', serviceDate: '2026-06-10' },
      cards, FX,
    )
    expect(resolved.unitCostUsd).toBe(100)
  })

  it('converts KES rates to USD via the snapshot rate', () => {
    const cards = [card({
      entity_type: 'park_fee',
      entity_id: 'park-1',
      cost_category: 'park_fees',
      currency: 'KES',
      supplier_rates: [rate({ amount: 1000, residency: 'citizen', pricing_unit: 'person' })],
    })]
    const resolved = resolveRate(
      { entityType: 'park_fee', entityId: 'park-1', serviceDate: '2026-06-10', residency: 'citizen' },
      cards, FX,
    )
    expect(resolved.sourceCurrency).toBe('KES')
    expect(resolved.sourceUnitCost).toBe(1000)
    expect(resolved.exchangeRateToUsd).toBeCloseTo(1 / 129, 6)
    expect(resolved.unitCostUsd).toBeCloseTo(7.75, 2)
  })

  it('fails loudly when the card currency has no exchange rate', () => {
    const cards = [card({ currency: 'TZS' })]
    expect(() =>
      resolveRate(
        { entityType: 'accommodation', entityId: 'hotel-1', serviceDate: '2026-06-10' },
        cards, FX,
      ),
    ).toThrowError(/TZS/)
  })
})

describe('applyAgeBand', () => {
  const base = () =>
    resolveRate(
      { entityType: 'accommodation', entityId: 'hotel-1', serviceDate: '2026-06-10' },
      [card({ supplier_rates: [rate({ amount: 200 })] })], FX,
    )

  it('halves a generic rate for the Child 50% band', () => {
    const child = applyAgeBand(base(), CHILD_BAND)
    expect(child.unitCostUsd).toBe(100)
    expect(child.sourceUnitCost).toBe(100)
  })

  it('zeroes a generic rate for a free (infant) band', () => {
    const infant = applyAgeBand(base(), {
      code: 'infant', pricingMethod: 'free', percentage: 0, fixedAmountUsd: null,
    })
    expect(infant.unitCostUsd).toBe(0)
  })

  it('uses the fixed USD amount for a fixed band', () => {
    const fixed = applyAgeBand(base(), {
      code: 'child', pricingMethod: 'fixed', percentage: null, fixedAmountUsd: 45,
    })
    expect(fixed.unitCostUsd).toBe(45)
    expect(fixed.sourceCurrency).toBe('USD')
    expect(fixed.exchangeRateToUsd).toBe(1)
  })

  it('does not adjust a rate that is already child-specific', () => {
    const cards = [card({
      supplier_rates: [rate({ amount: 80, traveller_category: 'child' })],
    })]
    const resolved = resolveRate(
      {
        entityType: 'accommodation', entityId: 'hotel-1',
        serviceDate: '2026-06-10', travellerCategory: 'child',
      },
      cards, FX,
    )
    const child = applyAgeBand(resolved, CHILD_BAND)
    expect(child.unitCostUsd).toBe(80)
  })
})

describe('date conventions', () => {
  it('hotel nights = checkout − checkin', () => {
    expect(nightsBetween('2026-12-23', '2026-12-26')).toBe(3)
    expect(nightsBetween('2026-12-23', '2026-12-24')).toBe(1)
    expect(() => nightsBetween('2026-12-23', '2026-12-23')).toThrowError()
  })

  it('vehicle days = end − start + 1 inclusive', () => {
    expect(vehicleDaysInclusive('2026-12-23', '2026-12-27')).toBe(5)
    expect(vehicleDaysInclusive('2026-12-23', '2026-12-23')).toBe(1)
    expect(() => vehicleDaysInclusive('2026-12-24', '2026-12-23')).toThrowError()
  })
})

describe('priceAccommodationStay', () => {
  const seasonCards = [
    card({
      name: 'Low Season',
      valid_from: '2026-04-01', valid_to: '2026-12-25',
      supplier_rates: [rate({ amount: 100, room_category: 'sharing', pricing_unit: 'room' })],
    }),
    card({
      name: 'Festive Season',
      valid_from: '2026-12-26', valid_to: '2027-01-05',
      supplier_rates: [rate({ amount: 250, room_category: 'sharing', pricing_unit: 'room' })],
    }),
  ]

  it('splits a stay crossing a season boundary into one segment per season', () => {
    const segments = priceAccommodationStay(
      {
        accommodationId: 'hotel-1', accommodationLabel: 'Sarova Mara',
        checkIn: '2026-12-24', checkOut: '2026-12-28', roomCategory: 'sharing',
      },
      seasonCards, FX,
    )
    // Nights 24, 25 (Low) + 26, 27 (Festive)
    expect(segments).toHaveLength(2)
    expect(segments[0].units).toBe(2)
    expect(segments[0].resolved.unitCostUsd).toBe(100)
    expect(segments[0].resolved.seasonName).toBe('Low Season')
    expect(segments[0].startDate).toBe('2026-12-24')
    expect(segments[0].endDate).toBe('2026-12-25')
    expect(segments[1].units).toBe(2)
    expect(segments[1].resolved.unitCostUsd).toBe(250)
    expect(segments[1].resolved.seasonName).toBe('Festive Season')
  })

  it('keeps a single segment inside one season and multiplies rooms', () => {
    const segments = priceAccommodationStay(
      {
        accommodationId: 'hotel-1', checkIn: '2026-12-20', checkOut: '2026-12-23',
        roomCategory: 'sharing', unitsPerNight: 2,
      },
      seasonCards, FX,
    )
    expect(segments).toHaveLength(1)
    expect(segments[0].units).toBe(6) // 3 nights × 2 rooms
  })

  it('throws RateGapError when any night is uncovered', () => {
    expect(() =>
      priceAccommodationStay(
        {
          accommodationId: 'hotel-1', accommodationLabel: 'Sarova Mara',
          checkIn: '2027-01-04', checkOut: '2027-01-08', roomCategory: 'sharing',
        },
        seasonCards, FX,
      ),
    ).toThrowError(RateGapError)
  })

  it('prices a child stay via the age band when no child rate exists', () => {
    const segments = priceAccommodationStay(
      {
        accommodationId: 'hotel-1', checkIn: '2026-06-01', checkOut: '2026-06-04',
        roomCategory: 'sharing', travellerCategory: 'child', ageBand: CHILD_BAND,
      },
      seasonCards, FX,
    )
    expect(segments).toHaveLength(1)
    expect(segments[0].resolved.unitCostUsd).toBe(50)
  })
})

describe('priceVehicleHire', () => {
  const vehicleCards = [card({
    entity_type: 'vehicle', entity_id: 'sedan-1', cost_category: 'transport',
    name: 'Sedan day rate',
    supplier_rates: [rate({ amount: 80, pricing_unit: 'day' })],
  })]

  it('prices inclusive days: 23–27 Dec = 5 days', () => {
    const segments = priceVehicleHire(
      { vehicleId: 'sedan-1', vehicleLabel: 'Sedan', startDate: '2026-12-23', endDate: '2026-12-27' },
      vehicleCards, FX,
    )
    expect(segments).toHaveLength(1)
    expect(segments[0].units).toBe(5)
    expect(segments[0].resolved.unitCostUsd).toBe(80)
  })

  it('throws RateGapError when the hire has no covering card', () => {
    expect(() =>
      priceVehicleHire(
        { vehicleId: 'landcruiser-9', startDate: '2026-12-23', endDate: '2026-12-27' },
        vehicleCards, FX,
      ),
    ).toThrowError(RateGapError)
  })
})

describe('pricePark', () => {
  const parkCards = [card({
    entity_type: 'park_fee', entity_id: 'mara-1', cost_category: 'park_fees',
    name: 'Mara gate fees',
    supplier_rates: [
      rate({ amount: 80, residency: 'non_resident', traveller_category: 'adult', pricing_unit: 'person' }),
      rate({ amount: 1000, residency: 'citizen', traveller_category: 'adult', pricing_unit: 'person' }),
    ],
  })]
  const kesCitizenCards = [card({
    entity_type: 'park_fee', entity_id: 'mara-1', cost_category: 'park_fees',
    currency: 'KES',
    supplier_rates: [
      rate({ amount: 1500, residency: 'citizen', traveller_category: 'adult', pricing_unit: 'person' }),
    ],
  })]

  it('prices tickets per person by entry date', () => {
    const entry = pricePark(
      {
        parkId: 'mara-1', parkLabel: 'Mara Conservancy', entryDate: '2026-12-27',
        travellerCategory: 'adult', residency: 'non_resident', tickets: 2,
      },
      parkCards, FX,
    )
    expect(entry.units).toBe(2)
    expect(entry.resolved.unitCostUsd).toBe(80)
  })

  it('converts citizen KES fees to USD', () => {
    const entry = pricePark(
      {
        parkId: 'mara-1', entryDate: '2026-12-27',
        travellerCategory: 'adult', residency: 'citizen', tickets: 1,
      },
      kesCitizenCards, FX,
    )
    expect(entry.resolved.sourceCurrency).toBe('KES')
    expect(entry.resolved.unitCostUsd).toBeCloseTo(11.63, 2)
  })

  it('throws RateGapError instead of pricing a missing park rate as 0', () => {
    expect(() =>
      pricePark(
        {
          parkId: 'ol-pejeta-1', parkLabel: 'Ol Pejeta', entryDate: '2026-12-28',
          travellerCategory: 'adult', residency: 'non_resident', tickets: 2,
        },
        parkCards, FX,
      ),
    ).toThrowError('No rate for Ol Pejeta on 2026-12-28')
  })

  it('rejects a non-positive ticket count', () => {
    expect(() =>
      pricePark(
        { parkId: 'mara-1', entryDate: '2026-12-27', tickets: 0 },
        parkCards, FX,
      ),
    ).toThrowError()
  })
})
