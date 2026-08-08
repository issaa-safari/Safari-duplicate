import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import FinanceNav from '../finance-nav'
import InvoiceStatusBadge from './status-badge'
import { allocatePayments, invoiceDisplayStatus } from '@/lib/invoice'
import type { Invoice, InvoiceDisplayStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

function money(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function day(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  const [{ data: invoiceRows }, { data: paymentRows }] = await Promise.all([
    admin
      .from('invoices')
      .select('id, quote_id, booking_id, invoice_number, status, issue_date, due_date, client_name, total_usd, created_at')
      .order('created_at', { ascending: false }),
    admin.from('trip_payments').select('quote_id, booking_id, invoice_id, amount_usd, payment_type'),
  ])

  const invoices = (invoiceRows ?? []) as unknown as Invoice[]
  const payments = (paymentRows ?? []) as {
    quote_id: string | null
    booking_id: string | null
    invoice_id: string | null
    amount_usd: number
    payment_type: string | null
  }[]

  // Allocation is per trip, not global: an unnamed payment may only fall to the
  // sole live invoice of the trip it was recorded against.
  const tripKey = (r: { quote_id: string | null; booking_id: string | null }) =>
    r.quote_id ? `q:${r.quote_id}` : `b:${r.booking_id}`

  const received: Record<string, number> = {}
  const trips = new Set(invoices.map(tripKey))
  for (const key of trips) {
    const tripInvoices = invoices.filter((i) => tripKey(i) === key)
    const tripPayments = payments.filter((p) => tripKey(p) === key)
    const { byInvoice } = allocatePayments(
      tripInvoices.map((i) => ({ id: i.id, status: i.status })),
      tripPayments
    )
    Object.assign(received, byInvoice)
  }

  const rows = invoices.map((invoice) => {
    const receivedUsd = received[invoice.id] ?? 0
    const total = Number(invoice.total_usd) || 0
    return {
      invoice,
      total,
      receivedUsd,
      balanceUsd: Math.max(total - receivedUsd, 0),
      displayStatus: invoiceDisplayStatus({
        status: invoice.status,
        totalUsd: total,
        receivedUsd,
        dueDate: invoice.due_date,
      }) as InvoiceDisplayStatus,
    }
  })

  const live = rows.filter((r) => r.invoice.status === 'issued')
  const totalIssued = live.reduce((s, r) => s + r.total, 0)
  const totalReceived = live.reduce((s, r) => s + r.receivedUsd, 0)
  const totalOutstanding = live.reduce((s, r) => s + r.balanceUsd, 0)
  const overdue = rows.filter((r) => r.displayStatus === 'overdue')

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Finance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Invoices — what each trip was asked for, and how much of it has arrived
        </p>
      </div>

      <FinanceNav active="/admin/finance/invoices" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Issued</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">${money(totalIssued)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {live.length} live invoice{live.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Received</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">${money(totalReceived)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalIssued > 0 ? Math.round((totalReceived / totalIssued) * 100) : 0}% collected
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className={`mt-1 text-2xl font-semibold ${totalOutstanding > 0 ? 'text-warning-foreground' : 'text-muted-foreground'}`}>
            ${money(totalOutstanding)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {overdue.length > 0 ? `${overdue.length} overdue` : 'nothing overdue'}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">All invoices</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Raise one from a quote or a booking — the trip price and its add-on services fill it in.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No invoices yet. Open an accepted quote or a confirmed booking and choose{' '}
            <span className="font-medium text-foreground">Generate invoice</span>.
          </div>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Issued</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 text-right font-medium">Received</th>
                <th className="px-5 py-3 text-right font-medium">Balance</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.invoice.id} className="border-b border-border/40 last:border-0">
                  <td data-label="Number" className="px-5 py-3">
                    <Link
                      href={`/admin/finance/invoices/${r.invoice.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {r.invoice.invoice_number ?? 'Draft'}
                    </Link>
                  </td>
                  <td data-label="Client" className="px-5 py-3 text-muted-foreground">
                    {r.invoice.client_name || '—'}
                  </td>
                  <td data-label="Issued" className="px-5 py-3 text-muted-foreground">
                    {day(r.invoice.issue_date)}
                  </td>
                  <td data-label="Due" className="px-5 py-3 text-muted-foreground">
                    {day(r.invoice.due_date)}
                  </td>
                  <td data-label="Total" className="px-5 py-3 text-right tabular-nums text-foreground">
                    ${money(r.total)}
                  </td>
                  <td data-label="Received" className="px-5 py-3 text-right tabular-nums text-green-700">
                    ${money(r.receivedUsd)}
                  </td>
                  <td
                    data-label="Balance"
                    className={`px-5 py-3 text-right font-semibold tabular-nums ${
                      r.balanceUsd > 0 ? 'text-warning-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    ${money(r.balanceUsd)}
                  </td>
                  <td data-label="Status" className="px-5 py-3">
                    <InvoiceStatusBadge status={r.displayStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
