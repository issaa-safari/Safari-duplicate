import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ContentShell from '../content-shell'

const TYPE_LABELS: Record<string, string> = {
  jeep: 'Jeep',
  van: 'Van',
  bus: 'Bus',
  motorbike: 'Motorbike',
  boat: 'Boat',
}

export default async function VehiclesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: vehicles } = await admin
    .from('vehicles')
    .select('id, name, type, seats, count, image_url, is_active')
    .order('name', { ascending: true })

  return (
    <ContentShell active="vehicles" title="Vehicles" icon="▰">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Vehicles</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage vehicles available for tours</p>
        </div>
        <Link
          href="/admin/content/vehicles/new"
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: '#7A9A4A' }}>
          + New Vehicle
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {!vehicles || vehicles.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500 mb-4">No vehicles added yet.</p>
            <Link href="/admin/content/vehicles/new" className="text-sm font-medium text-[#7A9A4A] hover:underline">
              Add your first vehicle
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Seats</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Count</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v: any) => (
                <tr key={v.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell capitalize">
                    {TYPE_LABELS[v.type] ?? v.type}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{v.seats}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{v.count}</td>
                  <td className="px-4 py-3">
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' +
                      (v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={'/admin/content/vehicles/' + v.id}
                      className="text-xs font-medium text-white rounded-md px-3 py-1.5"
                      style={{ backgroundColor: '#7A9A4A' }}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ContentShell>
  )
}
