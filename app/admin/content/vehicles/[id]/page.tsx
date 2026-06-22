import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import VehicleEditForm from './form'

export default async function VehicleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: vehicle } = await admin
    .from('vehicles')
    .select('id, name, type, seats, count, description_en, image_url, is_active')
    .eq('id', id)
    .single()

  if (!vehicle) notFound()

  return <VehicleEditForm vehicle={vehicle} />
}
