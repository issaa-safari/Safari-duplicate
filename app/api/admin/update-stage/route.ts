import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { assertAdminAccess } from '@/lib/auth/admin-access'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requestId, stage } = await request.json()
  const allowedStages = new Set(['new', 'working_on', 'open', 'pre_booked', 'booked', 'completed', 'not_booked'])

  if (typeof requestId !== 'string' || !allowedStages.has(stage)) {
    return NextResponse.json({ error: 'Invalid request or stage.' }, { status: 400 })
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
