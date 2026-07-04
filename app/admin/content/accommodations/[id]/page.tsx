import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import AccommodationEditForm from './form'
import EntityRatesPanel from '@/components/admin/entity-rates-panel'

export default async function AccommodationEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const [{ data: accommodation }, { data: destinations }] = await Promise.all([
    admin
      .from('accommodations')
      .select('id, name, destination_id, type, budget_tier, rating, description_en, description_ar, cover_image_url, is_active')
      .eq('id', id)
      .single(),
    admin
      .from('destinations')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  if (!accommodation) notFound()

  return (
    <>
      <AccommodationEditForm accommodation={accommodation} destinations={destinations ?? []} />
      <EntityRatesPanel entityType="accommodation" entityId={id} />
    </>
  )
}
