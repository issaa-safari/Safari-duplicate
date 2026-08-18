import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import FinanceNav from './finance-nav'
import { getAllInvoiceSummaries } from '@/lib/server/invoices'
import { getAllSecurityDeposits } from '@/lib/server/security-deposits'
import { summariseDeposits } from '@/lib/security-deposit'
import { signedPaymentSum } from '@/lib/balance'

export const dynamic = 'force-dynamic'

function money(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default async function FinanceOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  const firstOfMonthIso = firstOfMonth.toISOString().slice(0, 10)

  const [{ data: monthPayments }, rows, deposits] = await Promise.all([
    admin
      .from('trip_payments')
      .select('amount_usd, payment_type')
      .gte('received_at', firstOfMonthIso),
    getAllInvoiceSummaries(admin),
    getAllSecurityDeposits(admin),
  ])

  const receivedThisMonth = signedPaymentSum(monthPayments ?? [])

  const live = rows.filter((r) => r.invoice.status === 'issued')
  const outstanding = live.reduce((sum, r) => sum + r.balanceUsd, 0)
  const overdue = rows.filter((r) => r.displayStatus === 'overdue')
  const overdueUsd = overdue.reduce((sum, r) => sum + r.balanceUsd, 0)

  const depositsHeld = summariseDeposits(deposits).heldUsd

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Finance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Where the money stands, at a glance</p>
      </div>

      <FinanceNav active="/admin/finance" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Received this month</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">${money(receivedThisMonth)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className={`mt-1 text-2xl font-semibold ${outstanding > 0 ? 'text-warning-foreground' : 'text-muted-foreground'}`}>
            ${money(outstanding)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{live.length} live invoice{live.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className={`mt-1 text-2xl font-semibold ${overdue.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            ${money(overdueUsd)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {overdue.length > 0 ? `${overdue.length} invoice${overdue.length !== 1 ? 's' : ''}` : 'nothing overdue'}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Deposits held</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">${money(depositsHeld)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Refundable — not revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/admin/finance/invoices"
          className="rounded-xl border border-border bg-surface p-5 shadow-sm hover:bg-surface-alt transition"
        >
          <h2 className="text-sm font-semibold text-foreground">Invoices</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The documents raised — what each trip or freehand charge was billed.
          </p>
        </Link>
        <Link
          href="/admin/finance/receipts"
          className="rounded-xl border border-border bg-surface p-5 shadow-sm hover:bg-surface-alt transition"
        >
          <h2 className="text-sm font-semibold text-foreground">Receipts</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The money-in ledger — what has actually arrived, trip by trip.
          </p>
        </Link>
      </div>
    </div>
  )
}
