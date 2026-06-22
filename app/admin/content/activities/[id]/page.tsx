import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import ActivityEditForm from './form'

export default async function ActivityEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const [{ data: activity }, { data: destinations }] = await Promise.all([
    admin
      .from('activities')
      .select('id, name, destination_id, description_en, description_ar, cover_image_url, is_active')
      .eq('id', id)
      .single(),
    admin
      .from('destinations')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  if (!activity) notFound()

  return <ActivityEditForm activity={activity} destinations={destinations ?? []} />
}
