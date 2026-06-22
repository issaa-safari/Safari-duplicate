import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: activities } = await admin
    .from('activities')
    .select('id, name, cover_image_url, is_active, has_content, destinations(name)')
    .order('name', { ascending: true })

  const withContent = (activities ?? []).filter((a: any) => a.has_content)
  const withoutContent = (activities ?? []).filter((a: any) => !a.has_content)
  const activeTab = tab === 'empty' ? 'empty' : 'content'
  const shown = activeTab === 'content' ? withContent : withoutContent

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Activities</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage activities used in tour itineraries</p>
        </div>
        <Link
          href="/admin/content/activities/new"
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: '#7A9A4A' }}>
          + New Activity
        </Link>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <Link
          href="/admin/content/activities?tab=content"
          className={'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' +
            (activeTab === 'content'
              ? 'border-[#7A9A4A] text-[#7A9A4A]'
              : 'border-transparent text-gray-500 hover:text-gray-700')}>
          With Content
          <span className="ml-1.5 text-xs text-gray-400">({withContent.length})</span>
        </Link>
        <Link
          href="/admin/content/activities?tab=empty"
          className={'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' +
            (activeTab === 'empty'
              ? 'border-[#7A9A4A] text-[#7A9A4A]'
              : 'border-transparent text-gray-500 hover:text-gray-700')}>
          Without Content
          <span className="ml-1.5 text-xs text-gray-400">({withoutContent.length})</span>
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {shown.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500 mb-4">
              {activeTab === 'content' ? 'No activities with content yet.' : 'All activities have content.'}
            </p>
            {activeTab === 'content' && (
              <Link href="/admin/content/activities/new" className="text-sm font-medium text-[#7A9A4A] hover:underline">
                Add your first activity
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Destination</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Cover Image</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((act: any) => (
                <tr key={act.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{act.name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{act.destinations?.name ?? '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {act.cover_image_url
                      ? <span className="text-xs text-green-600 font-medium">✓ Set</span>
                      : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' +
                      (act.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {act.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={'/admin/content/activities/' + act.id}
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
    </div>
  )
}
