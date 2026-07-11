import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ItineraryBuilder from './itinerary-builder'

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { id } = await params
  const admin = createAdminClient()

  const { data: tour } = await admin
    .from('tours')
    .select('id, title_en, type, duration_days')
    .eq('id', id)
    .single()

  if (!tour) notFound()

  const { data: days } = await admin
    .from('tour_days')
    .select('*')
    .eq('tour_id', id)
    .order('day_number', { ascending: true })

  const { data: destinations } = await admin
    .from('destinations')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const { data: accommodations } = await admin
    .from('accommodations')
    .select('id, name, destination_id')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const { data: activities } = await admin
    .from('activities')
    .select('id, name, destination_id')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={"/admin/tours/" + id} className="text-sm text-gray-500 hover:text-gray-700">
          Back to Tour
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Itinerary — {tour.title_en}</h1>
          <p className="text-xs text-muted-foreground">{tour.duration_days}-day tour</p>
        </div>
      </div>

      <ItineraryBuilder
        tourId={id}
        durationDays={tour.duration_days ?? 1}
        initialDays={days ?? []}
        destinations={destinations ?? []}
        accommodations={accommodations ?? []}
        activities={activities ?? []}
      />
    </div>
  )
}