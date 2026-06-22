import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import NewDepartureForm from './form'

export default async function NewDeparturePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: tours } = await admin
    .from('tours')
    .select('id, title_en, type')
    .order('title_en', { ascending: true })

  return <NewDepartureForm tours={tours ?? []} />
}