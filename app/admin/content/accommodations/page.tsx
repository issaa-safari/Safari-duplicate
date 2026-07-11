import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ButtonLink, Button } from '@/components/ui/button'
import ContentShell from '../content-shell'

const TIER_STYLES: Record<string, string> = {
  budget: 'bg-muted text-muted-foreground',
  midrange: 'bg-blue-100 text-blue-700',
  luxury: 'bg-amber-100 text-warning-foreground',
  ultra: 'bg-purple-100 text-purple-700',
}

export default async function AccommodationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: accommodations } = await admin
    .from('accommodations')
    .select('id, name, type, budget_tier, cover_image_url, is_active, has_content, destinations(name)')
    .order('name', { ascending: true })

  const withContent = (accommodations ?? []).filter((a: any) => a.has_content)
  const withoutContent = (accommodations ?? []).filter((a: any) => !a.has_content)
  const activeTab = tab === 'empty' ? 'empty' : 'content'
  const shown = activeTab === 'content' ? withContent : withoutContent

  return (
    <ContentShell active="accommodations" title="Accommodations">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Accommodations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage lodges, camps, and hotels used in itineraries</p>
        </div>
        <ButtonLink href="/admin/content/accommodations/new" size="sm">+ New Accommodation</ButtonLink>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <Link
          href="/admin/content/accommodations?tab=content"
          className={'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' +
            (activeTab === 'content'
              ? 'border-primary-strong text-brand-text'
              : 'border-transparent text-muted-foreground hover:text-foreground')}>
          With Content
          <span className="ml-1.5 text-xs text-muted-foreground">({withContent.length})</span>
        </Link>
        <Link
          href="/admin/content/accommodations?tab=empty"
          className={'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' +
            (activeTab === 'empty'
              ? 'border-primary-strong text-brand-text'
              : 'border-transparent text-muted-foreground hover:text-foreground')}>
          Without Content
          <span className="ml-1.5 text-xs text-muted-foreground">({withoutContent.length})</span>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {shown.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {activeTab === 'content'
                ? 'No accommodations with content yet.'
                : 'All accommodations have content.'}
            </p>
            {activeTab === 'content' && (
              <Link
                href="/admin/content/accommodations/new"
                className="text-sm font-medium text-brand-text hover:underline">
                Add your first accommodation
              </Link>
            )}
          </div>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground text-xs">
                <th className="px-4 py-3 font-medium">Accommodation</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Destination</th>
                <th className="px-4 py-3 font-medium text-center hidden md:table-cell">Description</th>
                <th className="px-4 py-3 font-medium text-center hidden md:table-cell">Image</th>
                <th className="px-4 py-3 font-medium text-center hidden md:table-cell">Video</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((acc: any) => {
                const hasDesc = acc.has_content ? 1 : 0
                const hasImg  = acc.cover_image_url ? 1 : 0
                return (
                  <tr key={acc.id} className="border-b border-border/70 last:border-0 hover:bg-muted">
                    <td data-label="Accommodation" className="px-4 py-3">
                      <span className="font-medium text-foreground">{acc.name}</span>
                      {acc.budget_tier && (
                        <span className={'ml-2 text-xs px-1.5 py-0.5 rounded font-medium capitalize ' +
                          (TIER_STYLES[acc.budget_tier] ?? 'bg-muted text-muted-foreground')}>
                          {acc.budget_tier}
                        </span>
                      )}
                    </td>
                    <td data-label="Destination" className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {acc.destinations?.name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td data-label="Description" className="px-4 py-3 text-center hidden md:table-cell">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium ${
                        hasDesc ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        {hasDesc}
                      </span>
                    </td>
                    <td data-label="Image" className="px-4 py-3 text-center hidden md:table-cell">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium ${
                        hasImg ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        {hasImg}
                      </span>
                    </td>
                    <td data-label="Video" className="px-4 py-3 text-center hidden md:table-cell">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium bg-muted text-muted-foreground">
                        0
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={'/admin/content/accommodations/' + acc.id}
                        className="text-muted-foreground hover:text-foreground">
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
