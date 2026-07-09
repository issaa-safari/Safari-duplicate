import { redirect } from 'next/navigation'

// Pricing now lives inside the unified quote workspace (Itinerary → Pricing →
// Preview → Send on one page). This route survives only to keep old
// bookmarks/links working.
export default async function TripBuilderEditPage({
  params,
}: {
  params: Promise<{ quoteId: string }>
}) {
  const { quoteId } = await params
  redirect(`/admin/quotes/${quoteId}?step=pricing`)
}
