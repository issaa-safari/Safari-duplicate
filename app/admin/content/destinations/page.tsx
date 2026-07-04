import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ButtonLink, Button } from '@/components/ui/button'
import ContentShell from '../content-shell'

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: destinations } = await admin
    .from('destinations')
    .select('id, name, country, cover_image_url, is_active, has_content, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const withContent = (destinations ?? []).filter((d: any) => d.has_content)
  const withoutContent = (destinations ?? []).filter((d: any) => !d.has_content)
  const activeTab = tab === 'empty' ? 'empty' : 'content'
  const shown = activeTab === 'content' ? withContent : withoutContent

  return (
    <ContentShell active="destinations" title="Destinations" icon="✣">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Destinations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage destination pages and content</p>
        </div>
        <ButtonLink href="/admin/content/destinations/new" size="sm">+ New Destination</ButtonLink>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <Link
          href="/admin/content/destinations?tab=content"
          className={'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' +
            (activeTab === 'content'
              ? 'border-[var(--olive)] text-[var(--olive)]'
              : 'border-transparent text-gray-500 hover:text-gray-700')}>
          With Content
          <span className="ml-1.5 text-xs text-gray-400">({withContent.length})</span>
        </Link>
        <Link
          href="/admin/content/destinations?tab=empty"
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
              {activeTab === 'content'
                ? 'No destinations with content yet.'
                : 'All destinations have content.'}
            </p>
            {activeTab === 'content' && (
              <Link
                href="/admin/content/destinations/new"
                className="text-sm font-medium text-[var(--olive)] hover:underline">
                Add your first destination
              </Link>
            )}
          </div>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Country</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Cover Image</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((dest: any) => (
                <tr key={dest.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td data-label="Name" className="px-4 py-3 font-medium text-gray-900">{dest.name}</td>
                  <td data-label="Country" className="px-4 py-3 text-gray-500 hidden sm:table-cell">{dest.country}</td>
                  <td data-label="Cover Image" className="px-4 py-3 hidden md:table-cell">
                    {dest.cover_image_url ? (
                      <span className="text-xs text-green-600 font-medium">✓ Set</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td data-label="Status" className="px-4 py-3">
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' +
                      (dest.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {dest.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ButtonLink
                      href={'/admin/content/destinations/' + dest.id} size="sm">Edit
                    </ButtonLink>
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
