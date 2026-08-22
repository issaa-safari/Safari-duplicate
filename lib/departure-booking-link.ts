import { localePath, type Locale } from '@/lib/locale'

// Every entry point that links a visitor into a departure's booking form —
// the departure page itself, the tour page's date list, any future one —
// carries only a departure identity and locale. The booking page resolves all
// display and pricing data on the server, so stale or edited URL parameters can
// never disagree with the booking that is actually created.
export interface DepartureBookingLinkInput {
  departureId: string
  locale: Locale
  tourTitle: string
  /** Sharing/double-room price, or null if this departure doesn't offer that category. */
  priceUsd: number | null
  /** Single-room price, or null if this departure doesn't offer that category. */
  priceSingleUsd: number | null
  /** Refundable security deposit per person, if any. */
  depositUsd?: number | null
}

export function departureBookHref({
  departureId,
  locale,
}: DepartureBookingLinkInput): string {
  return localePath(`/departures/${departureId}/book`, locale)
}
