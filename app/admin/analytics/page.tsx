import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function pct(a: number, b: number) {
  if (b === 0) return '—'
  return `${Math.round((a / b) * 100)}%`
}

const CATEGORY_LABELS: Record<string, string> = {
  accommodation: 'Accommodation',
  activities: 'Activities',
  park_fees: 'Park Fees',
  transport: 'Transport',
  staff: 'Staff',
  meals: 'Meals',
  flights: 'Flights',
  other: 'Other',
}

const STATUS_ORDER = ['draft', 'ready', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'cancelled']
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-300',
  ready: 'bg-blue-400',
  sent: 'bg-purple-400',
  viewed: 'bg-indigo-400',
  accepted: 'bg-green-500',
  declined: 'bg-red-400',
  expired: 'bg-amber-400',
  cancelled: 'bg-gray-200',
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const now = new Date()

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    { data: allVersions },
    { data: recentVersions },
    { data: acceptedVersions },
    { data: priceLinesByCategory },
    { data: allRequests },
    { data: acceptances },
    { data: allBookings },
  ] = await Promise.all([
    admin.from('quote_versions').select('id, status, total_selling_usd, total_cost_usd, created_at, sent_at'),
    admin.from('quote_versions')
      .select('id, status, created_at')
      .gte('created_at', sixMonthsAgo.toISOString()),
    admin.from('quote_versions')
      .select('id, total_selling_usd, total_cost_usd')
      .eq('status', 'accepted'),
    admin.from('quote_price_lines')
      .select('cost_category, total_selling_usd, total_cost_usd, quote_version_id'),
    admin.from('requests').select('stage, created_at'),
    admin.from('quote_acceptances').select('accepted_at, quote_version_id'),
    admin.from('bookings')
      .select('status, total_price_usd, number_of_travellers, created_at, departures(tours(title_en))'),
  ])

  // --- Website bookings (direct online bookings, separate from the quote flow) ---
  const bookings = (allBookings ?? []).filter((b: any) => b.status !== 'cancelled')
  const totalBookings = bookings.length
  const bookingRevenue = bookings.reduce((s: number, b: any) => s + Number(b.total_price_usd ?? 0), 0)
  const bookingTravellers = bookings.reduce((s: number, b: any) => s + Number(b.number_of_travellers ?? 0), 0)

  // --- Top-performing tours by website bookings (count + revenue) ---
  const tourStats: Record<string, { count: number; revenue: number }> = {}
  for (const b of bookings as any[]) {
    const title = b.departures?.tours?.title_en || 'Unknown tour'
    if (!tourStats[title]) tourStats[title] = { count: 0, revenue: 0 }
    tourStats[title].count++
    tourStats[title].revenue += Number(b.total_price_usd ?? 0)
  }
  const topTours = Object.entries(tourStats)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 6)
  const maxTourRevenue = Math.max(...topTours.map(([, s]) => s.revenue), 1)

  // --- Status distribution ---
  const statusCounts: Record<string, number> = {}
  for (const v of (allVersions ?? [])) {
    statusCounts[v.status] = (statusCounts[v.status] ?? 0) + 1
  }
  const totalVersions = (allVersions ?? []).length
  const acceptedCount = statusCounts['accepted'] ?? 0
  const declinedCount = statusCounts['declined'] ?? 0
  const decidedCount = acceptedCount + declinedCount
  const conversionRate = decidedCount > 0 ? acceptedCount / decidedCount : null

  // --- Monthly quote volume chart (last 6 months) ---
  const months: { label: string; key: string; created: number; accepted: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      created: 0,
      accepted: 0,
    })
  }
  for (const v of (recentVersions ?? [])) {
    const key = v.created_at?.slice(0, 7)
    const m = months.find(m => m.key === key)
    if (m) m.created++
  }
  for (const a of (acceptances ?? [])) {
    const key = a.accepted_at?.slice(0, 7)
    const m = months.find(m => m.key === key)
    if (m) m.accepted++
  }
  const chartMaxCreated = Math.max(...months.map(m => m.created), 1)

  // --- Revenue & margin from accepted quotes ---
  const totalAcceptedRevenue = (acceptedVersions ?? []).reduce((s, v) => s + Number(v.total_selling_usd ?? 0), 0)
  const totalAcceptedCost = (acceptedVersions ?? []).reduce((s, v) => s + Number(v.total_cost_usd ?? 0), 0)
  const avgQuoteValue = acceptedCount > 0 ? totalAcceptedRevenue / acceptedCount : 0
  const overallMargin = totalAcceptedRevenue > 0
    ? ((totalAcceptedRevenue - totalAcceptedCost) / totalAcceptedRevenue) * 100 : 0

  // --- Category breakdown from price lines on accepted versions ---
  const acceptedVersionIds = new Set((acceptedVersions ?? []).map(v => v.id))
  const catRevenue: Record<string, number> = {}
  const catCost: Record<string, number> = {}
  for (const line of (priceLinesByCategory ?? [])) {
    if (!acceptedVersionIds.has(line.quote_version_id)) continue
    catRevenue[line.cost_category] = (catRevenue[line.cost_category] ?? 0) + Number(line.total_selling_usd ?? 0)
    catCost[line.cost_category] = (catCost[line.cost_category] ?? 0) + Number(line.total_cost_usd ?? 0)
  }
  const categories = Object.entries(catRevenue)
    .sort((a, b) => b[1] - a[1])
  const maxCatRevenue = Math.max(...categories.map(([, v]) => v), 1)

  // --- Request pipeline ---
  const requestStages: Record<string, number> = {}
  for (const r of (allRequests ?? [])) {
    requestStages[r.stage] = (requestStages[r.stage] ?? 0) + 1
  }
  const totalRequests = (allRequests ?? []).length

  // --- Average time from version created → accepted ---
  const acceptedVersionMap = new Map((acceptedVersions ?? []).map(v => [v.id, v]))
  const allVersionMap = new Map((allVersions ?? []).map(v => [v.id, v]))
  const timesToAccept: number[] = []
  for (const a of (acceptances ?? [])) {
    const v = allVersionMap.get(a.quote_version_id)
    if (v?.created_at && a.accepted_at) {
      const days = (new Date(a.accepted_at).getTime() - new Date(v.created_at).getTime()) / 86400000
      if (days >= 0) timesToAccept.push(days)
    }
  }
  const avgDaysToAccept = timesToAccept.length > 0
    ? timesToAccept.reduce((s, d) => s + d, 0) / timesToAccept.length : null

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Quote pipeline performance and revenue metrics</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Quotes" value={fmt(totalVersions)} sub="all versions" />
        <KpiCard
          label="Conversion Rate"
          value={conversionRate !== null ? `${Math.round(conversionRate * 100)}%` : '—'}
          sub={`${acceptedCount} accepted / ${decidedCount} decided`}
          highlight={conversionRate !== null && conversionRate >= 0.5}
        />
        <KpiCard
          label="Avg Quote Value"
          value={avgQuoteValue > 0 ? `$${fmt(avgQuoteValue)}` : '—'}
          sub="accepted quotes"
        />
        <KpiCard
          label="Avg Days to Accept"
          value={avgDaysToAccept !== null ? `${avgDaysToAccept.toFixed(1)}` : '—'}
          sub="from quote created"
        />
      </div>

      {/* Monthly volume + status funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly volume chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Quote Volume — Last 6 Months</h2>
          <p className="text-xs text-muted-foreground mb-4">Versions created vs accepted</p>
          {months.some(m => m.created > 0) ? (
            <div className="flex items-end gap-2 h-36">
              {months.map((m, i) => (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                  {m.created > 0 && (
                    <p className="text-[10px] text-muted-foreground leading-none">{m.created}</p>
                  )}
                  <div className="w-full flex items-end gap-0.5" style={{ height: '96px' }}>
                    <div
                      className="flex-1 rounded-t"
                      style={{
                        height: m.created > 0 ? `${Math.max((m.created / chartMaxCreated) * 96, 4)}px` : '2px',
                        backgroundColor: i === 5 ? '#B8CFA0' : '#E2EDD4',
                      }}
                    />
                    {m.accepted > 0 && (
                      <div
                        className="flex-1 rounded-t"
                        style={{
                          height: `${Math.max((m.accepted / chartMaxCreated) * 96, 4)}px`,
                          backgroundColor: i === 5 ? 'var(--olive)' : '#9DB870',
                        }}
                      />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">No quotes yet in this period.</p>
          )}
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#B8CFA0' }} />
              Created
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-olive" />
              Accepted
            </div>
          </div>
        </div>

        {/* Status funnel */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Quote Status Breakdown</h2>
          {totalVersions === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No quotes yet.</p>
          ) : (
            <div className="space-y-2">
              {STATUS_ORDER.filter(s => (statusCounts[s] ?? 0) > 0).map(status => {
                const count = statusCounts[status] ?? 0
                const barPct = Math.round((count / totalVersions) * 100)
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="w-16 text-xs text-gray-500 capitalize text-right shrink-0">{status}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-300'}`}
                        style={{ width: `${Math.max(barPct, 2)}%` }}
                      />
                    </div>
                    <span className="w-14 text-xs text-gray-600 font-medium tabular-nums">
                      {count} <span className="text-muted-foreground">({barPct}%)</span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* P&L summary + category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gross P&L */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Gross P&amp;L — Accepted Quotes</h2>
          {acceptedCount === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No accepted quotes yet.</p>
          ) : (
            <div className="space-y-3">
              <PnlRow label="Revenue (selling price)" value={totalAcceptedRevenue} bold />
              <PnlRow label="Cost of Sales" value={totalAcceptedCost} negative />
              <div className="border-t border-gray-100 pt-3">
                <PnlRow
                  label="Gross Profit"
                  value={totalAcceptedRevenue - totalAcceptedCost}
                  bold
                  highlight
                />
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Gross Margin</span>
                <span className={`font-semibold ${overallMargin >= 20 ? 'text-green-700' : overallMargin >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                  {overallMargin.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t border-gray-50">
                Based on {acceptedCount} accepted quote{acceptedCount !== 1 ? 's' : ''}.
                Revenue = selling price; Cost = sum of price line costs.
              </p>
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Revenue by Category</h2>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No price line data yet.</p>
          ) : (
            <div className="space-y-3">
              {categories.map(([cat, rev]) => {
                const cost = catCost[cat] ?? 0
                const margin = rev > 0 ? ((rev - cost) / rev) * 100 : 0
                const barPct = Math.round((rev / maxCatRevenue) * 100)
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className="font-medium text-gray-700">{CATEGORY_LABELS[cat] ?? cat}</span>
                      <span className="tabular-nums">
                        ${fmt(rev)}
                        <span className={`ml-2 ${margin >= 20 ? 'text-green-600' : margin >= 10 ? 'text-amber-500' : 'text-red-500'}`}>
                          {margin.toFixed(0)}%
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(barPct, 1)}%`, backgroundColor: 'var(--olive)' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Website bookings + top tours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Website bookings summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Website Bookings</h2>
            <Link href="/admin/bookings" className="text-xs text-[var(--olive)] hover:underline">View all</Link>
          </div>
          {totalBookings === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No website bookings yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-gray-900">{fmt(totalBookings)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Bookings</p>
              </div>
              <div>
                <p className="text-2xl font-semibold" style={{ color: 'var(--olive)' }}>${fmt(bookingRevenue)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Revenue</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{fmt(bookingTravellers)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Travellers</p>
              </div>
            </div>
          )}
        </div>

        {/* Top performing tours */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Tours — by Booking Revenue</h2>
          {topTours.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No bookings to rank yet.</p>
          ) : (
            <div className="space-y-3">
              {topTours.map(([title, s]) => {
                const barPct = Math.round((s.revenue / maxTourRevenue) * 100)
                return (
                  <div key={title}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className="font-medium text-gray-700 truncate pr-2">{title}</span>
                      <span className="tabular-nums shrink-0">
                        ${fmt(s.revenue)}
                        <span className="text-muted-foreground ml-2">{s.count} booking{s.count !== 1 ? 's' : ''}</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(barPct, 1)}%`, backgroundColor: 'var(--olive)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Request pipeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Request Pipeline</h2>
          <Link href="/admin/requests" className="text-xs text-[var(--olive)] hover:underline">View all</Link>
        </div>
        {totalRequests === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No requests yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {['new', 'working_on', 'open', 'pre_booked', 'booked', 'completed', 'not_booked'].map(stage => {
              const count = requestStages[stage] ?? 0
              const p = Math.round((count / totalRequests) * 100)
              return (
                <Link key={stage} href={`/admin/requests?stage=${stage}`}
                  className="text-center p-3 rounded-lg bg-gray-50 hover:bg-[var(--olive)]/5 hover:border-[var(--olive)]/20 border border-transparent transition">
                  <p className="text-2xl font-semibold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500 capitalize mt-0.5">{stage.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">{p}%</p>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, highlight }: {
  label: string; value: string; sub: string; highlight?: boolean
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${highlight ? 'text-green-700' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  )
}

function PnlRow({ label, value, bold, negative, highlight }: {
  label: string; value: number; bold?: boolean; negative?: boolean; highlight?: boolean
}) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span className={highlight ? (value >= 0 ? 'text-green-700' : 'text-red-600') : 'text-gray-900'}>
        {negative ? '−' : ''} ${fmt(Math.abs(value))}
      </span>
    </div>
  )
}
