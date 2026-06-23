import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ReceivablesTable from './receivables-table'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default async function FinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  const [
    { data: acceptances },
    { data: payments },
  ] = await Promise.all([
    admin.from('quote_acceptances')
      .select('id, client_name, accepted_at, quote_version_id, quote_id, quote_versions(title, total_selling_usd), quotes(id, quote_number)')
      .order('accepted_at', { ascending: false }),
    admin.from('quote_payments')
      .select('id, quote_id, amount_usd, payment_type, method, reference, received_at'),
  ])

  // Group payments by quote
  const paymentsByQuote: Record<string, typeof payments> = {}
  for (const p of (payments ?? [])) {
    if (!paymentsByQuote[p.quote_id]) paymentsByQuote[p.quote_id] = []
    paymentsByQuote[p.quote_id]!.push(p)
  }

  // Build receivable rows
  const rows = (acceptances ?? []).map((a: any) => {
    const quoteId = (a.quotes as any)?.id ?? a.quote_id
    const quoteNumber = (a.quotes as any)?.quote_number ?? '—'
    const totalSelling = Number((a.quote_versions as any)?.total_selling_usd ?? 0)
    const qPayments = (paymentsByQuote[quoteId] ?? []) as any[]
    const totalReceived = qPayments.reduce((sum: number, p: any) => {
      return p.payment_type === 'refund'
        ? sum - Number(p.amount_usd)
        : sum + Number(p.amount_usd)
    }, 0)

    return {
      quoteId,
      quoteNumber,
      clientName: a.client_name,
      totalSelling,
      totalReceived,
      acceptedAt: a.accepted_at,
      payments: qPayments,
    }
  })

  const totalAccepted = rows.reduce((s, r) => s + r.totalSelling, 0)
  const totalReceived = rows.reduce((s, r) => s + r.totalReceived, 0)
  const totalOutstanding = Math.max(totalAccepted - totalReceived, 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Finance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Receivables and payment tracking for accepted quotes</p>
      </div>

      {/* Summary KPIs */}
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
            {rows.filter(r => r.totalSelling - r.totalReceived > 0).length} quotes with balance due
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

      <p className="text-xs text-gray-400 mt-4 text-center">
        Full P&amp;L, payables, and accounting ledger coming in a future update.
      </p>
    </div>
  )
}
