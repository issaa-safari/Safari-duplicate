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
    { data: templateRows },
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
    admin
      .from('quotes')
      .select('id, quote_number, quote_versions!quote_versions_quote_id_fkey ( title, version_number, total_selling_usd )')
      .eq('is_template', true)
      .order('created_at', { ascending: false }),
    preselectedRequestId
      ? admin.from('requests').select('id, client_id').eq('id', preselectedRequestId).single()
      : Promise.resolve({ data: null }),
  ])

  const defaultClientId = linkedRequest?.client_id ?? ''
  const defaultRequestId = preselectedRequestId ?? ''
  const templates = (templateRows ?? []).map(row => {
    const versions = [...(row.quote_versions ?? [])]
      .sort((a, b) => b.version_number - a.version_number)
    const latest = versions[0]
    return {
      id: row.id,
      label: latest?.title || row.quote_number,
      totalSellingUsd: latest?.total_selling_usd ?? null,
    }
  })

  return (
    <NewQuoteForm
      clients={clients ?? []}
      requests={requests ?? []}
      tours={tours ?? []}
      departures={departures ?? []}
      templates={templates}
      defaultClientId={defaultClientId}
      defaultRequestId={defaultRequestId}
    />
  )
}
