import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ReceivablesTable from '../receivables-table'
import FinanceNav from '../finance-nav'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

interface PaymentRow {
  id: string
  quote_id: string
  amount_usd: number
  payment_type: string
  method: string | null
  reference: string | null
  received_at: string
}

export default async function ReceiptsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  const [
    { data: acceptances, error: acceptancesError },
    { data: payments, error: paymentsError },
    { data: directBookings },
    { data: bookingPayments },
  ] = await Promise.all([
    admin.from('quote_acceptances')
      .select('id, client_name, accepted_at, quote_version_id, quote_id, quote_versions(title, total_selling_usd, total_cost_usd), quotes(id, quote_number)')
      .order('accepted_at', { ascending: false }),
    admin.from('quote_payments')
      .select('id, quote_id, amount_usd, payment_type, method, reference, received_at'),
    admin.from('bookings')
      .select('id, total_price_usd, status, created_at, departure_id, departures(start_date, tours(title_en))')
      .is('quote_id', null)
      .eq('status', 'confirmed'),
    admin.from('booking_payments')
      .select('id, booking_id, amount_usd, status, created_at'),
  ])

  if (acceptancesError) console.error('[Receipts] quote_acceptances read error:', acceptancesError.message)
  if (paymentsError) console.error('[Receipts] quote_payments read error:', paymentsError.message)

  const paymentsByQuote: Record<string, PaymentRow[]> = {}
  for (const p of ((payments ?? []) as PaymentRow[])) {
    if (!paymentsByQuote[p.quote_id]) paymentsByQuote[p.quote_id] = []
    paymentsByQuote[p.quote_id]!.push(p)
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const rows = (acceptances ?? []).map((a: any) => {
    const quoteId = (a.quotes as any)?.id ?? a.quote_id
    const quoteNumber = (a.quotes as any)?.quote_number ?? '—'
    const totalSelling = Number((a.quote_versions as any)?.total_selling_usd ?? 0)
    const qPayments = paymentsByQuote[quoteId] ?? []
    const totalReceived = qPayments.reduce((sum, p) =>
      p.payment_type === 'refund' ? sum - Number(p.amount_usd) : sum + Number(p.amount_usd), 0)
    return { quoteId, quoteNumber, clientName: a.client_name, totalSelling, totalReceived, acceptedAt: a.accepted_at, payments: qPayments }
  })

  const bpByBooking: Record<string, number> = {}
  for (const bp of (bookingPayments ?? [])) {
    if (bp.status === 'paid') {
      bpByBooking[bp.booking_id] = (bpByBooking[bp.booking_id] ?? 0) + Number(bp.amount_usd)
    }
  }
  const directRows = (directBookings ?? []).map((b: any) => {
    const amountDue = Number(b.total_price_usd ?? 0)
    const amountReceived = bpByBooking[b.id] ?? 0
    const tourTitle = (b.departures as any)?.tours?.title_en ?? 'Direct Booking'
    const startDate = (b.departures as any)?.start_date ?? null
    return { bookingId: b.id, tourTitle, startDate, amountDue, amountReceived, createdAt: b.created_at }
  })
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const totalInvoiced = rows.reduce((s, r) => s + r.totalSelling, 0)
    + directRows.reduce((s, r) => s + r.amountDue, 0)
  const totalReceived = rows.reduce((s, r) => s + r.totalReceived, 0)
    + directRows.reduce((s, r) => s + r.amountReceived, 0)
  const totalOutstanding = Math.max(totalInvoiced - totalReceived, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Finance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Customer receipts — invoiced vs received per accepted quote</p>
      </div>

      <FinanceNav active="/admin/finance/receipts" />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-500">Invoiced</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">${fmt(totalInvoiced)}</p>
          <p className="text-xs text-gray-400 mt-1">{rows.length} accepted quote{rows.length !== 1 ? 's' : ''} + {directRows.length} direct booking{directRows.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-500">Received</p>
          <p className="text-2xl font-semibold text-green-700 mt-1">${fmt(totalReceived)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {totalInvoiced > 0 ? Math.round((totalReceived / totalInvoiced) * 100) : 0}% collected
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-500">Balance due</p>
          <p className={`text-2xl font-semibold mt-1 ${totalOutstanding > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
            ${fmt(totalOutstanding)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {rows.filter(r => r.totalSelling - r.totalReceived > 0).length} with balance due
          </p>
        </div>
      </div>

      {/* Quote-based receipts */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Accepted quotes</h2>
          <p className="text-xs text-gray-400 mt-0.5">Click a row to see receipts or record a new one — received can never exceed invoiced</p>
        </div>
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            No accepted quotes yet. Receipts are tracked once a client accepts a quote.
          </div>
        ) : (
          <ReceivablesTable rows={rows} />
        )}
      </div>

      {/* Direct website bookings */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-4">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Direct website bookings</h2>
          <p className="text-xs text-gray-400 mt-0.5">Confirmed bookings made without a quote — revenue only, no cost breakdown available</p>
        </div>
        {directRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            No confirmed direct bookings yet.
          </div>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Tour / Departure</th>
                <th className="px-5 py-3 font-medium text-right">Amount Due</th>
                <th className="px-5 py-3 font-medium text-right">Received</th>
                <th className="px-5 py-3 font-medium text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {directRows.map((r) => {
                const outstanding = Math.max(r.amountDue - r.amountReceived, 0)
                return (
                  <tr key={r.bookingId} className="border-b border-gray-50 last:border-0">
                    <td data-label="Tour / Departure" className="px-5 py-3">
                      <p className="font-medium text-gray-800">{r.tourTitle}</p>
                      {r.startDate && (
                        <p className="text-xs text-gray-400">{new Date(r.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      )}
                    </td>
                    <td data-label="Amount Due" className="px-5 py-3 text-right text-gray-700">${fmt(r.amountDue)}</td>
                    <td data-label="Received" className="px-5 py-3 text-right text-green-700">${fmt(r.amountReceived)}</td>
                    <td data-label="Outstanding" className={`px-5 py-3 text-right font-semibold ${outstanding > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                      ${fmt(outstanding)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
