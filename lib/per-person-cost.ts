// Per-person cost breakdown (pure functions — no I/O).
//
// Given an already-resolved set of costs for a quote (accommodation, shared
// transport, park fees) and the traveller roster, split those costs back down
// to a per-person view: each person's cost = their accommodation + an equal
// share of the shared/vehicle lines + their own park fees.
//
// This is an ALLOCATION view. For per-room hotels the room total is unchanged
// — it is divided across the stay's occupants — so the sum of every person's
// cost always equals the quote's total. Callers (a server resolve action)
// resolve rates first, then hand the totals here.

export type BandCode = 'adult' | 'child' | 'infant'

export interface PerPersonTraveller {
  id: string
  category: BandCode
  /** Age on travel date — carried through for display; not used in the math. */
  age?: number | null
}

/**
 * One accommodation stay's cost, in one of two shapes:
 *  • `per_person` — the hotel prices per guest, so each band already has its
 *    own resolved per-person cost (adult rate, child rate or % of adult, …).
 *  • `per_room` — the hotel prices per room; the room total is allocated across
 *    the stay's occupants, evenly by head but weighted per band (so a band with
 *    a defined child rate can carry proportionally more or less of the room).
 */
export type AccommodationCost =
  | {
      label: string
      mode: 'per_person'
      /** Per-person cost by band for this stay. Missing band = 0 (e.g. free infant). */
      perBandUsd: Partial<Record<BandCode, number>>
      /** Travellers who stayed here. Defaults to every traveller. */
      travellerIds?: string[]
    }
  | {
      label: string
      mode: 'per_room'
      /** The room total to allocate (unchanged from how the quote prices it). */
      totalUsd: number
      /** Relative weight per band when splitting the total. Default 1 each. */
      bandWeights?: Partial<Record<BandCode, number>>
      /** Travellers who stayed here. Defaults to every traveller. */
      travellerIds?: string[]
    }
  | {
      label: string
      mode: 'itemized'
      /**
       * Explicit per-guest costs the operator typed (per band, with a count),
       * e.g. "2 × adult @ $380, 1 × child @ $228". Each item bills that many
       * distinct travellers of its band, so multiple items of the same band at
       * different prices are supported. The item costs are the whole stay.
       */
      items: { category: BandCode; count: number; perPersonUsd: number }[]
    }

/** A cost shared equally across all travellers (vehicles, group fees, …). */
export interface SharedLineCost {
  label: string
  category: string
  totalUsd: number
}

/** A park fee paid per person of a given band (one ticket = one person). */
export interface ParkFeeCost {
  label: string
  category: BandCode
  perPersonUsd: number
}

export interface PerPersonCostInput {
  travellers: PerPersonTraveller[]
  accommodations: AccommodationCost[]
  sharedLines: SharedLineCost[]
  parkFees: ParkFeeCost[]
}

export interface PersonCostBreakdown {
  travellerId: string
  category: BandCode
  accommodationUsd: number
  transportShareUsd: number
  parkFeesUsd: number
  totalUsd: number
}

export interface BandCostSummary {
  category: BandCode
  count: number
  /** Average cost per person in this band (individuals are in `perPerson`). */
  perPersonUsd: number
  accommodationUsd: number
  transportShareUsd: number
  parkFeesUsd: number
  totalUsd: number
}

export interface PerPersonCostResult {
  perPerson: PersonCostBreakdown[]
  byBand: BandCostSummary[]
  totalUsd: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Split a USD total across `weights` so the parts sum EXACTLY to the rounded
 * total (largest-remainder apportionment in integer cents). Zero total weight
 * falls back to an even split.
 */
export function allocateWeighted(totalUsd: number, weights: number[]): number[] {
  const n = weights.length
  if (n === 0) return []
  const sumW = weights.reduce((s, x) => s + x, 0)
  const w = sumW > 0 ? weights : weights.map(() => 1)
  const sw = w.reduce((s, x) => s + x, 0)

  const totalCents = Math.round(totalUsd * 100)
  const raw = w.map(x => (totalCents * x) / sw)
  const cents = raw.map(Math.floor)
  let remainder = totalCents - cents.reduce((s, x) => s + x, 0)

  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (let k = 0; remainder > 0 && k < n; k++, remainder--) cents[order[k].i] += 1

  return cents.map(c => c / 100)
}

/**
 * Roll resolved quote costs down to a per-person breakdown. Pure — the caller
 * supplies already-resolved totals. The sum of every person's `totalUsd`
 * equals the quote total (allocation, not re-pricing).
 */
export function computePerPersonCost(input: PerPersonCostInput): PerPersonCostResult {
  const travellers = input.travellers
  const byId = new Map(travellers.map(t => [t.id, t]))
  const acc = new Map<string, number>(travellers.map(t => [t.id, 0]))
  const transport = new Map<string, number>(travellers.map(t => [t.id, 0]))
  const parks = new Map<string, number>(travellers.map(t => [t.id, 0]))

  // Roster ids grouped by band, for itemized assignment.
  const idsByBand: Record<BandCode, string[]> = { adult: [], child: [], infant: [] }
  for (const t of travellers) idsByBand[t.category].push(t.id)

  // ── Accommodation ──
  for (const stay of input.accommodations) {
    if (stay.mode === 'itemized') {
      // Each item bills `count` distinct not-yet-used travellers of its band.
      const cursor: Record<BandCode, number> = { adult: 0, child: 0, infant: 0 }
      for (const item of stay.items) {
        for (let k = 0; k < item.count; k++) {
          const id = idsByBand[item.category][cursor[item.category]++]
          if (id) acc.set(id, acc.get(id)! + item.perPersonUsd)
        }
      }
      continue
    }
    const occupantIds = (stay.travellerIds ?? travellers.map(t => t.id)).filter(id => byId.has(id))
    if (occupantIds.length === 0) continue
    if (stay.mode === 'per_person') {
      for (const id of occupantIds) {
        const cat = byId.get(id)!.category
        acc.set(id, acc.get(id)! + (stay.perBandUsd[cat] ?? 0))
      }
    } else {
      const weights = occupantIds.map(id => stay.bandWeights?.[byId.get(id)!.category] ?? 1)
      const shares = allocateWeighted(stay.totalUsd, weights)
      occupantIds.forEach((id, i) => acc.set(id, acc.get(id)! + shares[i]))
    }
  }

  // ── Shared lines: equal share across every traveller ──
  const totalShared = input.sharedLines.reduce((s, l) => s + l.totalUsd, 0)
  const shares = allocateWeighted(totalShared, travellers.map(() => 1))
  travellers.forEach((t, i) => transport.set(t.id, transport.get(t.id)! + shares[i]))

  // ── Park fees: each person pays their own band's fee ──
  for (const fee of input.parkFees) {
    for (const t of travellers) {
      if (t.category === fee.category) parks.set(t.id, parks.get(t.id)! + fee.perPersonUsd)
    }
  }

  const perPerson: PersonCostBreakdown[] = travellers.map(t => {
    const a = round2(acc.get(t.id)!)
    const tr = round2(transport.get(t.id)!)
    const p = round2(parks.get(t.id)!)
    return {
      travellerId: t.id,
      category: t.category,
      accommodationUsd: a,
      transportShareUsd: tr,
      parkFeesUsd: p,
      totalUsd: round2(a + tr + p),
    }
  })

  const byBand: BandCostSummary[] = (['adult', 'child', 'infant'] as BandCode[])
    .map(category => {
      const rows = perPerson.filter(p => p.category === category)
      const sum = (sel: (r: PersonCostBreakdown) => number) => round2(rows.reduce((s, r) => s + sel(r), 0))
      const total = sum(r => r.totalUsd)
      return {
        category,
        count: rows.length,
        perPersonUsd: rows.length > 0 ? round2(total / rows.length) : 0,
        accommodationUsd: sum(r => r.accommodationUsd),
        transportShareUsd: sum(r => r.transportShareUsd),
        parkFeesUsd: sum(r => r.parkFeesUsd),
        totalUsd: total,
      }
    })
    .filter(b => b.count > 0)

  const totalUsd = round2(perPerson.reduce((s, p) => s + p.totalUsd, 0))
  return { perPerson, byBand, totalUsd }
}
