import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import InvoiceStatusBadge from '../status-badge'
import InvoiceEditor from './editor'
import { getInvoice } from '@/lib/server/invoices'
import { getTripPayments, resolveTripRef } from '@/lib/server/accounting'
import { allocatePayments, invoiceDisplayStatus } from '@/lib/invoice'
import PaymentActions from '../../payment-actions'

export const dynamic = 'force-dynamic'

function money(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function day(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const found = await getInvoice(admin, id)
  if (!found) notFound()

  const { invoice, lines } = found

  // Everything raised against this trip, so the allocation rule sees the same
  // picture the list page does.
  const ref = await resolveTripRef(admin, {
    quoteId: invoice.quote_id,
    bookingId: invoice.booking_id,
  })
  const [{ data: siblingRows }, payments] = await Promise.all([
    admin
      .from('invoices')
      .select('id, status')
      .or(
        [
          ref.quoteId ? `quote_id.eq.${ref.quoteId}` : null,
          ref.bookingId ? `booking_id.eq.${ref.bookingId}` : null,
        ]
          .filter(Boolean)
          .join(',')
      ),
    getTripPayments(admin, ref),
  ])

  const siblings = (siblingRows ?? []) as { id: string; status: 'draft' | 'issued' | 'void' }[]
  const { byInvoice } = allocatePayments(siblings, payments)

  const total = Number(invoice.total_usd) || 0
  const receivedUsd = byInvoice[invoice.id] ?? 0
  const balanceUsd = Math.max(total - receivedUsd, 0)
  const displayStatus = invoiceDisplayStatus({
    status: invoice.status,
    totalUsd: total,
    receivedUsd,
    dueDate: invoice.due_date,
  })

  const tripHref = invoice.quote_id
    ? `/admin/quotes/${invoice.quote_id}`
    : invoice.booking_id
      ? `/admin/bookings/${invoice.booking_id}`
      : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/finance/invoices" className="text-xs text-muted-foreground hover:underline">
            ← All invoices
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-xl font-semibold text-foreground">
            {invoice.invoice_number ?? 'Draft invoice'}
            <InvoiceStatusBadge status={displayStatus} />
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {invoice.status === 'draft'
              ? 'Not yet issued — edit freely. Issuing draws a number and freezes it.'
              : `Issued ${day(invoice.issue_date)}, due ${day(invoice.due_date)}.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {tripHref && (
            <Link href={tripHref} className="text-sm text-muted-foreground hover:text-foreground">
              Open trip
            </Link>
          )}
          {invoice.status !== 'draft' && (
            <Link
              href={`/admin/finance/invoices/${invoice.id}/print`}
              className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-alt"
            >
              Print / PDF
            </Link>
          )}
        </div>
      </div>

      {/* A generated draft with no lines means the trip itself has no price —
          a quote accepted before it was costed, most often. Without this the
          screen just shows $0.00 and leaves you to guess why. */}
      {invoice.status === 'draft' && lines.length === 0 && (
        <div className="mb-6 rounded-xl border border-warning-foreground/30 bg-warning/40 p-4 text-sm">
          <p className="font-medium text-foreground">This trip has no price yet, so the draft is empty.</p>
          <p className="mt-0.5 text-muted-foreground">
            Generating an invoice copies the trip price and any add-on services. Both are zero here —
            usually a quote that was accepted before its itinerary was costed in the Trip Builder.
            {invoice.quote_id && (
              <>
                {' '}
                <Link href={`/admin/quotes/${invoice.quote_id}`} className="text-brand-text hover:underline">
                  Open the quote
                </Link>{' '}
                to price it, then generate again — or add the lines by hand below.
              </>
            )}
          </p>
        </div>
      )}

      {invoice.status === 'void' && (
        <div className="mb-6 rounded-xl border border-border bg-surface-alt p-4 text-sm">
          <p className="font-medium text-foreground">This invoice was voided.</p>
          <p className="mt-0.5 text-muted-foreground">
            {invoice.void_reason} — {day(invoice.voided_at)}. Its number stays spoken for; raise a new
            invoice for the corrected amount.
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Invoiced</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">${money(total)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Received</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">${money(receivedUsd)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Balance</p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              balanceUsd > 0 ? 'text-warning-foreground' : 'text-muted-foreground'
            }`}
          >
            ${money(balanceUsd)}
          </p>
        </div>
      </div>

      <InvoiceEditor invoice={invoice} lines={lines} />

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Payments against this trip</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Recorded on the trip, not on the document — a deposit taken before this invoice existed
            still counts towards it.
          </p>
        </div>
        {payments.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nothing received yet.</p>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 font-medium">Reference</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border/40 last:border-0">
                  <td data-label="Date" className="px-5 py-3 text-muted-foreground">{day(p.received_at)}</td>
                  <td data-label="Type" className="px-5 py-3 text-foreground">{p.payment_type ?? '—'}</td>
                  <td data-label="Method" className="px-5 py-3 text-muted-foreground">{p.method ?? '—'}</td>
                  <td data-label="Reference" className="px-5 py-3 text-muted-foreground">{p.reference ?? '—'}</td>
                  <td
                    data-label="Amount"
                    className={`px-5 py-3 text-right tabular-nums ${
                      p.payment_type === 'refund' ? 'text-destructive' : 'text-green-700'
                    }`}
                  >
                    {p.payment_type === 'refund' ? '−' : ''}${money(Number(p.amount_usd))}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <PaymentActions
                      payment={p}
                      quoteId={ref.quoteId ?? undefined}
                      bookingId={ref.bookingId ?? undefined}
                      label={invoice.invoice_number ?? 'This trip'}
                      totalSelling={total}
                      alreadyReceived={receivedUsd}
                    />
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
