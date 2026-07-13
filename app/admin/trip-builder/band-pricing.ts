// Per-traveller-band sale pricing, shared by the client form and the server
// save action so the live preview and the persisted totals can't diverge.
//
// Counts derive from the same age-band mapping (traveller_age_bands) that the
// server uses to set each quote_traveller's traveller_category, so the sale
// total always reconciles with the proposal's per-traveller breakdown. The
// fallback bands mirror the seeded defaults for when the table is empty.

export interface AgeBandLite {
  code: string
  min_age: number
  max_age: number | null
  default_pricing_method?: string | null
}

export const FALLBACK_AGE_BANDS: AgeBandLite[] = [
  { code: 'infant', min_age: 0, max_age: 2, default_pricing_method: 'free' },
  { code: 'child', min_age: 3, max_age: 15, default_pricing_method: 'percentage' },
  { code: 'adult', min_age: 16, max_age: null, default_pricing_method: 'percentage' },
]

export function bandForAge<T extends AgeBandLite>(bands: T[], age: number): T | null {
  return bands.find(b => age >= b.min_age && (b.max_age === null || age <= b.max_age)) ?? null
}

/** Manual per-person sale price per band; blank/absent = not set. */
export interface BandSalePrices {
  adult?: string
  child?: string
}

/**
 * Parse a per-person band price. Blank/invalid/negative → null (unset);
 * 0 is a real price (a free band), distinct from unset.
 */
export function parseBandPrice(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export interface BandSale {
  adultCount: number
  childCount: number
  adultPp: number | null
  childPp: number | null
  /** True once either per-person price is set; the single total is then superseded. */
  usesBandPricing: boolean
  total: number
  /** Bands that have travellers but no price while band pricing is engaged — blocks saving. */
  missing: ('adult' | 'child')[]
}

export function computeBandSale(
  bands: AgeBandLite[],
  guest: { adults: number; childAges: number[] },
  prices: BandSalePrices | undefined,
): BandSale {
  const table = bands.length > 0 ? bands : FALLBACK_AGE_BANDS
  // Adults have no recorded age and are always the adult band; children map
  // by age exactly as the server categorises travellers. Free bands (infants)
  // pay nothing; every other paying non-adult band is priced as child.
  let adultCount = guest.adults
  let childCount = 0
  for (const age of guest.childAges) {
    const band = bandForAge(table, age)
    if (band?.default_pricing_method === 'free') continue
    if (band?.code === 'adult') adultCount++
    else childCount++
  }
  const adultPp = parseBandPrice(prices?.adult)
  const childPp = parseBandPrice(prices?.child)
  const usesBandPricing = adultPp !== null || childPp !== null
  const missing: ('adult' | 'child')[] = []
  if (usesBandPricing) {
    if (adultCount > 0 && adultPp === null) missing.push('adult')
    if (childCount > 0 && childPp === null) missing.push('child')
  }
  const total = Math.round(((adultPp ?? 0) * adultCount + (childPp ?? 0) * childCount) * 100) / 100
  return { adultCount, childCount, adultPp, childPp, usesBandPricing, total, missing }
}
