import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import DepartureEditForm from './form'

export default async function DepartureEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: departure } = await admin
    .from('departures')
    .select(`
      *,
      tours (
        id,
        title_en,
        title_ar,
        subtitle_en,
        overview_en,
        type
      )
    `)
    .eq('id', id)
    .single()

  if (!departure) notFound()

  // Get tour days for this departure's tour
  const { data: tourDays } = await admin
    .from('tour_days')
    .select('*')
    .eq('tour_id', departure.tour_id)
    .order('day_number')

  return <DepartureEditForm departure={departure} departureId={id} tourDays={tourDays || []} />
}
