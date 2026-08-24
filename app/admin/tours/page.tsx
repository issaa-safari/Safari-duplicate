import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ButtonLink } from '@/components/ui/button'
import ToursListClient, { type TourRow } from './tours-list-client'

export default async function ToursPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: tours } = await admin
    .from('tours')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Itinerary Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Reusable bilingual tours and day-by-day itineraries — the catalog you build departures and proposals from</p>
        </div>
        <ButtonLink href="/admin/tours/new" size="sm">New Itinerary</ButtonLink>
      </div>

      {!tours || tours.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">No itineraries yet.</p>
          <ButtonLink href="/admin/tours/new" size="sm" className="mt-4">Create your first itinerary</ButtonLink>
        </div>
      ) : (
        <ToursListClient
          tours={tours.map((tour: any): TourRow => ({
            id: tour.id,
            type: tour.type,
            status: tour.status,
            titleEn: tour.title_en,
            durationDays: tour.duration_days,
            durationNights: tour.duration_nights,
            countriesVisited: tour.countries_visited,
            startDestination: tour.start_destination,
            endDestination: tour.end_destination,
          }))}
        />
      )}
    </div>
  )
}
