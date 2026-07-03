// Season-aware supplier rate resolution (pure functions — no I/O).
//
// Rates always resolve by the SERVICE date (check-in night / hire day / park
// entry date), never "today". A missing rate throws RateGapError so callers
// must surface a blocking warning — a rate gap is never silently priced as 0
// (the Excel park-fee NA→0 defect this module exists to fix).
//
// Callers fetch candidate `supplier_rate_cards` (with embedded
// `supplier_rates`) and pass them in; this module only decides.

export type PricingUnit =
  | 'person' | 'room' | 'vehicle' | 'group' | 'day' | 'night' | 'trip'

export type Residency = 'all' | 'resident' | 'non_resident' | 'citizen'

export interface SupplierRateRow {
  id: string
  traveller_category: string | null
  room_category: string | null
  residency: Residency | string
  pricing_unit: PricingUnit | string
  amount: number | string
  min_group_size: number | null
  max_group_size: number | null
  sort_order: number | null
}

export interface RateCardRow {
  id: string
  name: string
  entity_type: string
  entity_id: string | null
  cost_category: string
  valid_from: string
  valid_to: string
  currency: string
  is_active: boolean
  supplier_rates: SupplierRateRow[]
}

export interface ResolveRateParams {
  entityType: string
  entityId: string
  /** ISO date of the service (check-in night / hire day / entry date) */
  serviceDate: string
  travellerCategory?: string
  roomCategory?: string
  residency?: Residency
  groupSize?: number
  /** Human label used in RateGapError messages */
  entityLabel?: string
}

export interface ResolvedRate {
  rateCardId: string
  supplierRateId: string
  sourceCurrency: string
  sourceUnitCost: number
  exchangeRateToUsd: number
  unitCostUsd: number
  pricingUnit: PricingUnit
  seasonName: string | null
  /** The matched rate's own traveller_category (null = generic rate) */
  matchedTravellerCategory: string | null
}

/**
 * Currency → USD conversion factors (USD per one unit of currency), e.g.
 * `{ USD: 1, KES: 1 / 129 }`. Built by the caller from the snapshot rate.
 */
export type FxToUsd = Record<string, number>

export class RateGapError extends Error {
  readonly entityType: string
  readonly entityId: string
  readonly entityLabel: string
  readonly serviceDate: string

  constructor(params: {
    entityType: string
    entityId: string
    entityLabel?: string
    serviceDate: string
  }) {
    const label = params.entityLabel ?? params.entityId
    super(`No rate for ${label} on ${params.serviceDate}`)
    this.name = 'RateGapError'
    this.entityType = params.entityType
    this.entityId = params.entityId
    this.entityLabel = label
    this.serviceDate = params.serviceDate
  }
}

export function buildFxToUsd(usdToKes: number): FxToUsd {
  if (!Number.isFinite(usdToKes) || usdToKes <= 0) {
    throw new Error('usd_to_kes_rate must be a positive number.')
  }
  return { USD: 1, KES: 1 / usdToKes }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000
}

function cardCoversDate(card: RateCardRow, isoDate: string): boolean {
  return card.valid_from <= isoDate && card.valid_to >= isoDate
}

function rateMatches(rate: SupplierRateRow, params: ResolveRateParams): boolean {
  const residency = params.residency ?? 'all'
  if (rate.residency !== 'all' && rate.residency !== residency) return false
  if (rate.traveller_category !== null && rate.traveller_category !== params.travellerCategory) return false
  if (rate.room_category !== null && rate.room_category !== params.roomCategory) return false
  if (params.groupSize !== undefined) {
    if (rate.min_group_size !== null && params.groupSize < rate.min_group_size) return false
    if (rate.max_group_size !== null && params.groupSize > rate.max_group_size) return false
  }
  return true
}

/** Higher = more specific. Residency outranks traveller category outranks room. */
function specificity(rate: SupplierRateRow, params: ResolveRateParams): number {
  let score = 0
  if (rate.residency !== 'all' && rate.residency === params.residency) score += 4
  if (rate.traveller_category !== null && rate.traveller_category === params.travellerCategory) score += 2
  if (rate.room_category !== null && rate.room_category === params.roomCategory) score += 1
  return score
}

/**
 * Resolve the applicable supplier rate for an entity on a service date.
 * Throws RateGapError when nothing matches — never returns a zero fallback.
 */
export function resolveRate(
  params: ResolveRateParams,
  cards: RateCardRow[],
  fx: FxToUsd,
): ResolvedRate {
  const candidates: { card: RateCardRow; rate: SupplierRateRow; score: number }[] = []

  for (const card of cards) {
    if (!card.is_active) continue
    if (card.entity_type !== params.entityType) continue
    if (card.entity_id !== params.entityId) continue
    if (!cardCoversDate(card, params.serviceDate)) continue

    for (const rate of card.supplier_rates ?? []) {
      if (!rateMatches(rate, params)) continue
      candidates.push({ card, rate, score: specificity(rate, params) })
    }
  }

  if (candidates.length === 0) {
    throw new RateGapError({
      entityType: params.entityType,
      entityId: params.entityId,
      entityLabel: params.entityLabel,
      serviceDate: params.serviceDate,
    })
  }

  candidates.sort((a, b) =>
    b.score - a.score || (a.rate.sort_order ?? 0) - (b.rate.sort_order ?? 0),
  )
  const winner = candidates[0]

  const currency = winner.card.currency || 'USD'
  const rateToUsd = fx[currency]
  if (rateToUsd === undefined || !Number.isFinite(rateToUsd) || rateToUsd <= 0) {
    throw new Error(
      `No ${currency}→USD exchange rate available to price ${params.entityLabel ?? params.entityId}.`,
    )
  }

  const sourceUnitCost = Number(winner.rate.amount)
  return {
    rateCardId: winner.card.id,
    supplierRateId: winner.rate.id,
    sourceCurrency: currency,
    sourceUnitCost,
    exchangeRateToUsd: round6(rateToUsd),
    unitCostUsd: round2(sourceUnitCost * rateToUsd),
    pricingUnit: winner.rate.pricing_unit as PricingUnit,
    seasonName: winner.card.name ?? null,
    matchedTravellerCategory: winner.rate.traveller_category,
  }
}

// ── Age-band pricing ──────────────────────────────────────────────────────────

export interface AgeBandPricing {
  code: string
  pricingMethod: 'fixed' | 'percentage' | 'free'
  percentage: number | null
  fixedAmountUsd: number | null
}

/**
 * Children/infants use their own supplier rate when one exists; otherwise the
 * generic rate is adjusted by the traveller's age band (Child 50%, Infant free,
 * …). Adult rates pass through unchanged.
 */
export function applyAgeBand(resolved: ResolvedRate, band?: AgeBandPricing): ResolvedRate {
  if (!band) return resolved
  // A category-specific supplier rate already encodes the child price.
  if (resolved.matchedTravellerCategory !== null) return resolved

  switch (band.pricingMethod) {
    case 'free':
      return { ...resolved, sourceUnitCost: 0, unitCostUsd: 0 }
    case 'fixed': {
      const fixed = band.fixedAmountUsd ?? 0
      return {
        ...resolved,
        sourceCurrency: 'USD',
        sourceUnitCost: round2(fixed),
        exchangeRateToUsd: 1,
        unitCostUsd: round2(fixed),
      }
    }
    case 'percentage': {
      const pct = (band.percentage ?? 100) / 100
      return {
        ...resolved,
        sourceUnitCost: round2(resolved.sourceUnitCost * pct),
        unitCostUsd: round2(resolved.unitCostUsd * pct),
      }
    }
  }
}

// ── Date helpers ──────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000

function toUtc(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function isoAddDays(isoDate: string, days: number): string {
  return new Date(toUtc(isoDate) + days * DAY_MS).toISOString().slice(0, 10)
}

/** Hotel nights = checkout − checkin. Throws on a non-positive stay. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const nights = Math.round((toUtc(checkOut) - toUtc(checkIn)) / DAY_MS)
  if (nights < 1) throw new Error('Check-out must be after check-in.')
  return nights
}

/** Vehicle days = end − start + 1 (inclusive of both ends). */
export function vehicleDaysInclusive(start: string, end: string): number {
  const days = Math.round((toUtc(end) - toUtc(start)) / DAY_MS) + 1
  if (days < 1) throw new Error('End date must not be before start date.')
  return days
}

// ── Pricing functions ─────────────────────────────────────────────────────────

export interface PricedSegment {
  resolved: ResolvedRate
  /** ISO date of the first service day in this segment */
  startDate: string
  /** ISO date of the last service day in this segment */
  endDate: string
  /** Number of service days (nights / hire days) in this segment */
  units: number
}

/**
 * Resolve one rate per service day and merge consecutive days that resolved to
 * the same supplier rate. This is what splits a stay crossing a season
 * boundary into one price line per season segment.
 */
function segmentByRate(
  serviceDates: string[],
  resolveOne: (date: string) => ResolvedRate,
): PricedSegment[] {
  const segments: PricedSegment[] = []
  for (const date of serviceDates) {
    const resolved = resolveOne(date)
    const last = segments[segments.length - 1]
    if (
      last &&
      last.resolved.supplierRateId === resolved.supplierRateId &&
      last.resolved.unitCostUsd === resolved.unitCostUsd
    ) {
      last.units += 1
      last.endDate = date
    } else {
      segments.push({ resolved, startDate: date, endDate: date, units: 1 })
    }
  }
  return segments
}

export interface AccommodationStayParams {
  accommodationId: string
  accommodationLabel?: string
  checkIn: string
  checkOut: string
  roomCategory?: string
  travellerCategory?: string
  residency?: Residency
  /** Rooms (pricing_unit 'room') or guests (pricing_unit 'person'/'night') */
  unitsPerNight?: number
  ageBand?: AgeBandPricing
}

/**
 * Price an accommodation stay: one segment per season, priced by each night's
 * date. Quantity per segment = nights in segment × unitsPerNight.
 */
export function priceAccommodationStay(
  params: AccommodationStayParams,
  cards: RateCardRow[],
  fx: FxToUsd,
): PricedSegment[] {
  const nights = nightsBetween(params.checkIn, params.checkOut)
  const nightDates = Array.from({ length: nights }, (_, i) => isoAddDays(params.checkIn, i))

  const segments = segmentByRate(nightDates, (date) =>
    applyAgeBand(
      resolveRate(
        {
          entityType: 'accommodation',
          entityId: params.accommodationId,
          entityLabel: params.accommodationLabel,
          serviceDate: date,
          travellerCategory: params.travellerCategory,
          roomCategory: params.roomCategory,
          residency: params.residency,
        },
        cards,
        fx,
      ),
      params.ageBand,
    ),
  )

  const units = params.unitsPerNight ?? 1
  return segments.map(s => ({ ...s, units: s.units * units }))
}

export interface VehicleHireParams {
  vehicleId: string
  vehicleLabel?: string
  startDate: string
  /** Inclusive end date: days = end − start + 1 */
  endDate: string
  vehicleCount?: number
}

/**
 * Price a vehicle hire over an inclusive day range, split per season segment
 * like accommodation. Quantity per segment = days in segment × vehicleCount.
 */
export function priceVehicleHire(
  params: VehicleHireParams,
  cards: RateCardRow[],
  fx: FxToUsd,
): PricedSegment[] {
  const days = vehicleDaysInclusive(params.startDate, params.endDate)
  const dayDates = Array.from({ length: days }, (_, i) => isoAddDays(params.startDate, i))

  const segments = segmentByRate(dayDates, (date) =>
    resolveRate(
      {
        entityType: 'vehicle',
        entityId: params.vehicleId,
        entityLabel: params.vehicleLabel,
        serviceDate: date,
      },
      cards,
      fx,
    ),
  )

  const count = params.vehicleCount ?? 1
  return segments.map(s => ({ ...s, units: s.units * count }))
}

export interface ParkEntryParams {
  parkId: string
  parkLabel?: string
  entryDate: string
  travellerCategory?: string
  residency?: Residency
  tickets: number
  ageBand?: AgeBandPricing
}

export interface PricedParkEntry {
  resolved: ResolvedRate
  entryDate: string
  /** Number of tickets (quantity for the price line) */
  units: number
}

/**
 * Price park entry tickets by the entry date. Citizen rates in KES convert to
 * USD via the snapshot rate in `fx`.
 */
export function pricePark(
  params: ParkEntryParams,
  cards: RateCardRow[],
  fx: FxToUsd,
): PricedParkEntry {
  if (!Number.isFinite(params.tickets) || params.tickets < 1) {
    throw new Error('Ticket count must be at least 1.')
  }
  const resolved = applyAgeBand(
    resolveRate(
      {
        entityType: 'park_fee',
        entityId: params.parkId,
        entityLabel: params.parkLabel,
        serviceDate: params.entryDate,
        travellerCategory: params.travellerCategory,
        residency: params.residency,
      },
      cards,
      fx,
    ),
    params.ageBand,
  )
  return { resolved, entryDate: params.entryDate, units: params.tickets }
}
