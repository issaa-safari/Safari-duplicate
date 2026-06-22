import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import NewActivityForm from './form'

export default async function NewActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: destinations } = await admin
    .from('destinations')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return <NewActivityForm destinations={destinations ?? []} />
}
