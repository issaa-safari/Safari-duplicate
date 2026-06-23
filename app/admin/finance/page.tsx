import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ReceivablesTable from './receivables-table'
import Link from 'next/link'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmt2(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { tab } = await searchParams
  const activeTab = tab === 'pnl' ? 'pnl' : 'receivables'

  const admin = createAdminClient()

  const [
    { data: acceptances },
    { data: payments },
    { data: acceptedVersions },
    { data: priceLines },
  ] = await Promise.all([
    admin.from('quote_acceptances')
      .select('id, client_name, accepted_at, quote_version_id, quote_id, quote_versions(title, total_selling_usd, total_cost_usd), quotes(id, quote_number)')
      .order('accepted_at', { ascending: false }),
    admin.from('quote_payments')
      .select('id, quote_id, amount_usd, payment_type, method, reference, received_at'),
    admin.from('quote_versions')
      .select('id, total_selling_usd, total_cost_usd, created_at')
      .eq('status', 'accepted'),
    admin.from('quote_price_lines')
      .select('cost_category, total_selling_usd, total_cost_usd, quote_version_id'),
  ])

  // --- Receivables ---
  const paymentsByQuote: Record<string, any[]> = {}
  for (const p of (payments ?? [])) {
    if (!paymentsByQuote[p.quote_id]) paymentsByQuote[p.quote_id] = []
    paymentsByQuote[p.quote_id]!.push(p)
  }
  const rows = (acceptances ?? []).map((a: any) => {
    const quoteId = (a.quotes as any)?.id ?? a.quote_id
    const quoteNumber = (a.quotes as any)?.quote_number ?? '—'
    const totalSelling = Number((a.quote_versions as any)?.total_selling_usd ?? 0)
    const qPayments = (paymentsByQuote[quoteId] ?? []) as any[]
    const totalReceived = qPayments.reduce((sum: number, p: any) => {
      return p.payment_type === 'refund' ? sum - Number(p.amount_usd) : sum + Number(p.amount_usd)
    }, 0)
    return { quoteId, quoteNumber, clientName: a.client_name, totalSelling, totalReceived, acceptedAt: a.accepted_at, payments: qPayments }
  })

  const totalAccepted = rows.reduce((s, r) => s + r.totalSelling, 0)
  const totalReceived = rows.reduce((s, r) => s + r.totalReceived, 0)
  const totalOutstanding = Math.max(totalAccepted - totalReceived, 0)

  // --- P&L ---
  const acceptedVersionIds = new Set((acceptedVersions ?? []).map(v => v.id))
  const totalRevenue = (acceptedVersions ?? []).reduce((s, v) => s + Number(v.total_selling_usd ?? 0), 0)
  const totalCogs = (acceptedVersions ?? []).reduce((s, v) => s + Number(v.total_cost_usd ?? 0), 0)
  const grossProfit = totalRevenue - totalCogs
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  const catRevenue: Record<string, number> = {}
  const catCost: Record<string, number> = {}
  for (const line of (priceLines ?? [])) {
    if (!acceptedVersionIds.has(line.quote_version_id)) continue
    catRevenue[line.cost_category] = (catRevenue[line.cost_category] ?? 0) + Number(line.total_selling_usd ?? 0)
    catCost[line.cost_category] = (catCost[line.cost_category] ?? 0) + Number(line.total_cost_usd ?? 0)
  }
  const categories = Object.entries(catRevenue).sort((a, b) => b[1] - a[1])

  // Monthly P&L (last 6 months)
  const now = new Date()
  const months: { label: string; key: string; revenue: number; cost: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, revenue: 0, cost: 0 })
  }
  for (const acc of (acceptances ?? [])) {
    const key = (acc as any).accepted_at?.slice(0, 7)
    const m = months.find(m => m.key === key)
    if (m) {
      m.revenue += Number((acc as any).quote_versions?.total_selling_usd ?? 0)
      m.cost += Number((acc as any).quote_versions?.total_cost_usd ?? 0)
    }
  }
  const maxMonthRev = Math.max(...months.map(m => m.revenue), 1)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Finance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Receivables, payments, and P&amp;L</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <Link
          href="/admin/finance"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'receivables' ? 'border-[#7A9A4A] text-[#7A9A4A]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Receivables
        </Link>
        <Link
          href="/admin/finance?tab=pnl"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'pnl' ? 'border-[#7A9A4A] text-[#7A9A4A]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          P&amp;L
        </Link>
      </div>

      {activeTab === 'receivables' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500">Total Accepted Value</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">${fmt(totalAccepted)}</p>
              <p className="text-xs text-gray-400 mt-1">{rows.length} quote{rows.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500">Total Received</p>
              <p className="text-2xl font-semibold text-green-700 mt-1">${fmt(totalReceived)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {totalAccepted > 0 ? Math.round((totalReceived / totalAccepted) * 100) : 0}% collected
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500">Outstanding</p>
              <p className={`text-2xl font-semibold mt-1 ${totalOutstanding > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                ${fmt(totalOutstanding)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {rows.filter(r => r.totalSelling - r.totalReceived > 0).length} with balance due
              </p>
            </div>
          </div>

          {/* Receivables list */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Receivables</h2>
              <p className="text-xs text-gray-400 mt-0.5">Click a row to see payments or record a new one</p>
            </div>
            {rows.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400">
                No accepted quotes yet. Payments are tracked once a client accepts a quote.
              </div>
            ) : (
              <ReceivablesTable rows={rows} />
            )}
          </div>
        </>
      )}

      {activeTab === 'pnl' && (
        <div className="space-y-6">
          {/* P&L summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500">Gross Revenue</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">${fmt(totalRevenue)}</p>
              <p className="text-xs text-gray-400 mt-1">accepted quotes selling price</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500">Cost of Sales</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">${fmt(totalCogs)}</p>
              <p className="text-xs text-gray-400 mt-1">supplier costs from price lines</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500">Gross Profit</p>
              <p className={`text-2xl font-semibold mt-1 ${grossProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                ${fmt(grossProfit)}
              </p>
              <p className="text-xs text-gray-400 mt-1">revenue − COGS</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500">Gross Margin</p>
              <p className={`text-2xl font-semibold mt-1 ${grossMargin >= 20 ? 'text-green-700' : grossMargin >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                {fmt2(grossMargin)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">on {(acceptedVersions ?? []).length} accepted quotes</p>
            </div>
          </div>

          {/* Monthly P&L chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Monthly Revenue vs Cost — Last 6 Months</h2>
            <p className="text-xs text-gray-400 mb-4">Accepted quotes by acceptance month</p>
            {months.some(m => m.revenue > 0) ? (
              <>
                <div className="flex items-end gap-3 h-36">
                  {months.map((m, i) => (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                      {m.revenue > 0 && (
                        <p className="text-[10px] text-gray-400 leading-none">${(m.revenue / 1000).toFixed(0)}k</p>
                      )}
                      <div className="w-full flex items-end gap-0.5" style={{ height: '96px' }}>
                        <div
                          className="flex-1 rounded-t"
                          style={{
                            height: m.revenue > 0 ? `${Math.max((m.revenue / maxMonthRev) * 96, 4)}px` : '2px',
                            backgroundColor: i === 5 ? '#7A9A4A' : '#B8CFA0',
                          }}
                        />
                        {m.cost > 0 && (
                          <div
                            className="flex-1 rounded-t"
                            style={{
                              height: `${Math.max((m.cost / maxMonthRev) * 96, 4)}px`,
                              backgroundColor: i === 5 ? '#EF4444' : '#FCA5A5',
                            }}
                          />
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400">{m.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <div className="w-3 h-3 rounded-sm bg-[#7A9A4A]" /> Revenue
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <div className="w-3 h-3 rounded-sm bg-red-400" /> Cost
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 py-10 text-center">No accepted quotes yet.</p>
            )}
          </div>

          {/* Category P&L */}
          {categories.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">P&amp;L by Category</h2>
                <p className="text-xs text-gray-400 mt-0.5">From price lines on accepted quotes</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium text-right">Revenue</th>
                    <th className="px-5 py-3 font-medium text-right">Cost</th>
                    <th className="px-5 py-3 font-medium text-right">Profit</th>
                    <th className="px-5 py-3 font-medium text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(([cat, rev]) => {
                    const cost = catCost[cat] ?? 0
                    const profit = rev - cost
                    const margin = rev > 0 ? (profit / rev) * 100 : 0
                    return (
                      <tr key={cat} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-3 font-medium text-gray-800">{CATEGORY_LABELS[cat] ?? cat}</td>
                        <td className="px-5 py-3 text-right text-gray-700">${fmt(rev)}</td>
                        <td className="px-5 py-3 text-right text-gray-500">${fmt(cost)}</td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">${fmt(profit)}</td>
                        <td className={`px-5 py-3 text-right font-semibold ${margin >= 20 ? 'text-green-700' : margin >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                          {margin.toFixed(1)}%
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-gray-50 font-semibold text-sm">
                    <td className="px-5 py-3 text-gray-900">Total</td>
                    <td className="px-5 py-3 text-right text-gray-900">${fmt(totalRevenue)}</td>
                    <td className="px-5 py-3 text-right text-gray-700">${fmt(totalCogs)}</td>
                    <td className="px-5 py-3 text-right text-gray-900">${fmt(grossProfit)}</td>
                    <td className={`px-5 py-3 text-right ${grossMargin >= 20 ? 'text-green-700' : grossMargin >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                      {grossMargin.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            Full double-entry accounting and expense tracking coming in a future update.
          </p>
        </div>
      )}
    </div>
  )
}
