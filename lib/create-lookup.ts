// Creates a new content-library entry (destination / accommodation / activity)
// and returns it, so itinerary builders can add new items inline and have them
// persisted to the shared Content library — including bilingual descriptions.
export async function createLookup(
  kind: 'destination' | 'accommodation' | 'activity',
  name: string,
  opts?: { destinationId?: string | null; descriptionEn?: string | null; descriptionAr?: string | null },
): Promise<{ id: string; name: string; destination_id?: string | null }> {
  const res = await fetch('/api/admin/create-lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind,
      name,
      destinationId: opts?.destinationId ?? null,
      descriptionEn: opts?.descriptionEn ?? null,
      descriptionAr: opts?.descriptionAr ?? null,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Failed to create')
  return json.item
}
