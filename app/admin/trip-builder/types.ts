// Shared Trip Builder types (client form ⇄ server actions).

import type { Residency } from '@/lib/rate-resolution'
import type { BandSalePrices } from './band-pricing'

export const ROOM_CATEGORIES = ['sharing', 'single', 'triple', 'extra_bed'] as const
export type RoomCategory = (typeof ROOM_CATEGORIES)[number]

export const MEAL_PLANS = ['BB', 'HB', 'FB', 'AI'] as const
export type MealPlan = (typeof MEAL_PLANS)[number]

export interface GuestDetails {
  name: string
  email: string
  phone: string
  adults: number
  /** One age per child (3–15 → Child band, 0–2 → Infant band) */
  childAges: number[]
  startDate: string
  endDate: string
}

export interface HotelRowInput {
  /** Client-side row key */
  key: string
  destinationId: string
  budgetTier: string
  accommodationId: string
  roomCategory: RoomCategory | ''
  mealPlan: MealPlan | ''
  rooms: number
  checkIn: string
  checkOut: string
  /** Manual per-night USD price; when set it replaces the rate-card price. */
  manualUnitCostUsd?: string
}

export interface TransportRowInput {
  key: string
  vehicleId: string
  startDate: string
  endDate: string
  vehicleCount: number
  /** Manual per-day USD price; when set it replaces the rate-card price. */
  manualUnitCostUsd?: string
}

export interface ParkRowInput {
  key: string
  parkId: string
  travellerCategory: 'adult' | 'child'
  residency: Residency
  entryDate: string
  tickets: number
  /** Manual per-ticket USD price; when set it replaces the rate-card price. */
  manualUnitCostUsd?: string
}

export interface TripBuilderState {
  guest: GuestDetails
  title: string
  hotelRows: HotelRowInput[]
  transportRows: TransportRowInput[]
  parkRows: ParkRowInput[]
  /** Manual total sale price; ignored when any per-band price is set. */
  salePrice: string
  /**
   * Manual per-person sale price per traveller band. When any is set, the
   * sale total is Σ count × price and each traveller's
   * pricing_fixed_amount_usd is stored for the proposal's breakdown.
   */
  bandSalePrices?: BandSalePrices
  /** Per-version Included list shown on the proposal; undefined = defaults. */
  inclusions?: string[]
  /** Per-version Excluded list shown on the proposal; undefined = defaults. */
  exclusions?: string[]
}

export interface SaveTripInput {
  quoteId?: string | null
  versionId?: string | null
  state: TripBuilderState
}

// ── resolve-rate action payloads ─────────────────────────────────────────────

export type ResolveRowRequest =
  | { kind: 'hotel'; accommodationId: string; checkIn: string; checkOut: string; roomCategory: string; mealPlan: string; rooms: number }
  | { kind: 'transport'; vehicleId: string; startDate: string; endDate: string; vehicleCount: number }
  | { kind: 'park'; parkId: string; entryDate: string; travellerCategory: 'adult' | 'child'; residency: Residency; tickets: number }

export interface ResolvedSegmentView {
  label: string
  units: number
  unitCostUsd: number
  totalCostUsd: number
  sourceCurrency: string
  sourceUnitCost: number
}

export type ResolveRowResult =
  | {
      ok: true
      /** nights / days / tickets across all segments */
      units: number
      /** representative per-unit USD cost (first segment) */
      unitCostUsd: number
      totalCostUsd: number
      segments: ResolvedSegmentView[]
    }
  | { ok: false; message: string }

export type SaveTripResult =
  | {
      ok: true
      quoteId: string
      quoteNumber: string | null
      versionId: string
      totals: { costUsd: number; sellingUsd: number }
    }
  | {
      ok: false
      message: string
      gaps?: string[]
      /**
       * Set when the quote/version was created before the failure (e.g. a
       * post-save write failed) so a retry updates it instead of creating a
       * duplicate.
       */
      quoteId?: string
      versionId?: string
    }
