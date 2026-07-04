import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ButtonLink, Button } from '@/components/ui/button'
import ContentShell from '../content-shell'

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
    <ContentShell active="activities" title="Activities" icon="□">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Activities</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage activities used in tour itineraries</p>
        </div>
        <ButtonLink href="/admin/content/activities/new" size="sm">+ New Activity</ButtonLink>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <Link
          href="/admin/content/activities?tab=content"
          className={'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' +
            (activeTab === 'content'
              ? 'border-[var(--olive)] text-[var(--olive)]'
              : 'border-transparent text-gray-500 hover:text-gray-700')}>
          With Content
          <span className="ml-1.5 text-xs text-gray-400">({withContent.length})</span>
        </Link>
        <Link
          href="/admin/content/activities?tab=empty"
          className={'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' +
            (activeTab === 'empty'
              ? 'border-[var(--olive)] text-[var(--olive)]'
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
              <Link href="/admin/content/activities/new" className="text-sm font-medium text-[var(--olive)] hover:underline">
                Add your first activity
              </Link>
            )}
          </div>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 text-xs">
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Location</th>
                <th className="px-4 py-3 font-medium text-center hidden md:table-cell">Description</th>
                <th className="px-4 py-3 font-medium text-center hidden md:table-cell">Image</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((act: any) => {
                const hasDesc = act.has_content ? 1 : 0
                const hasImg  = act.cover_image_url ? 1 : 0
                return (
                  <tr key={act.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td data-label="Activity" className="px-4 py-3">
                      <span className="font-medium text-gray-900">{act.name}</span>
                      {!act.is_active && (
                        <span className="ml-2 text-xs text-gray-400">(inactive)</span>
                      )}
                    </td>
                    <td data-label="Location" className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {act.destinations?.name ?? <span className="text-gray-300">No specific location</span>}
                    </td>
                    <td data-label="Description" className="px-4 py-3 text-center hidden md:table-cell">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium ${
                        hasDesc ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {hasDesc}
                      </span>
                    </td>
                    <td data-label="Image" className="px-4 py-3 text-center hidden md:table-cell">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium ${
                        hasImg ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {hasImg}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={'/admin/content/activities/' + act.id}
                        className="text-gray-400 hover:text-gray-700">
                        →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </ContentShell>
  )
}
