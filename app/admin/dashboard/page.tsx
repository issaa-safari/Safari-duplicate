import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminProfile } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button'
import { getPayables, getReceivablesSummary, getUsdToKesRate } from '@/lib/server/finance'

function formatUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function formatKES(n: number, rate: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n * rate)
}

const STAGES = [
  { key: 'new', label: 'New', color: 'var(--status-new)' },
  { key: 'working_on', label: 'Working On', color: 'var(--status-working)' },
  { key: 'open', label: 'Open', color: 'var(--status-open)' },
  { key: 'pre_booked', label: 'Pre-Booked', color: 'var(--status-prebooked)' },
  { key: 'booked', label: 'Booked', color: 'var(--status-booked)' },
  { key: 'completed', label: 'Completed', color: 'var(--status-completed)' },
  { key: 'not_booked', label: 'Not Booked', color: 'var(--status-notbooked)' },
]

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const adminProfile = await getAdminProfile(admin, user.email)
  const firstName = adminProfile?.full_name?.split(/\s+/)[0] ?? 'there'
  const now = new Date()
  const nairobiHour = Number(new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric', hourCycle: 'h23', timeZone: 'Africa/Nairobi',
  }).format(now))
  const greeting = nairobiHour < 12 ? 'Good morning' : nairobiHour < 17 ? 'Good afternoon' : 'Good evening'
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const threeDaysLater = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10)

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    { data: acceptancesThisMonth },
    { data: activeQuoteVersions },
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
    admin.from('quote_versions')
      .select('total_selling_usd')
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
      .select('accepted_at, quote_versions(total_selling_usd, quotes(requests(created_at)))')
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
  const activeQuoteCount = (activeQuoteVersions ?? []).length
  const pipelineValue = (activeQuoteVersions ?? []).reduce((sum: number, v: { total_selling_usd?: number | null }) => {
    return sum + Number(v.total_selling_usd ?? 0)
  }, 0)

  // Headline KPIs (Lovable dashboard design), computed from real data
  const stageTotals = (requestsForStages ?? []).reduce((acc: Record<string, number>, r: { stage: string }) => {
    acc[r.stage] = (acc[r.stage] ?? 0) + 1
    return acc
  }, {})
  const activeRequestCount = ['new', 'working_on', 'open', 'pre_booked', 'booked']
    .reduce((sum, key) => sum + (stageTotals[key] ?? 0), 0)
  const decidedTotal = (requestsForStages ?? []).filter((r: { stage: string }) => r.stage !== 'archived').length
  const wonCount = (stageTotals['booked'] ?? 0) + (stageTotals['completed'] ?? 0)
  const conversionRate = decidedTotal > 0 ? (wonCount / decidedTotal) * 100 : 0
  const avgQuoteValue = activeQuoteCount > 0 ? pipelineValue / activeQuoteCount : 0
  const bookingDurations = (allAcceptances6mo ?? [])
    .map((a: any) => {
      const created = a.quote_versions?.quotes?.requests?.created_at
      if (!created || !a.accepted_at) return null
      return (new Date(a.accepted_at).getTime() - new Date(created).getTime()) / 86400000
    })
    .filter((d: number | null): d is number => d !== null && d >= 0)
  const daysToBooking = bookingDurations.length > 0
    ? bookingDurations.reduce((sum: number, d: number) => sum + d, 0) / bookingDurations.length
    : null

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
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-brand-ink md:text-4xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {newEnquiriesCount ?? 0} new request{(newEnquiriesCount ?? 0) === 1 ? '' : 's'} · {formatUSD(pipelineValue)} in active pipeline
          </p>
        </div>
        <ButtonLink href="/admin/requests/new" size="sm">+ New Request</ButtonLink>
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Requests"
          value={String(activeRequestCount)}
          sub="new through booked stages"
        />
        <KpiCard
          label="Conversion Rate"
          value={`${conversionRate.toFixed(0)}%`}
          sub={`${wonCount} of ${decidedTotal} requests booked`}
        />
        <KpiCard
          label="Avg. Quote Value"
          value={formatUSD(avgQuoteValue)}
          sub={`across ${activeQuoteCount} active quote${activeQuoteCount === 1 ? '' : 's'}`}
        />
        <KpiCard
          label="Days to Booking"
          value={daysToBooking !== null ? daysToBooking.toFixed(1) : '—'}
          sub="avg. request → acceptance, 6 mo"
        />
      </div>

      {/* Finance KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Revenue This Month"
          value={formatUSD(revenueThisMonth)}
          sub={`${formatKES(revenueThisMonth, usdToKes)} · ${marginThisMonth.toFixed(1)}% margin`}
        />
        <Link href="/admin/finance/receipts">
          <KpiCard
            label="Receivable (AR)"
            value={formatUSD(receivables.outstandingUsd)}
            sub={`invoiced ${formatUSD(receivables.invoicedUsd)} · received ${formatUSD(receivables.receivedUsd)}`}
            urgent={receivables.outstandingUsd > 0}
          />
        </Link>
        <Link href="/admin/finance/payables">
          <KpiCard
            label="Payable (AP)"
            value={payables ? formatUSD(Math.max(payables.totalBalanceUsd, 0)) : '—'}
            sub={payables
              ? `owed ${formatUSD(payables.totalOwedUsd)} · paid ${formatUSD(payables.totalPaidUsd)}`
              : 'apply migration group_33'}
            urgent={!!payables && payables.totalBalanceUsd > 0}
          />
        </Link>
        <KpiCard
          label="Quotes Issued vs Accepted"
          value={`${issuedThisMonth ?? 0} / ${acceptedThisMonth}`}
          sub="sent vs accepted this month"
        />
      </div>

      {/* Chart + Departures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Accepted Quote Value — Last 6 Months</h2>
          {hasChartData ? (
            <div className="flex items-end gap-2 h-36 mt-2">
              {months.map((m, i) => (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                  {m.total > 0 && (
                    <p className="text-[10px] text-gray-500 font-medium leading-none">
                      ${(m.total / 1000).toFixed(0)}k
                    </p>
                  )}
                  <div className="w-full flex items-end" style={{ height: '96px' }}>
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: m.total > 0 ? `${Math.max((m.total / chartMax) * 96, 4)}px` : '2px',
                        backgroundColor: i === 5 ? 'var(--olive)' : '#B8CFA0',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">{m.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-10 text-center">Fills in as quotes are accepted.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Upcoming Departures</h2>
            <Link href="/admin/departures" className="text-xs text-[var(--olive)] hover:underline">View all</Link>
          </div>
          {upcomingDepartures && upcomingDepartures.length > 0 ? (
            <ul className="space-y-3">
              {upcomingDepartures.map((d: any) => (
                <Link key={d.id} href={`/admin/departures/${d.id}`} className="flex items-center justify-between text-sm hover:bg-gray-50 -mx-2 px-2 py-1 rounded">
                  <div>
                    <p className="text-gray-800 font-medium">{(d.tours as any)?.title_en ?? 'Departure'}</p>
                    <p className="text-xs text-gray-400">{new Date(d.start_date).toLocaleDateString('en-GB')}</p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{d.booked_seats ?? 0}/{d.max_seats ?? '?'} seats</span>
                </Link>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 py-10 text-center">No upcoming departures yet.</p>
          )}
        </div>
      </div>

      {/* Pipeline + Alerts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Requests Pipeline</h2>
            <Link href="/admin/requests" className="text-xs text-[var(--olive)] hover:underline">Open board ↗</Link>
          </div>
          <ul className="space-y-2 text-sm">
            {stageCounts.map(s => (
              <li key={s.key} className="flex items-center justify-between text-gray-700">
                <Link href={`/admin/requests?stage=${s.key}`} className="flex items-center gap-2 hover:text-[var(--olive)]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </Link>
                <span className="font-medium tabular-nums">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Alerts</h2>
          {expiringVersions && expiringVersions.length > 0 ? (
            <ul className="space-y-3">
              {expiringVersions.map((v: any) => (
                <li key={v.id}>
                  <Link href={`/admin/quotes/${(v.quotes as any)?.id}`} className="text-sm text-amber-700 hover:underline font-medium">
                    {(v.quotes as any)?.quote_number ?? 'Quote'}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Expires {new Date(v.valid_until).toLocaleDateString('en-GB')} · {v.status}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 py-10 text-center">Nothing needs attention right now.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h2>
          {((recentAcceptances?.length ?? 0) + (recentRequests?.length ?? 0)) === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">Activity appears here as things happen.</p>
          ) : (
            <ul className="space-y-3">
              {(recentAcceptances ?? []).map((a: any) => (
                <li key={a.id} className="flex gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
                  <div className="text-sm min-w-0">
                    <p className="text-gray-700 truncate">
                      <Link href={`/admin/quotes/${(a.quote_versions as any)?.quotes?.id}`} className="hover:underline font-medium">
                        {(a.quote_versions as any)?.quotes?.quote_number}
                      </Link>
                      {' '}accepted by {a.client_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatUSD(Number((a.quote_versions as any)?.total_selling_usd ?? 0))} · {new Date(a.accepted_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </li>
              ))}
              {(recentRequests ?? []).map((r: any) => (
                <li key={r.id} className="flex gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <div className="text-sm min-w-0">
                    <p className="text-gray-700 truncate">
                      New request —{' '}
                      <Link href={`/admin/requests/${r.id}`} className="hover:underline font-medium">
                        {(r.clients as any)?.first_name} {(r.clients as any)?.last_name}
                      </Link>
                    </p>
                    <p className="text-xs text-gray-400">
                      {r.reference} · {new Date(r.created_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, urgent }: { label: string; value: string; sub: string; urgent?: boolean }) {
  return (
    <div className={`rounded-xl border bg-surface p-5 shadow-sm ${urgent ? 'border-amber-300' : 'border-border'}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display mt-2 text-3xl ${urgent ? 'text-amber-700' : 'text-brand-ink'}`}>{value}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}
