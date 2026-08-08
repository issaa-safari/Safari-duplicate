import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContentShell from '../../content-shell'
import ServiceForm from '../service-form'
import { createService } from '../actions'

export default async function NewServicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <ContentShell active="services" title="New Service">
      <h1 className="mb-6 text-xl font-semibold text-foreground">New Service</h1>
      <ServiceForm action={createService} submitLabel="Create Service" />
    </ContentShell>
  )
}
