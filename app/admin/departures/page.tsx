import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ButtonLink, Button } from '@/components/ui/button'
import { toggleDeparturePublished } from './[id]/actions'
import StatusBadge from '@/components/admin/status-badge'

export default async function DeparturesPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>
}) {
  const { show } = await searchParams
  const showArchived = show === 'archived'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: departures } = await admin
    .from('departures')
    .select('*, tours (title_en, type)')
    .eq('is_active', showArchived ? false : true)
    .order('start_date', { ascending: true })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">Departures</h1>
          <p className="text-sm text-gray-500 mt-0.5">Scheduled fixed-date trips and seat inventory</p>
        </div>
        <ButtonLink href="/admin/departures/new" size="sm">+ New Departure</ButtonLink>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <Link
          href="/admin/departures"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            !showArchived
              ? 'border-[var(--olive)] text-[var(--olive)]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          Published
        </Link>
        <Link
          href="/admin/departures?show=archived"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            showArchived
              ? 'border-[var(--olive)] text-[var(--olive)]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          Archived
        </Link>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {!departures || departures.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500 mb-4">
              {showArchived ? 'No archived departures.' : 'No departures scheduled yet.'}
            </p>
            {!showArchived && (
              <Link href="/admin/departures/new"
                className="text-sm font-medium text-[var(--olive)] hover:underline">
                Schedule your first departure
              </Link>
            )}
          </div>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Tour</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Seats</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Website</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {departures.map((dep: any) => {
                const tour = dep.tours as any
                const available = dep.max_seats - dep.booked_seats
                return (
                  <tr key={dep.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td data-label="Tour" className="px-4 py-3">
                      <p className="font-medium text-gray-900">{tour?.title_en ?? 'Untitled tour'}</p>
                      {tour?.type && <p className="text-xs text-gray-400 capitalize">{tour.type}</p>}
                    </td>
                    <td data-label="Dates" className="px-4 py-3 text-gray-600">
                      {new Date(dep.start_date).toLocaleDateString('en-GB')}
                      {' → '}
                      {new Date(dep.end_date).toLocaleDateString('en-GB')}
                    </td>
                    <td data-label="Seats" className="px-4 py-3">
                      <span className={available <= 0 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                        {available} / {dep.max_seats}
                      </span>
                      <span className="text-xs text-gray-400 block">{dep.booked_seats} booked</span>
                    </td>
                    <td data-label="Price" className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      ${Number(dep.price_usd).toLocaleString()}
                    </td>
                    <td data-label="Status" className="px-4 py-3">
                      <StatusBadge status={dep.status} />
                    </td>
                    <td data-label="Website" className="px-4 py-3">
                      <form action={async () => { 'use server'; await toggleDeparturePublished(dep.id) }}>
                        {dep.is_active ? (
                          <button type="submit"
                            className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700 hover:bg-green-200"
                            title="Live on website — click to unpublish">
                            ● Published
                          </button>
                        ) : (
                          <button type="submit"
                            className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700"
                            title="Hidden from website — click to publish">
                            ○ Publish
                          </button>
                        )}
                      </form>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={"/admin/departures/" + dep.id}
                        className="text-xs text-[var(--olive)] hover:underline">
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