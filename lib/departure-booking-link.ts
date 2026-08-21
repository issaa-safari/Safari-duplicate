import { localePath, type Locale } from '@/lib/locale'

// Every entry point that links a visitor into a departure's booking form —
// the departure page itself, the tour page's date list, any future one —
// must agree on what that link carries: whichever room-type price the
// departure actually offers, and its security deposit. Building the URL by
// hand in more than one place is exactly how the deposit went missing from
// the tour page's booking links while the departure page's own link carried
// it correctly. This is the one place that builds it.
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
  tourTitle,
  priceUsd,
  priceSingleUsd,
  depositUsd,
}: DepartureBookingLinkInput): string {
  const params = [
    priceUsd != null ? `price=${priceUsd}` : null,
    priceSingleUsd != null ? `priceSingle=${priceSingleUsd}` : null,
    depositUsd != null ? `deposit=${depositUsd}` : null,
    `tour=${encodeURIComponent(tourTitle)}`,
  ].filter(Boolean).join('&')

  return `${localePath(`/departures/${departureId}/book`, locale)}?${params}`
}
