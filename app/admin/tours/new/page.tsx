import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import NewTourForm from './new-tour-form'

export default async function NewTourPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: sourceTours } = await admin
    .from('tours')
    .select('id, title_en, type, duration_days')
    .order('title_en', { ascending: true })

  return <NewTourForm sourceTours={sourceTours ?? []} />
}
