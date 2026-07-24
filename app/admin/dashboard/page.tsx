import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, Inbox, TrendingUp, Plane } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'
import { PageShell, PageHeader } from '@/components/admin/ui/page'
import { Card, CardHeader, CardBody } from '@/components/admin/ui/card'
import { StatCard } from '@/components/admin/ui/card'
import { EmptyState } from '@/components/admin/ui/empty-state'
import { VARIANT_DOT, STATUS_VARIANT } from '@/lib/status-colors'
import { getPayables, getReceivablesSummary, getUsdToKesRate } from '@/lib/server/finance'

function formatUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function formatKES(n: number, rate: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n * rate)
}

const STAGES = [
  { key: 'new', label: 'New' },
  { key: 'working_on', label: 'Working On' },
  { key: 'open', label: 'Open' },
  { key: 'pre_booked', label: 'Pre-Booked' },
  { key: 'booked', label: 'Booked' },
  { key: 'completed', label: 'Completed' },
  { key: 'not_booked', label: 'Not Booked' },
]

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const threeDaysLater = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10)

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    { data: acceptancesThisMonth },
    { count: activeQuoteCount },
    { count: newEnquiriesCount },
    { data: requestsForStages },
    { data: upcomingDepartures },
    { data: expiringVersions },
    { data: recentAcceptances },
    { data: recentRequests },
    { data: allAcceptances6mo },
  ] = await Promise.all([
    admin.from('quote_acceptances')
      .select('quote_versions(total_selling_usd, total_cost_usd)')
      .gte('accepted_at', startOfMonth),
    // Count parent quotes (not versions) so this matches the Quotes list's
    // sent/viewed tab badges. quotes.status is synced to the most-advanced
    // version by syncQuoteStatus, and is the canonical grain for dashboards.
    admin.from('quotes')
      .select('id', { count: 'exact', head: true })
      .in('status', ['sent', 'viewed']),
    admin.from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('stage', 'new'),
    admin.from('requests').select('stage'),
    admin.from('departures')
      .select('id, start_date, booked_seats, max_seats, tours(title_en)')
      .gte('start_date', now.toISOString().slice(0, 10))
      .eq('is_active', true)
      .order('start_date')
      .limit(5),
    admin.from('quote_versions')
      .select('id, valid_until, status, title, quotes(id, quote_number)')
      .in('status', ['sent', 'viewed'])
      .not('valid_until', 'is', null)
      .gte('valid_until', now.toISOString().slice(0, 10))
      .lte('valid_until', threeDaysLater),
    admin.from('quote_acceptances')
      .select('id, client_name, accepted_at, quote_versions(title, total_selling_usd, quotes(id, quote_number))')
      .order('accepted_at', { ascending: false })
      .limit(5),
    admin.from('requests')
      .select('id, reference, created_at, clients(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(5),
    admin.from('quote_acceptances')
      .select('accepted_at, quote_versions(total_selling_usd)')
      .gte('accepted_at', sixMonthsAgo.toISOString()),
  ])

  // Finance tiles: AR / AP / margin / issued-vs-accepted.
  // Payables need group_33; degrade gracefully until it's applied.
  const [usdToKes, receivables, payables, { count: issuedThisMonth }] = await Promise.all([
    getUsdToKesRate(admin),
    getReceivablesSummary(admin),
    getPayables(admin).catch(() => null),
    admin.from('quote_versions')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', startOfMonth),
  ])

  // Next arrivals — merge fixed-departure travellers and private (request)
  // clients so the operator sees everyone landing soon, with date + time.
  const nowIso = now.toISOString()
  const [{ data: bookingArrivals }, { data: requestArrivals }] = await Promise.all([
    admin.from('booking_traveller_flights')
      .select('id, scheduled_at, airline, flight_number, airport, booking_travellers ( first_name, last_name, bookings ( departure_id, departures ( tours ( title_en ) ) ) )')
      .eq('direction', 'arrival')
      .gte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true })
      .limit(12),
    admin.from('request_flights')
      .select('id, scheduled_at, airline, flight_number, airport, traveller_name, requests ( id, reference, clients ( first_name, last_name ) )')
      .eq('direction', 'arrival')
      .gte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true })
      .limit(12),
  ])

  type ArrivalRow = { key: string; name: string; when: string; flight: string; airport: string | null; href: string; context: string }
  const arrivals: ArrivalRow[] = [
    ...((bookingArrivals ?? []) as any[]).map((f) => {
      const t = f.booking_travellers
      const dep = t?.bookings?.departure_id
      return {
        key: `b-${f.id}`,
        name: `${t?.first_name ?? ''} ${t?.last_name ?? ''}`.trim() || 'Traveller',
        when: f.scheduled_at as string,
        flight: [f.airline, f.flight_number].filter(Boolean).join(' '),
        airport: f.airport ?? null,
        href: dep ? `/admin/departures/${dep}/manifest` : '/admin/bookings',
        context: t?.bookings?.departures?.tours?.title_en ?? 'Booking',
      }
    }),
    ...((requestArrivals ?? []) as any[]).map((f) => {
      const c = f.requests?.clients
      return {
        key: `r-${f.id}`,
        name: f.traveller_name || `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || (f.requests?.reference ?? 'Client'),
        when: f.scheduled_at as string,
        flight: [f.airline, f.flight_number].filter(Boolean).join(' '),
        airport: f.airport ?? null,
        href: f.requests?.id ? `/admin/requests/${f.requests.id}` : '/admin/requests',
        context: f.requests?.reference ?? 'Private trip',
      }
    }),
  ]
    .sort((a, b) => a.when.localeCompare(b.when))
    .slice(0, 8)

  const revenueThisMonth = (acceptancesThisMonth ?? []).reduce((sum: number, a: any) => {
    return sum + Number(a.quote_versions?.total_selling_usd ?? 0)
  }, 0)
  const costThisMonth = (acceptancesThisMonth ?? []).reduce((sum: number, a) => {
    return sum + Number((a.quote_versions as { total_cost_usd?: number } | null)?.total_cost_usd ?? 0)
  }, 0)
  const marginThisMonth = revenueThisMonth > 0
    ? ((revenueThisMonth - costThisMonth) / revenueThisMonth) * 100
    : 0
  const acceptedThisMonth = (acceptancesThisMonth ?? []).length

  const stageCounts = STAGES.map(s => ({
    ...s,
    count: (requestsForStages ?? []).filter((r: any) => r.stage === s.key).length,
  }))

  // Build 6-month bar chart data
  const months: { label: string; key: string; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      total: 0,
    })
  }
  for (const a of (allAcceptances6mo ?? [])) {
    const key = (a as any).accepted_at?.slice(0, 7)
    const m = months.find(m => m.key === key)
    if (m) m.total += Number((a as any).quote_versions?.total_selling_usd ?? 0)
  }
  const chartMax = Math.max(...months.map(m => m.total), 1)
  const hasChartData = months.some(m => m.total > 0)

  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        actions={
          <ButtonLink href="/admin/requests/new" variant="primary" size="sm">
            + New Request
          </ButtonLink>
        }
      />

      <div className="space-y-6">
      {/* Workflow KPIs — the numbers a consultant acts on today */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="New Enquiries"
          value={String(newEnquiriesCount ?? 0)}
          sub="waiting in pipeline"
          emphasis={!!newEnquiriesCount}
          href="/admin/requests"
        />
        <StatCard
          label="Expiring Soon"
          value={String(expiringVersions?.length ?? 0)}
          sub="valid until within 3 days"
          tone={expiringVersions?.length ? 'negative' : 'default'}
          emphasis={!!expiringVersions?.length}
          href="/admin/quotes"
        />
        <StatCard
          label="Active Quotes"
          value={String(activeQuoteCount ?? 0)}
          sub="sent or viewed"
          href="/admin/quotes"
        />
        <StatCard
          label="Accepted Revenue"
          value={formatUSD(revenueThisMonth)}
          sub={`${formatKES(revenueThisMonth, usdToKes)} · this month`}
          tone="positive"
        />
      </div>

      {/* Finance KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Receivable (AR)"
          value={formatUSD(receivables.outstandingUsd)}
          sub={`invoiced ${formatUSD(receivables.invoicedUsd)} · received ${formatUSD(receivables.receivedUsd)}`}
          tone={receivables.outstandingUsd > 0 ? 'negative' : 'default'}
          href="/admin/finance/receipts"
        />
        <StatCard
          label="Payable (AP)"
          value={payables ? formatUSD(Math.max(payables.totalBalanceUsd, 0)) : '—'}
          sub={payables
            ? `owed ${formatUSD(payables.totalOwedUsd)} · paid ${formatUSD(payables.totalPaidUsd)}`
            : 'apply migration group_33'}
          tone={payables && payables.totalBalanceUsd > 0 ? 'negative' : 'default'}
          href="/admin/finance/payables"
        />
        <StatCard
          label="Gross Margin"
          value={`${marginThisMonth.toFixed(1)}%`}
          sub={`${formatUSD(revenueThisMonth - costThisMonth)} on accepted quotes`}
        />
        <StatCard
          label="Issued vs Accepted"
          value={`${issuedThisMonth ?? 0} / ${acceptedThisMonth}`}
          sub="sent vs accepted this month"
        />
      </div>

      {/* Next arrivals — who's landing soon (departures + private clients) */}
      <Card>
        <CardHeader
          title="Next Arrivals"
          action={
            <Link href="/admin/departures" className="text-xs font-medium text-brand-text hover:underline">
              Departures
            </Link>
          }
        />
        <CardBody className="py-2">
          {arrivals.length > 0 ? (
            <ul className="divide-y divide-border">
              {arrivals.map((a) => {
                const d = new Date(a.when)
                return (
                  <li key={a.key}>
                    <Link href={a.href}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors duration-150 hover:bg-muted">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.context}{a.flight ? ` · ${a.flight}` : ''}{a.airport ? ` · ${a.airport}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-brand-text">
                          {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={Plane}
              title="No upcoming arrivals"
              body="Add each traveller's arrival flight (date & time) on a departure manifest or a request — the next arrivals show here."
            />
          )}
        </CardBody>
      </Card>

      {/* Chart + Departures */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Accepted Quote Value — Last 6 Months" />
          <CardBody>
            {hasChartData ? (
              <div className="mt-1 flex h-36 items-end gap-2">
                {months.map((m, i) => (
                  <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                    {m.total > 0 && (
                      <p className="text-[10px] font-medium leading-none text-muted-foreground">
                        ${(m.total / 1000).toFixed(0)}k
                      </p>
                    )}
                    <div className="flex w-full items-end" style={{ height: '96px' }}>
                      <div
                        className="w-full rounded-t transition-[height] duration-200"
                        style={{
                          height: m.total > 0 ? `${Math.max((m.total / chartMax) * 96, 4)}px` : '2px',
                          backgroundColor: i === 5 ? 'var(--primary-strong)' : 'var(--olive-lt)',
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                icon={TrendingUp}
                title="No accepted quotes in the last 6 months"
                body="When a client accepts a quote, its value lands here so you can watch revenue build month over month."
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Upcoming Departures"
            action={
              <Link href="/admin/departures" className="text-xs font-medium text-brand-text hover:underline">
                View all
              </Link>
            }
          />
          <CardBody className="py-2">
            {upcomingDepartures && upcomingDepartures.length > 0 ? (
              <ul>
                {upcomingDepartures.map((d: any) => (
                  <li key={d.id}>
                    <Link
                      href={`/admin/departures/${d.id}`}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm transition-colors duration-150 hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{(d.tours as any)?.title_en ?? 'Departure'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(d.start_date).toLocaleDateString('en-GB')}</p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {d.booked_seats ?? 0}/{d.max_seats ?? '?'} seats
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={CalendarDays}
                title="No upcoming departures"
                body="Scheduled departures with open seats appear here."
                action={
                  <ButtonLink href="/admin/departures/new" size="sm">
                    Schedule a departure
                  </ButtonLink>
                }
              />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Pipeline + Alerts + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Requests Pipeline"
            action={
              <Link href="/admin/requests" className="text-xs font-medium text-brand-text hover:underline">
                View all
              </Link>
            }
          />
          <CardBody className="py-2">
            <ul className="text-sm">
              {stageCounts.map(s => (
                <li key={s.key}>
                  <Link
                    href={`/admin/requests?stage=${s.key}`}
                    className="-mx-2 flex items-center justify-between rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-muted"
                  >
                    <span className="flex items-center gap-2 text-foreground">
                      <span
                        aria-hidden
                        className={`h-1.5 w-1.5 rounded-full ${VARIANT_DOT[STATUS_VARIANT[s.key] ?? 'neutral']}`}
                      />
                      {s.label}
                    </span>
                    <span className={`font-medium tabular-nums ${s.count === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {s.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Alerts" />
          <CardBody className="py-2">
            {expiringVersions && expiringVersions.length > 0 ? (
              <ul className="space-y-3 py-1">
                {expiringVersions.map((v: any) => (
                  <li key={v.id}>
                    <Link href={`/admin/quotes/${(v.quotes as any)?.id}`} className="text-sm font-medium text-warning-foreground hover:underline">
                      {(v.quotes as any)?.quote_number ?? 'Quote'}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Expires {new Date(v.valid_until).toLocaleDateString('en-GB')} · {v.status}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={Inbox}
                title="Nothing needs attention"
                body="Quotes about to expire and other time-critical items surface here."
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent Activity" />
          <CardBody className="py-2">
            {((recentAcceptances?.length ?? 0) + (recentRequests?.length ?? 0)) === 0 ? (
              <EmptyState
                compact
                icon={Inbox}
                title="No activity yet"
                body="New requests and quote acceptances appear here as they happen."
              />
            ) : (
              <ul className="space-y-3 py-1">
                {(recentAcceptances ?? []).map((a: any) => (
                  <li key={a.id} className="flex gap-2.5">
                    <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${VARIANT_DOT.success}`} />
                    <div className="min-w-0 text-sm">
                      <p className="truncate text-foreground">
                        <Link href={`/admin/quotes/${(a.quote_versions as any)?.quotes?.id}`} className="font-medium hover:underline">
                          {(a.quote_versions as any)?.quotes?.quote_number}
                        </Link>
                        {' '}accepted by {a.client_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatUSD(Number((a.quote_versions as any)?.total_selling_usd ?? 0))} · {new Date(a.accepted_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </li>
                ))}
                {(recentRequests ?? []).map((r: any) => (
                  <li key={r.id} className="flex gap-2.5">
                    <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${VARIANT_DOT.info}`} />
                    <div className="min-w-0 text-sm">
                      <p className="truncate text-foreground">
                        New request —{' '}
                        <Link href={`/admin/requests/${r.id}`} className="font-medium hover:underline">
                          {(r.clients as any)?.first_name} {(r.clients as any)?.last_name}
                        </Link>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.reference} · {new Date(r.created_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
      </div>
    </PageShell>
  )
}
