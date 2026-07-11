'use client'

import { useState, useTransition } from 'react'
import { addExpense, deleteExpense } from './actions'

export interface ExpenseRow {
  id: string
  expense_date: string
  category: string
  description: string
  amount_usd: number
  method: string | null
  reference: string | null
}

const CATEGORIES = ['salaries', 'rent', 'fuel', 'marketing', 'office', 'maintenance', 'other']
const METHODS = ['bank_transfer', 'card', 'cash', 'mpesa', 'cheque', 'other']

const inputCls =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function label(v: string) {
  return v.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function ExpensesTable({ expenses }: { expenses: ExpenseRow[] }) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function submitNew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const fd = new FormData(form)
    startTransition(async () => {
      try {
        await addExpense(fd)
        form.reset()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add expense.')
      }
    })
  }

  function remove(expenseId: string) {
    setError('')
    const fd = new FormData()
    fd.set('expenseId', expenseId)
    startTransition(async () => {
      try {
        await deleteExpense(fd)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete expense.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submitNew} className="bg-[var(--olive)]/5 rounded-lg border border-[var(--olive)]/30 p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Log expense</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="col-span-2">
            <input name="description" required placeholder="Description *" className={inputCls} />
          </div>
          <select name="category" defaultValue="other" className={inputCls}>
            {CATEGORIES.map(c => <option key={c} value={c}>{label(c)}</option>)}
          </select>
          <input name="amount" type="number" min="0.01" step="0.01" required placeholder="USD *" className={inputCls} />
          <input name="expenseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
          <select name="method" defaultValue="" className={inputCls}>
            <option value="">Method…</option>
            {METHODS.map(m => <option key={m} value={m}>{label(m)}</option>)}
          </select>
          <div className="col-span-2 md:col-span-5">
            <input name="reference" placeholder="Reference (optional)" className={inputCls} />
          </div>
          <button type="submit" disabled={pending}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 bg-olive hover:bg-olive-dk">
            {pending ? 'Adding…' : '+ Add'}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {expenses.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No expenses logged yet.</p>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Description</th>
                <th className="px-3 py-3 font-medium">Method</th>
                <th className="px-3 py-3 font-medium text-right">Amount</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {expenses.map(x => (
                <tr key={x.id} className="border-b border-gray-50 last:border-0">
                  <td data-label="Date" className="px-5 py-2.5 text-gray-600 whitespace-nowrap">
                    {new Date(x.expense_date).toLocaleDateString('en-GB')}
                  </td>
                  <td data-label="Category" className="px-3 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{label(x.category)}</span>
                  </td>
                  <td data-label="Description" className="px-3 py-2.5 text-gray-800">
                    {x.description}
                    {x.reference && <span className="text-xs text-muted-foreground ml-2">({x.reference})</span>}
                  </td>
                  <td data-label="Method" className="px-3 py-2.5 text-gray-500 text-xs">{x.method ? label(x.method) : '—'}</td>
                  <td data-label="Amount" className="px-3 py-2.5 text-right font-medium text-gray-900 tabular-nums">${fmt(Number(x.amount_usd))}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button type="button" onClick={() => remove(x.id)} disabled={pending}
                      className="text-xs text-gray-300 hover:text-red-500">✕</button>
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
