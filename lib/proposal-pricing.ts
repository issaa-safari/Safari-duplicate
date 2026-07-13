// Per-traveller per-person price resolution shared by the client proposal
// page and its print/PDF variant, so both documents show the same numbers.

/**
 * A manually-set per-person price (trip-builder band pricing or the versions
 * form) wins over the percentage-derived split of the total. An explicit 0
 * means "travels free"; only null/undefined falls back to the split.
 */
export function travellerPerPersonUsd(
  pricingFixedAmount: unknown,
  effectiveSharingPp: number,
  bandPct: number,
): number {
  if (pricingFixedAmount != null) {
    const fixed = Number(pricingFixedAmount)
    if (Number.isFinite(fixed) && fixed >= 0) return fixed
  }
  return effectiveSharingPp > 0 ? effectiveSharingPp * bandPct : 0
}
