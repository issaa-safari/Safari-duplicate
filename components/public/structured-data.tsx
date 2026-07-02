// Server component: renders a schema.org JSON-LD block for rich results.
// Values are JSON-serialised (never interpolated as markup), so tour titles
// with special characters are safe.

export default function StructuredData({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

type TripJsonLdInput = {
  url: string
  name: string
  description?: string | null
  image?: string | null
  durationDays?: number | null
  priceUsd?: number | null
  startDate?: string | null
  endDate?: string | null
  available?: boolean
  providerName: string
  providerUrl: string
}

export function touristTripJsonLd(input: TripJsonLdInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    url: input.url,
    name: input.name,
    provider: {
      '@type': 'TravelAgency',
      name: input.providerName,
      url: input.providerUrl,
    },
  }
  if (input.description) data.description = input.description
  if (input.image) data.image = input.image
  if (input.durationDays) data.itinerary = { '@type': 'ItemList', numberOfItems: input.durationDays }
  if (input.startDate) data.startDate = input.startDate
  if (input.endDate) data.endDate = input.endDate
  if (input.priceUsd != null) {
    data.offers = {
      '@type': 'Offer',
      price: input.priceUsd,
      priceCurrency: 'USD',
      url: input.url,
      availability: input.available === false
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
    }
  }
  return data
}
