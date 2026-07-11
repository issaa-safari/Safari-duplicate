import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import SuppliersTable from './suppliers-table'
import type { SupplierRow } from './constants'

export default async function SuppliersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const [{ data: suppliers, error }, { data: rateCards }] = await Promise.all([
    admin
      .from('suppliers')
      .select('id, name, supplier_type, contact_email, contact_phone, notes, is_active')
      .order('name'),
    admin
      .from('supplier_rate_cards')
      .select('id, supplier_id')
      .not('supplier_id', 'is', null),
  ])

  const rateCardCounts: Record<string, number> = {}
  for (const card of rateCards ?? []) {
    rateCardCounts[card.supplier_id] = (rateCardCounts[card.supplier_id] ?? 0) + 1
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Suppliers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Hotels, park authorities and vehicle providers you owe money to. Link rate cards to a supplier so Payables can track balances.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-warning-foreground rounded-xl border border-warning-foreground/20 bg-warning/50 px-4 py-3">
          Suppliers table not available — apply migration group_33_supplier_finance.sql first. ({error.message})
        </p>
      ) : (
        <SuppliersTable suppliers={(suppliers ?? []) as SupplierRow[]} rateCardCounts={rateCardCounts} />
      )}
    </div>
  )
}
