import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import NewQuoteForm from './form'

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { request: preselectedRequestId } = await searchParams

  const [
    { data: clients },
    { data: requests },
    { data: tours },
    { data: departures },
    { data: linkedRequest },
  ] = await Promise.all([
    admin
      .from('clients')
      .select('id, first_name, last_name, email')
      .order('first_name', { ascending: true }),
    admin
      .from('requests')
      .select('id, reference, client_id')
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('tours')
      .select('id, title_en, type')
      .eq('status', 'active')
      .order('title_en', { ascending: true }),
    admin
      .from('departures')
      .select('id, start_date, end_date, tours (title_en)')
      .eq('kind', 'scheduled_group')
      .eq('status', 'available')
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true }),
    preselectedRequestId
      ? admin.from('requests').select('id, client_id').eq('id', preselectedRequestId).single()
      : Promise.resolve({ data: null }),
  ])

  const defaultClientId = linkedRequest?.client_id ?? ''
  const defaultRequestId = preselectedRequestId ?? ''

  return (
    <NewQuoteForm
      clients={clients ?? []}
      requests={requests ?? []}
      tours={tours ?? []}
      departures={departures ?? []}
      defaultClientId={defaultClientId}
      defaultRequestId={defaultRequestId}
    />
  )
}
