import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import TourEditForm from './tour-edit-form'

export default async function TourDetailPage({
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
    .select('*')
    .eq('id', id)
    .single()

  if (!tour) notFound()

  const { data: days } = await admin
    .from('tour_days')
    .select('id, day_number, day_number_end, title_en, destination_id')
    .eq('tour_id', id)
    .order('day_number', { ascending: true })

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/tours" className="text-sm text-muted-foreground hover:text-foreground">
          Back to Tours
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground">{tour.title_en}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={"text-xs px-2 py-0.5 rounded-full font-medium " +
              (tour.status === 'active' ? 'bg-green-100 text-green-700' :
               tour.status === 'draft' ? 'bg-amber-100 text-warning-foreground' :
               'bg-muted text-muted-foreground')}>
              {tour.status}
            </span>
            <span className="text-xs text-muted-foreground">{tour.type}</span>
          </div>
        </div>
        <Link href={"/admin/tours/" + tour.id + "/days"}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          Edit Itinerary
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TourEditForm tour={tour} />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface shadow-sm p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Quick Stats</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="text-foreground">{tour.duration_days} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="text-foreground capitalize">{tour.type}</span>
              </div>
              {tour.distance_km && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance</span>
                  <span className="text-foreground">{tour.distance_km}km</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max group</span>
                <span className="text-foreground">{tour.max_group_size} people</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit</span>
                <span className="text-foreground">{tour.deposit_percent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itinerary days</span>
                <span className="text-foreground">{days?.length ?? 0} days built</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface shadow-sm p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Itinerary Preview</h2>
            {days && days.length > 0 ? (
              <ul className="space-y-2">
                {days.map((day: any) => (
                  <li key={day.id} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Day {day.day_number}{day.day_number_end ? '-' + day.day_number_end : ''}
                    </span>
                    {' — '}
                    {day.title_en || 'No title set'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No itinerary built yet.</p>
            )}
            <Link href={"/admin/tours/" + tour.id + "/days"}
              className="mt-3 block text-xs text-brand-text hover:underline">
              Build itinerary →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}