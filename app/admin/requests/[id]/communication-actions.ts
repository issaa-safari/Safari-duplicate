'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'

const LOG_TYPES = new Set(['whatsapp', 'call', 'email', 'meeting', 'note'])

export async function addCommunicationLog(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const requestId = (formData.get('requestId') as string)?.trim()
  const type = (formData.get('type') as string)?.trim()
  const summary = (formData.get('summary') as string)?.trim()

  if (!requestId) throw new Error('Request ID is required.')
  if (!LOG_TYPES.has(type)) throw new Error('Invalid communication type.')
  if (!summary) throw new Error('A summary is required.')
  if (summary.length > 5000) throw new Error('Summary is too long.')

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  const { data: request } = await admin
    .from('requests')
    .select('id')
    .eq('id', requestId)
    .single()

  if (!request) throw new Error('Request not found.')

  const { error } = await admin.from('communication_logs').insert({
    request_id: requestId,
    type,
    summary,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/requests/${requestId}`)
}
