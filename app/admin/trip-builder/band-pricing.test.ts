import { describe, expect, it } from 'vitest'
import { computeBandSale, FALLBACK_AGE_BANDS, parseBandPrice } from './band-pricing'

describe('parseBandPrice', () => {
  it('treats blank and absent as unset', () => {
    expect(parseBandPrice(undefined)).toBeNull()
    expect(parseBandPrice('')).toBeNull()
    expect(parseBandPrice('   ')).toBeNull()
  })

  it('accepts 0 as a real price, distinct from unset', () => {
    expect(parseBandPrice('0')).toBe(0)
  })

  it('rejects negatives and garbage', () => {
    expect(parseBandPrice('-5')).toBeNull()
    expect(parseBandPrice('abc')).toBeNull()
  })

  it('parses positive amounts', () => {
    expect(parseBandPrice('2000')).toBe(2000)
    expect(parseBandPrice('1999.5')).toBe(1999.5)
  })
})

describe('computeBandSale', () => {
  const bands = FALLBACK_AGE_BANDS

  it('maps children by age band: 16+ adult, 3–15 child, infants free', () => {
    const s = computeBandSale(bands, { adults: 2, childAges: [10, 16, 2] }, {})
    expect(s.adultCount).toBe(3)
    expect(s.childCount).toBe(1)
    expect(s.usesBandPricing).toBe(false)
    expect(s.total).toBe(0)
  })

  it('totals count × price per band when both prices are set', () => {
    const s = computeBandSale(bands, { adults: 2, childAges: [10] }, { adult: '2000', child: '1000' })
    expect(s.usesBandPricing).toBe(true)
    expect(s.missing).toEqual([])
    expect(s.total).toBe(5000)
  })

  it('flags a populated band left unpriced instead of billing it at $0', () => {
    const s = computeBandSale(bands, { adults: 2, childAges: [10] }, { adult: '2000' })
    expect(s.usesBandPricing).toBe(true)
    expect(s.missing).toEqual(['child'])
  })

  it('does not require a price for a band with no travellers', () => {
    const s = computeBandSale(bands, { adults: 2, childAges: [] }, { adult: '2000' })
    expect(s.missing).toEqual([])
    expect(s.total).toBe(4000)
  })

  it('accepts an explicit $0 band (free children)', () => {
    const s = computeBandSale(bands, { adults: 2, childAges: [10] }, { adult: '2000', child: '0' })
    expect(s.missing).toEqual([])
    expect(s.childPp).toBe(0)
    expect(s.total).toBe(4000)
  })

  it('respects a reconfigured band table over any hardcoded ages', () => {
    const custom = [
      { code: 'infant', min_age: 0, max_age: 2, default_pricing_method: 'free' },
      { code: 'child', min_age: 3, max_age: 17, default_pricing_method: 'percentage' },
      { code: 'adult', min_age: 18, max_age: null, default_pricing_method: 'percentage' },
    ]
    const s = computeBandSale(custom, { adults: 1, childAges: [16] }, { adult: '2000', child: '1000' })
    expect(s.adultCount).toBe(1)
    expect(s.childCount).toBe(1)
    expect(s.total).toBe(3000)
  })

  it('falls back to the seeded default bands when the table is empty', () => {
    const s = computeBandSale([], { adults: 1, childAges: [16, 1] }, { adult: '1500', child: '750' })
    expect(s.adultCount).toBe(2)
    expect(s.childCount).toBe(0)
    expect(s.total).toBe(3000)
  })
})
