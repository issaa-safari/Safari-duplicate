import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const KES_RATE = 129

function formatUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function formatKES(n: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n * KES_RATE)
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
      .select('quote_versions(total_selling_usd)')
      .gte('accepted_at', startOfMonth),
    admin.from('quote_versions')
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

  const revenueThisMonth = (acceptancesThisMonth ?? []).reduce((sum: number, a: any) => {
    return sum + Number(a.quote_versions?.total_selling_usd ?? 0)
  }, 0)

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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        <Link href="/admin/requests/new"
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: '#7A9A4A' }}>
          + New Request
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Accepted Revenue This Month"
          value={formatUSD(revenueThisMonth)}
          sub={formatKES(revenueThisMonth)}
        />
        <KpiCard
          label="Active Quotes"
          value={String(activeQuoteCount ?? 0)}
          sub="sent or being viewed"
        />
        <KpiCard
          label="New Enquiries"
          value={String(newEnquiriesCount ?? 0)}
          sub="waiting in pipeline"
        />
        <KpiCard
          label="Expiring Soon"
          value={String(expiringVersions?.length ?? 0)}
          sub="valid until within 3 days"
          urgent={!!(expiringVersions?.length)}
        />
      </div>

      {/* Chart + Departures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
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
                        backgroundColor: i === 5 ? '#7A9A4A' : '#B8CFA0',
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

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Upcoming Departures</h2>
            <Link href="/admin/departures" className="text-xs text-[#7A9A4A] hover:underline">View all</Link>
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
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Requests Pipeline</h2>
            <Link href="/admin/requests" className="text-xs text-[#7A9A4A] hover:underline">View all</Link>
          </div>
          <ul className="space-y-2 text-sm">
            {stageCounts.map(s => (
              <li key={s.key} className="flex justify-between text-gray-700">
                <Link href={`/admin/requests?stage=${s.key}`} className="hover:text-[#7A9A4A]">{s.label}</Link>
                <span className="font-medium tabular-nums">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
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

        <div className="bg-white rounded-lg border border-gray-200 p-5">
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
    <div className={`bg-white rounded-lg border p-5 ${urgent ? 'border-amber-300' : 'border-gray-200'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${urgent ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}
