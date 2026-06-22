import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  full: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  closed: 'bg-gray-100 text-gray-600',
}

export default async function DeparturesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: departures } = await admin
    .from('departures')
    .select('*, tours (title_en, type)')
    .eq('is_active', true)
    .order('start_date', { ascending: true })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Departures</h1>
          <p className="text-sm text-gray-500 mt-0.5">Scheduled fixed-date trips and seat inventory</p>
        </div>
        <Link href="/admin/departures/new"
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: '#7A9A4A' }}>
          + New Departure
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {!departures || departures.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500 mb-4">No departures scheduled yet.</p>
            <Link href="/admin/departures/new"
              className="text-sm font-medium text-[#7A9A4A] hover:underline">
              Schedule your first departure
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Tour</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Seats</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {departures.map((dep: any) => {
                const tour = dep.tours as any
                const available = dep.max_seats - dep.booked_seats
                return (
                  <tr key={dep.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{tour?.title_en ?? 'Untitled tour'}</p>
                      {tour?.type && <p className="text-xs text-gray-400 capitalize">{tour.type}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(dep.start_date).toLocaleDateString('en-GB')}
                      {' → '}
                      {new Date(dep.end_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={available <= 0 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                        {available} / {dep.max_seats}
                      </span>
                      <span className="text-xs text-gray-400 block">{dep.booked_seats} booked</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      ${Number(dep.price_usd).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' +
                        (STATUS_STYLES[dep.status] ?? 'bg-gray-100 text-gray-600')}>
                        {dep.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={"/admin/departures/" + dep.id}
                        className="text-xs text-[#7A9A4A] hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}