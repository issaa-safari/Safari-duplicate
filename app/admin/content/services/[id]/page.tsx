import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import ContentShell from '../../content-shell'
import ServiceForm from '../service-form'
import { updateService, retireService } from '../actions'
import type { Service } from '@/lib/types'

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data } = await admin.from('services').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()

  return (
    <ContentShell active="services" title={data.name_en}>
      <h1 className="mb-6 text-xl font-semibold text-foreground">{data.name_en}</h1>
      <ServiceForm
        service={data as Service}
        action={updateService}
        retireAction={retireService}
        submitLabel="Save Changes"
      />
    </ContentShell>
  )
}
