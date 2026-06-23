import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ContentShell from '../content-shell'

const TYPE_LABELS: Record<string, string> = {
  national_park:  'National Park',
  game_reserve:   'Game Reserve',
  conservancy:    'Conservancy',
  marine_park:    'Marine Park',
  forest_reserve: 'Forest Reserve',
  other:          'Other',
}

export default async function ParksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: parks } = await admin
    .from('parks')
    .select('id, name, country, park_type, is_active')
    .order('country')
    .order('name')

  return (
    <ContentShell active="parks" title="Parks & Reserves" icon="⛰">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Parks & Reserves</h1>
          <p className="text-sm text-gray-500 mt-0.5">National parks, game reserves, and conservancies with entrance fees</p>
        </div>
        <Link
          href="/admin/content/parks/new"
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: '#7A9A4A' }}>
          + New Park
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {(parks ?? []).length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500 mb-4">No parks or reserves yet.</p>
            <Link href="/admin/content/parks/new" className="text-sm font-medium text-[#7A9A4A] hover:underline">
              Add your first park
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Country</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(parks ?? []).map((park: any) => (
                <tr key={park.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{park.name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{park.country}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {TYPE_LABELS[park.park_type] ?? park.park_type}
                  </td>
                  <td className="px-4 py-3">
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' +
                      (park.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {park.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={'/admin/content/parks/' + park.id}
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
