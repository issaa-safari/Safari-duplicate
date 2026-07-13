import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContentShell from '../../content-shell'
import NewParkForm from './form'

export default async function NewParkPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <ContentShell active="parks" title="New Park / Reserve">
      <NewParkForm />
    </ContentShell>
  )
}
