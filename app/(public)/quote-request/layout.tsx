import type { Metadata } from 'next'

// The quote-request page is a client component, so its metadata lives here.
// Layouts do not receive searchParams, so there is no ?lang= aware variant.
export const metadata: Metadata = {
  title: 'Request a Custom Safari Quote',
  description:
    "Tell us your dates, group size, and interests, and we'll build a custom Kenya or Tanzania safari itinerary with per-person pricing.",
  alternates: { canonical: '/quote-request' },
}

export default function QuoteRequestLayout({ children }: { children: React.ReactNode }) {
  return children
}
