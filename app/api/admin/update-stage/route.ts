import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { assertAdminAccess } from '@/lib/auth/admin-access'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requestId, stage } = await request.json()
  // New / Working On / Open are computed from quote activity (group_44 trigger),
  // so only the manual stages are settable by hand — matching the Safari app.
  const manualStages = new Set(['pre_booked', 'booked', 'completed', 'not_booked', 'archived'])

  if (typeof requestId !== 'string' || !manualStages.has(stage)) {
    return NextResponse.json(
      { error: 'That stage is set automatically and cannot be changed by hand.' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  try {
    await assertAdminAccess(admin, user.email)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { error } = await admin
    .from('requests')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) {
    console.error('[update-stage]', error)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
