import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'
import { PageShell, PageHeader } from '@/components/admin/ui/page'
import { EmptyState } from '@/components/admin/ui/empty-state'
import QuotesListClient, { type QuoteRow } from './quotes-list-client'
import { countByGroup, QUOTE_GROUPS, resolveStatusFilter } from '@/lib/status-groups'

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  // Count per status for tab badges
  const { data: allQuotes } = await admin
    .from('quotes')
    .select('status')

  // Four buckets rather than one tab per status; the exact status still shows
  // on every row. See lib/status-groups.ts.
  const filter = resolveStatusFilter(QUOTE_GROUPS, status)
  const activeGroup = QUOTE_GROUPS.find(g => g.key === filter.groupKey) ?? QUOTE_GROUPS[0]
  const counts = countByGroup(QUOTE_GROUPS, (allQuotes ?? []) as { status: string }[])

  // Separate queries to avoid PostgREST FK ambiguity and status-column collision
  const quotesQuery = admin
    .from('quotes')
    .select('id, quote_number, status, mode, created_at, client_id')
    .order('created_at', { ascending: false })

  const { data: quotes } = await (filter.statuses
    ? quotesQuery.in('status', filter.statuses)
    : quotesQuery)

  const quoteIds = (quotes ?? []).map((q: any) => q.id)
  const clientIds = [...new Set((quotes ?? []).map((q: any) => q.client_id))]

  const [{ data: clientsData }, { data: versionsData }] = await Promise.all([
    clientIds.length
      ? admin.from('clients').select('id, first_name, last_name, email').in('id', clientIds)
      : Promise.resolve({ data: [] }),
    quoteIds.length
      ? admin.from('quote_versions')
          .select('id, quote_id, version_number, status, travel_start_date, travel_end_date, sharing_price_per_person_usd, total_selling_usd')
          .in('quote_id', quoteIds)
          .order('version_number', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const clientMap = Object.fromEntries((clientsData ?? []).map((c: any) => [c.id, c]))
  const versionsByQuote: Record<string, any[]> = {}
  for (const v of (versionsData ?? [])) {
    if (!versionsByQuote[v.quote_id]) versionsByQuote[v.quote_id] = []
    versionsByQuote[v.quote_id].push(v)
  }

  return (
    <PageShell>
      <PageHeader
        title="Quotes"
        subtitle="Build and send pricing proposals to clients"
        actions={
          <ButtonLink href="/admin/quotes/new" variant="primary" size="sm">
            + New Quote
          </ButtonLink>
        }
      />

      {/* Status tabs */}
      <nav aria-label="Quote statuses" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {QUOTE_GROUPS.map((group) => (
          <Link
            key={group.key}
            href={`/admin/quotes?status=${group.key}`}
            aria-current={activeGroup.key === group.key ? 'page' : undefined}
            className={'-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150 ' +
              (activeGroup.key === group.key
                ? 'border-primary-strong text-brand-text'
                : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {group.label}
            {counts[group.key] ? (
              <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">({counts[group.key]})</span>
            ) : null}
          </Link>
        ))}
      </nav>

      {/* Arrived from a link naming one status: say so, and offer the way out. */}
      {filter.exactStatus && (
        <p className="-mt-3 mb-4 text-sm text-muted-foreground">
          Showing only <span className="font-medium capitalize text-foreground">{filter.exactStatus}</span>.{' '}
          <Link href={`/admin/quotes?status=${activeGroup.key}`} className="text-brand-text hover:underline">
            Show all {activeGroup.label.toLowerCase()}
          </Link>
        </p>
      )}

      {/* Quote list */}
      {!quotes || quotes.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface shadow-sm">
          <EmptyState
            icon={FileText}
            title={filter.exactStatus
              ? `No ${filter.exactStatus} quotes`
              : activeGroup.key === 'all' ? 'No quotes yet' : `Nothing in ${activeGroup.label.toLowerCase()}`}
            body={activeGroup.blurb
              ?? 'Quotes start as drafts while you build the itinerary and pricing, then go out to the client and come back accepted.'}
            action={
              (activeGroup.key === 'all' || activeGroup.key === 'draft') && (
                <ButtonLink href="/admin/quotes/new" variant="primary" size="sm">
                  Create your first quote
                </ButtonLink>
              )
            }
          />
        </div>
      ) : (
        <QuotesListClient
          quotes={quotes.map((q: any): QuoteRow => {
            const client = clientMap[q.client_id] ?? null
            const clientName = client
              ? `${client.first_name} ${client.last_name}`.trim()
              : '—'
            const versions: any[] = versionsByQuote[q.id] ?? []
            const latest = versions[0] // already ordered desc by version_number
            return {
              id: q.id,
              quoteNumber: q.quote_number,
              status: q.status,
              mode: q.mode,
              createdAt: q.created_at,
              clientName,
              clientEmail: client?.email ?? null,
              versionCount: versions.length,
              latestVersionNumber: latest?.version_number ?? null,
              travelStartDate: latest?.travel_start_date ?? null,
              travelEndDate: latest?.travel_end_date ?? null,
              sharingPricePerPerson: latest?.sharing_price_per_person_usd ?? null,
            }
          })}
        />
      )}
    </PageShell>
  )
}
