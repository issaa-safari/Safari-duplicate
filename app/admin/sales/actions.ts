'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'

export type IntakeRetryResult = { ok: true } | { ok: false; error: string }

export async function retryFailedIntake(eventId: string): Promise<IntakeRetryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)

  const { data: event, error: readError } = await admin
    .from('intake_events')
    .select('id, status, payload')
    .eq('id', eventId)
    .maybeSingle()

  if (readError) return { ok: false, error: readError.message }
  if (!event) return { ok: false, error: 'The intake event no longer exists.' }
  if (event.status === 'processed') {
    revalidatePath('/admin/sales')
    return { ok: true }
  }
  if (event.status !== 'failed') {
    return { ok: false, error: 'This intake event is already being processed.' }
  }

  const { data, error } = await admin.rpc('ingest_enquiry_atomic', {
    p_payload: event.payload,
  })
  if (error) return { ok: false, error: error.message }

  const result = data as { status?: string; error?: string } | null
  if (result?.status !== 'processed') {
    return { ok: false, error: result?.error ?? 'The enquiry could not be recovered.' }
  }

  revalidatePath('/admin/sales')
  revalidatePath('/admin/requests')
  revalidatePath('/admin/quotes')
  return { ok: true }
}
