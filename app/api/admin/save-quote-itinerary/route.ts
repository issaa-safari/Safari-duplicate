import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { assertAdminAccess } from '@/lib/auth/admin-access'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { versionId, days } = await request.json()
  if (!versionId || !Array.isArray(days)) {
    return NextResponse.json({ error: 'A version ID and days array are required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  try {
    await assertAdminAccess(admin, user.email)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { error } = await admin.rpc('save_quote_itinerary', {
    p_version_id: versionId,
    p_days: days,
  })

  if (error) {
    console.error('[save-quote-itinerary] rpc failed', error)
    // Pass the DB guard's message through so the builder can tell the user
    // *why* the save failed (e.g. the version is sent/locked) instead of a
    // generic failure that leaves "Unsaved changes" unexplained.
    const message = /locked/i.test(error.message ?? '')
      ? 'This quote version has been sent and is locked — create a new version to edit the itinerary.'
      : (error.message || 'Failed to save itinerary')
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
