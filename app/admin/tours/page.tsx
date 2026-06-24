import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const TYPE_LABEL: Record<string, string> = {
  bike:    'Bike Tour',
  private: 'Private Safari',
  group:   'Group Safari',
}

export default async function ToursPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: tours } = await supabase
    .from('tours')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Tour Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your bilingual tour templates and itineraries</p>
        </div>
        <Link href="/admin/tours/new"
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: '#7A9A4A' }}>
          Create Your Template
        </Link>
      </div>

      {!tours || tours.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">No tours yet.</p>
          <Link href="/admin/tours/new"
            className="mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: '#7A9A4A' }}>
            Create First Template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tours.map((tour: any) => (
            <div key={tour.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-[#7A9A4A] hover:shadow-sm transition flex flex-col">

              {/* Card image / colour band */}
              <div className="h-28 bg-gradient-to-br from-[#4C5E2A] to-[#7A9A4A] relative flex items-start justify-between p-3">
                <span className="text-xs font-medium bg-white/20 text-white px-2 py-0.5 rounded-full">
                  {TYPE_LABEL[tour.type] ?? tour.type}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    tour.status === 'active' ? 'bg-green-500 text-white' :
                    tour.status === 'draft'  ? 'bg-amber-400 text-white' :
                    'bg-gray-400 text-white'
                  }`}>
                    {tour.status.charAt(0).toUpperCase() + tour.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div className="p-4 flex flex-col flex-1">
                <h2 className="font-semibold text-gray-900 text-sm leading-snug mb-3">
                  {tour.title_en}
                </h2>

                <div className="space-y-1.5 text-xs text-gray-500 flex-1">
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-32 shrink-0">Tour Type</span>
                    <span className="text-gray-700 capitalize">{TYPE_LABEL[tour.type] ?? tour.type}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-32 shrink-0">Tour Length</span>
                    <span className="text-gray-700">
                      {tour.duration_days} Days / {tour.duration_nights} Nights
                    </span>
                  </div>
                  {tour.countries_visited && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-32 shrink-0">Countries Visited</span>
                      <span className="text-gray-700">{tour.countries_visited}</span>
                    </div>
                  )}
                  {tour.start_destination && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-32 shrink-0">Start Destination</span>
                      <span className="text-gray-700">{tour.start_destination}</span>
                    </div>
                  )}
                  {tour.end_destination && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-32 shrink-0">End Destination</span>
                      <span className="text-gray-700">{tour.end_destination}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <Link href={`/admin/tours/${tour.id}`}
                    className="flex-1 rounded-md px-3 py-1.5 text-xs font-medium text-white text-center"
                    style={{ backgroundColor: '#7A9A4A' }}>
                    Edit Tour
                  </Link>
                  <Link href={`/admin/tours/${tour.id}/days`}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    Share Tour
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
