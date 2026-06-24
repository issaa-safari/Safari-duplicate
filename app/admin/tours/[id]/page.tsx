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
    .select('*, destinations(name), accommodations(name)')
    .eq('tour_id', id)
    .order('day_number', { ascending: true })

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/tours" className="text-sm text-gray-500 hover:text-gray-700">
          Back to Tours
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">{tour.title_en}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={"text-xs px-2 py-0.5 rounded-full font-medium " +
              (tour.status === 'active' ? 'bg-green-100 text-green-700' :
               tour.status === 'draft' ? 'bg-amber-100 text-amber-700' :
               'bg-gray-100 text-gray-600')}>
              {tour.status}
            </span>
            <span className="text-xs text-gray-400">{tour.type}</span>
          </div>
        </div>
        <Link href={"/admin/tours/" + tour.id + "/days"}
          className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Edit Itinerary
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TourEditForm tour={tour} />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Stats</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="text-gray-700">{tour.duration_days} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="text-gray-700 capitalize">{tour.type}</span>
              </div>
              {tour.distance_km && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Distance</span>
                  <span className="text-gray-700">{tour.distance_km}km</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Max group</span>
                <span className="text-gray-700">{tour.max_group_size} people</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Deposit</span>
                <span className="text-gray-700">{tour.deposit_percent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Itinerary days</span>
                <span className="text-gray-700">{days?.length ?? 0} days built</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Itinerary Preview</h2>
            {days && days.length > 0 ? (
              <ul className="space-y-2">
                {days.map((day: any) => (
                  <li key={day.id} className="text-xs text-gray-600">
                    <span className="font-medium text-gray-800">
                      Day {day.day_number}{day.day_number_end ? '-' + day.day_number_end : ''}
                    </span>
                    {' — '}
                    {(day.destinations as any)?.name ?? 'No destination set'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">No itinerary built yet.</p>
            )}
            <Link href={"/admin/tours/" + tour.id + "/days"}
              className="mt-3 block text-xs text-[#7A9A4A] hover:underline">
              Build itinerary →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}