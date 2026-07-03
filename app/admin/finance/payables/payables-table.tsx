'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { recordSupplierPayment } from './actions'
import type { SupplierPayable } from '@/lib/server/finance'

const inputCls =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const METHODS = ['bank_transfer', 'card', 'cash', 'mpesa', 'cheque', 'other']

function PaymentForm({ supplier, onDone }: { supplier: SupplierPayable; onDone: () => void }) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('supplierId', supplier.supplierId)
    startTransition(async () => {
      try {
        await recordSupplierPayment(fd)
        onDone()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to record payment.')
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-md pt-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Amount (USD) *</label>
          <input name="amount" type="number" min="0.01" step="0.01" required className={inputCls}
            placeholder={supplier.balanceUsd > 0 ? String(supplier.balanceUsd) : undefined} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Paid on</label>
          <input name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Method</label>
          <select name="method" defaultValue="bank_transfer" className={inputCls}>
            {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Allocate to quote</label>
          <select name="quoteId" defaultValue="" className={inputCls}>
            <option value="">— whole account —</option>
            {supplier.byQuote.map(q => (
              <option key={q.quoteId} value={q.quoteId}>{q.quoteNumber ?? q.quoteId.slice(0, 8)} (${fmt(q.owedUsd)})</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Reference</label>
        <input name="reference" className={inputCls} placeholder="e.g. bank ref / M-Pesa code" />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 bg-olive hover:bg-olive-dk">
          {pending ? 'Recording…' : 'Record payment'}
        </button>
        <button type="button" onClick={onDone}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function PayablesTable({ suppliers }: { suppliers: SupplierPayable[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [paying, setPaying] = useState<string | null>(null)

  return (
    <div className="divide-y divide-gray-50">
      {suppliers.map(s => {
        const isOpen = expanded === s.supplierId
        return (
          <div key={s.supplierId}>
            <button
              type="button"
              onClick={() => { setExpanded(e => (e === s.supplierId ? null : s.supplierId)); setPaying(null) }}
              className="w-full text-left px-5 py-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{s.supplierName}</p>
                  <p className="text-xs text-gray-400 capitalize">{s.supplierType.replace('_', ' ')}</p>
                </div>
                <div className="flex items-center gap-6 text-right shrink-0">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Owed</p>
                    <p className="text-sm font-medium text-gray-900 tabular-nums">${fmt(s.owedUsd)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Paid</p>
                    <p className="text-sm font-medium text-green-700 tabular-nums">${fmt(s.paidUsd)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Balance</p>
                    <p className={`text-sm font-semibold tabular-nums ${s.balanceUsd > 0 ? 'text-amber-700' : s.balanceUsd < 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      ${fmt(s.balanceUsd)}
                    </p>
                  </div>
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="px-5 pb-4 bg-gray-50/50 border-t border-gray-100">
                {paying === s.supplierId ? (
                  <PaymentForm supplier={s} onDone={() => { setPaying(null); window.location.reload() }} />
                ) : (
                  <div className="pt-3 space-y-3">
                    {s.byQuote.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Owed from accepted quotes</p>
                        <table className="w-full text-sm max-w-lg">
                          <tbody>
                            {s.byQuote.map(q => (
                              <tr key={q.quoteId} className="border-b border-gray-50 last:border-0">
                                <td className="py-1.5">
                                  <Link href={`/admin/quotes/${q.quoteId}`} className="font-mono text-xs text-[var(--olive)] hover:underline">
                                    {q.quoteNumber ?? q.quoteId.slice(0, 8)}
                                  </Link>
                                </td>
                                <td className="py-1.5 text-right font-medium text-gray-800 tabular-nums">${fmt(q.owedUsd)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {s.payments.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Payments made</p>
                        <table className="w-full text-sm max-w-lg">
                          <tbody>
                            {s.payments.map(p => (
                              <tr key={p.id} className="border-b border-gray-50 last:border-0">
                                <td className="py-1.5 text-gray-600 text-xs">{new Date(p.paidAt).toLocaleDateString('en-GB')}</td>
                                <td className="py-1.5 text-gray-500 text-xs">{p.method?.replace('_', ' ') ?? '—'}</td>
                                <td className="py-1.5 text-gray-400 text-xs">{p.reference ?? '—'}</td>
                                <td className="py-1.5 text-right font-medium text-green-700 tabular-nums">${fmt(p.amountUsd)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setPaying(s.supplierId)}
                      className="text-sm font-medium text-[var(--olive-dk)] hover:text-[var(--olive)] border border-[var(--olive)]/30 rounded px-3 py-1.5 hover:bg-[var(--olive)]/5 transition"
                    >
                      + Record payment
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
