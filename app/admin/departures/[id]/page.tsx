import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import DepartureEditForm from './form'

export default async function DepartureEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: departure } = await admin
    .from('departures')
    .select('*, tours (title_en, type)')
    .eq('id', id)
    .single()

  if (!departure) notFound()

  return <DepartureEditForm departure={departure} />
}
