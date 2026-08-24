import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Inbox } from 'lucide-react'
import StatusBadge from '@/components/admin/status-badge'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/admin/ui/empty-state'
import { VARIANT_CLASSES, VARIANT_DOT, STAGE_LABELS } from '@/lib/status-colors'
import { countByGroup, REQUEST_GROUPS, resolveStatusFilter } from '@/lib/status-groups'

// Four buckets rather than one tab per stage. The exact stage still shows as
// the badge on every card, and a link naming one (the dashboard
// screens do) still narrows to it — see lib/status-groups.ts.
const GROUP_VARIANT: Record<string, string> = {
  all: 'neutral', active: 'info', booked: 'success', closed: 'muted',
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const params = await searchParams
  const filter = resolveStatusFilter(REQUEST_GROUPS, params.stage)
  const activeGroup = REQUEST_GROUPS.find(g => g.key === filter.groupKey) ?? REQUEST_GROUPS[0]

  const { data: allRequests } = await supabase.from('requests').select('stage')
  const stageCounts = countByGroup(REQUEST_GROUPS, allRequests ?? [])

  const query = supabase
    .from('requests')
    .select('*, clients (first_name, last_name, email), tours (title_en)')
    .order('created_at', { ascending: false })

  const { data: requests } = await (filter.statuses ? query.in('stage', filter.statuses) : query)

  const heading = filter.exactStatus
    ? `${STAGE_LABELS[filter.exactStatus] ?? filter.exactStatus} Requests`
    : activeGroup.key === 'all' ? 'All Requests' : `${activeGroup.label} Requests`

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      {/* Stage rail (desktop) */}
      <nav
        aria-label="Request stages"
        className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border bg-surface p-3 md:flex"
      >
        <ButtonLink href="/admin/requests/new" variant="primary" size="sm" className="mb-3 w-full">
          + New Request
        </ButtonLink>
        {REQUEST_GROUPS.map((group) => {
          const variant = (GROUP_VARIANT[group.key] ?? 'neutral') as keyof typeof VARIANT_CLASSES
          const active = activeGroup.key === group.key
          return (
            <Link
              key={group.key}
              href={"/admin/requests?stage=" + group.key}
              aria-current={active ? 'page' : undefined}
              className={"flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors duration-150 " +
                (active
                  ? `font-medium ${VARIANT_CLASSES[variant]}`
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${VARIANT_DOT[variant]}`} />
                {group.label}
              </span>
              <span className={"rounded-full px-2 py-0.5 text-xs font-medium tabular-nums " +
                (active ? 'bg-surface/60' : 'bg-muted text-muted-foreground')}>
                {stageCounts[group.key] ?? 0}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Stage chips (mobile) */}
      <nav
        aria-label="Request stages"
        className="flex gap-1.5 overflow-x-auto border-b border-border bg-surface px-4 py-2.5 md:hidden"
      >
        {REQUEST_GROUPS.map((group) => {
          const variant = (GROUP_VARIANT[group.key] ?? 'neutral') as keyof typeof VARIANT_CLASSES
          const active = activeGroup.key === group.key
          return (
            <Link
              key={group.key}
              href={"/admin/requests?stage=" + group.key}
              aria-current={active ? 'page' : undefined}
              className={"flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 " +
                (active ? VARIANT_CLASSES[variant] : 'bg-muted text-muted-foreground')}
            >
              {group.label}
              <span className="tabular-nums opacity-70">{stageCounts[group.key] ?? 0}</span>
            </Link>
          )
        })}
      </nav>

      <div className="flex-1 px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-foreground">{heading}</h1>
          <ButtonLink href="/admin/requests/new" variant="primary" size="sm" className="md:hidden">
            + New
          </ButtonLink>
        </div>
        {/* Arrived from a dashboard link naming one stage: say so,
            and offer the way back out to the whole bucket. */}
        {filter.exactStatus && (
          <p className="mb-4 text-sm text-muted-foreground">
            Showing only <span className="font-medium text-foreground">
              {STAGE_LABELS[filter.exactStatus] ?? filter.exactStatus}
            </span>.{' '}
            <Link href={"/admin/requests?stage=" + activeGroup.key} className="text-brand-text hover:underline">
              Show all {activeGroup.label.toLowerCase()}
            </Link>
          </p>
        )}

        {!requests || requests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={`No ${heading.replace(/ Requests$/, '').toLowerCase()} requests`}
            body={activeGroup.blurb ?? 'Requests move through the pipeline as you work them — new enquiries land here from the website, WhatsApp, or manual entry.'}
            action={
              <ButtonLink href="/admin/requests/new" variant="primary" size="sm">
                + Add First Request
              </ButtonLink>
            }
          />
        ) : (
          <ul className="space-y-3">
            {requests.map((req: any) => {
              const client = req.clients
              const tour = req.tours
              const clientName = client
                ? (client.first_name + ' ' + client.last_name).trim()
                : 'Unknown'
              return (
                <li key={req.id}>
                  <Link
                    href={"/admin/requests/" + req.id}
                    className="block rounded-xl border border-border bg-surface p-4 shadow-sm transition-all duration-150 hover:border-ring/50 hover:shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{req.reference}</span>
                          {req.priority && (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                              Priority
                            </span>
                          )}
                          {req.stage && <StatusBadge status={req.stage} />}
                        </div>
                        <p className="font-medium text-foreground">{clientName}</p>
                        {tour && <p className="mt-0.5 text-sm text-muted-foreground">{tour.title_en}</p>}
                        {req.client_question && (
                          <p className="mt-1 truncate text-sm text-muted-foreground">{req.client_question}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <p>{req.travelers_adults} adults</p>
                        <p className="mt-1">{new Date(req.created_at).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
