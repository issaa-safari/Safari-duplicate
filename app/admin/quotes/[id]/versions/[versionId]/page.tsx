import { redirect } from 'next/navigation'

// The itinerary editor now lives inside the unified quote workspace
// (Itinerary → Pricing → Preview → Send on one page). This route survives
// only to keep old bookmarks/links working; the version is pre-selected.
export default async function VersionEditorPage({
  params,
}: {
  params: Promise<{ id: string; versionId: string }>
}) {
  const { id, versionId } = await params
  redirect(`/admin/quotes/${id}?step=itinerary&version=${versionId}`)
}
