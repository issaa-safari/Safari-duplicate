import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ButtonLink, Button } from '@/components/ui/button'
import StatusBadge from '@/components/admin/status-badge'

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

  const counts = (allQuotes ?? []).reduce((acc: Record<string, number>, q: any) => {
    acc[q.status] = (acc[q.status] ?? 0) + 1
    return acc
  }, {})

  const activeStatus = status ?? 'draft'

  // Separate queries to avoid PostgREST FK ambiguity and status-column collision
  const { data: quotes } = await admin
    .from('quotes')
    .select('id, quote_number, status, mode, created_at, client_id')
    .eq('status', activeStatus)
    .order('created_at', { ascending: false })

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

  const STATUSES = ['draft', 'ready', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'cancelled']

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Quotes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Build and send pricing proposals to clients</p>
        </div>
        <ButtonLink href="/admin/quotes/new" size="sm">+ New Quote</ButtonLink>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/quotes?status=${s}`}
            className={'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ' +
              (activeStatus === s
                ? 'border-[var(--olive)] text-[var(--olive)]'
                : 'border-transparent text-gray-500 hover:text-gray-700')}>
            <span className="capitalize">{s}</span>
            {counts[s] ? (
              <span className="ml-1.5 text-xs text-muted-foreground">({counts[s]})</span>
            ) : null}
          </Link>
        ))}
      </div>

      {/* Quote list */}
      {!quotes || quotes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <p className="text-sm text-gray-500 mb-4">No {activeStatus} quotes.</p>
          {activeStatus === 'draft' && (
            <Link
              href="/admin/quotes/new"
              className="text-sm font-medium text-[var(--olive)] hover:underline">
              Create your first quote
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((q: any) => {
            const client = clientMap[q.client_id] ?? null
            const clientName = client
              ? `${client.first_name} ${client.last_name}`.trim()
              : '—'
            const versions: any[] = versionsByQuote[q.id] ?? []
            const latest = versions[0] // already ordered desc by version_number

            return (
              <Link
                key={q.id}
                href={`/admin/quotes/${q.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-[var(--olive)] hover:shadow-sm transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{q.quote_number}</span>
                      <StatusBadge status={q.status} />
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">
                        {q.mode === 'fixed_departure' ? 'Fixed Departure' : 'Custom Safari'}
                      </span>
                      {versions.length > 1 && (
                        <span className="text-xs text-muted-foreground">v{latest?.version_number}</span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900">{clientName}</p>
                    {client?.email && (
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                    )}
                    {latest?.travel_start_date && (
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(latest.travel_start_date).toLocaleDateString('en-GB')}
                        {latest.travel_end_date && (
                          <> → {new Date(latest.travel_end_date).toLocaleDateString('en-GB')}</>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    {latest?.sharing_price_per_person_usd ? (
                      <p className="text-base font-semibold text-gray-900">
                        ${Number(latest.sharing_price_per_person_usd).toLocaleString()}
                        <span className="text-xs font-normal text-muted-foreground"> /pp</span>
                      </p>
                    ) : null}
                    <p className="mt-1">{new Date(q.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
