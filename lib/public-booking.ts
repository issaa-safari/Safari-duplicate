export type LeadBookingTraveller = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

/**
 * Creates one transaction-ready roster row per reserved seat without asking
 * the public user for every traveller's personal information up front.
 */
export function buildLeadOnlyTravellerRoster(
  lead: LeadBookingTraveller,
  groupSize: number,
): Array<LeadBookingTraveller | Record<string, never>> {
  const size = Math.max(1, Math.min(50, Math.trunc(groupSize)))
  return [lead, ...Array.from({ length: size - 1 }, () => ({}))]
}
