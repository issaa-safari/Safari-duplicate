import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import FinanceNav from '../finance-nav'
import ExpensesTable, { type ExpenseRow } from './expenses-table'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: expenses, error } = await admin
    .from('expenses')
    .select('id, expense_date, category, description, amount_usd, method, reference')
    .order('expense_date', { ascending: false })
    .limit(500)

  const rows = (expenses ?? []) as ExpenseRow[]
  const monthStart = new Date().toISOString().slice(0, 8) + '01'
  const totalMtd = rows
    .filter(x => x.expense_date >= monthStart)
    .reduce((s, x) => s + Number(x.amount_usd), 0)
  const total = rows.reduce((s, x) => s + Number(x.amount_usd), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Finance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Expense log — overheads that feed the P&amp;L (salaries, rent, fuel, …)</p>
      </div>

      <FinanceNav active="/admin/finance/expenses" />

      {error ? (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg border border-amber-200 px-4 py-3">
          Expenses table not available — apply migration group_33_supplier_finance.sql first. ({error.message})
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500">This month</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">${fmt(totalMtd)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500">All logged</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">${fmt(total)}</p>
              <p className="text-xs text-gray-400 mt-1">{rows.length} entr{rows.length === 1 ? 'y' : 'ies'}</p>
            </div>
          </div>
          <ExpensesTable expenses={rows} />
        </>
      )}
    </div>
  )
}
