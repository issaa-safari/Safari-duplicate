import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import ContentShell from '../../content-shell'
import ParkEditForm from './form'
import EntityRatesPanel from '@/components/admin/entity-rates-panel'

export default async function ParkEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: park } = await admin
    .from('parks')
    .select('id, name, country, park_type, description_en, cover_image_url, is_active, google_maps_url, latitude, longitude')
    .eq('id', id)
    .single()

  if (!park) notFound()

  return (
    <ContentShell active="parks" title={park.name}>
      <ParkEditForm park={park} />
      <EntityRatesPanel entityType="park_fee" entityId={id} heading="Park Fee Rates" />
    </ContentShell>
  )
}
