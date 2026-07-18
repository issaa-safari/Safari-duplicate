import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import DestinationEditForm from './form'

export default async function DestinationEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: destination } = await admin
    .from('destinations')
    .select('id, name, country, description_en, description_ar, cover_image_url, is_active, google_maps_url, latitude, longitude')
    .eq('id', id)
    .single()

  if (!destination) notFound()

  return <DestinationEditForm destination={destination} />
}
