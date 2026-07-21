// Clone a quote version via the API route, then hard-navigate to the new
// draft's editor. window.location (not router.push) on purpose: it always
// lands on a fresh server render with the clone selected — soft navigations
// after server actions proved unreliable here.
//
// Returns an error message on failure, or never (navigates) on success.
export async function cloneVersionAndGo(quoteId: string, versionId: string): Promise<string | null> {
  try {
    const res = await fetch('/api/admin/clone-version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId, versionId }),
    })
    const json = await res.json()
    if (!res.ok || !json.url) return json.error || 'Failed to clone version.'
    window.location.assign(json.url)
    return null
  } catch {
    return 'Failed to clone version — check your connection and try again.'
  }
}
