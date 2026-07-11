import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import FinanceNav from '../finance-nav'
import PayablesTable from './payables-table'
import { getPayables } from '@/lib/server/finance'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default async function PayablesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  let payables
  try {
    payables = await getPayables(admin)
  } catch {
    payables = null
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Finance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Supplier payables — owed from ACCEPTED quote versions only, minus payments made
        </p>
      </div>

      <FinanceNav active="/admin/finance/payables" />

      {!payables ? (
        <p className="text-sm text-warning-foreground rounded-xl border border-warning-foreground/20 bg-warning/50 px-4 py-3">
          Payables need the suppliers tables — apply migration group_33_supplier_finance.sql first.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
              <p className="text-xs text-muted-foreground">Owed to suppliers</p>
              <p className="text-2xl font-semibold text-foreground mt-1">${fmt(payables.totalOwedUsd)}</p>
              <p className="text-xs text-muted-foreground mt-1">costs on accepted versions</p>
            </div>
            <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
              <p className="text-xs text-muted-foreground">Paid out</p>
              <p className="text-2xl font-semibold text-green-700 mt-1">${fmt(payables.totalPaidUsd)}</p>
              <p className="text-xs text-muted-foreground mt-1">supplier payments recorded</p>
            </div>
            <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
              <p className="text-xs text-muted-foreground">Balance payable</p>
              <p className={`text-2xl font-semibold mt-1 ${payables.totalBalanceUsd > 0 ? 'text-warning-foreground' : 'text-muted-foreground'}`}>
                ${fmt(payables.totalBalanceUsd)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{payables.suppliers.length} supplier{payables.suppliers.length !== 1 ? 's' : ''} with activity</p>
            </div>
          </div>

          {payables.unattributedCostUsd > 0 && (
            <p className="mb-4 text-xs text-warning-foreground rounded-xl border border-warning-foreground/20 bg-warning/50 px-4 py-2.5">
              ${fmt(payables.unattributedCostUsd)} of accepted-version costs have no supplier link —
              set the supplier on those <Link href="/admin/content/rates" className="underline">rate cards</Link> to include them here.
            </p>
          )}

          <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/70">
              <h2 className="text-sm font-semibold text-foreground">Per-supplier balances</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Click a supplier for the per-quote breakdown or to record a payment</p>
            </div>
            {payables.suppliers.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Nothing payable yet — balances appear once quotes with supplier-linked rate cards are accepted.
              </div>
            ) : (
              <PayablesTable suppliers={payables.suppliers} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
