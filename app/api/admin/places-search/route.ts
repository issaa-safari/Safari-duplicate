import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { isPlacesSearchEnabled, searchPlacesText } from '@/lib/google-places'

// Admin-only proxy for Places API (New) Text Search — the Google key never
// reaches the client (the CSP would block a browser call to Google anyway).
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  try {
    await assertAdminAccess(admin, user.email)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { query } = await request.json().catch(() => ({}))
  const q = typeof query === 'string' ? query.trim() : ''
  if (!q) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  if (!isPlacesSearchEnabled()) {
    return NextResponse.json(
      { error: 'Google Maps search is not configured (set GOOGLE_PLACES_API_KEY). Manual entry still works.' },
      { status: 503 },
    )
  }

  try {
    const results = await searchPlacesText(q)
    return NextResponse.json({ results })
  } catch (err) {
    console.warn('[places-search]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Google Maps search failed — try again or enter the location manually.' }, { status: 502 })
  }
}
