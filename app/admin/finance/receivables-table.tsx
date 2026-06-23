'use client'

import { useState } from 'react'
import PaymentForm from './payment-form'

interface ReceivableRow {
  quoteId: string
  quoteNumber: string
  clientName: string
  totalSelling: number
  totalReceived: number
  acceptedAt: string | null
  payments: { id: string; amount_usd: number; payment_type: string; method: string | null; received_at: string; reference: string | null }[]
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null
  const ms = Date.now() - new Date(dateStr).getTime()
  return Math.floor(ms / 86_400_000)
}

export default function ReceivablesTable({ rows }: { rows: ReceivableRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [paying, setPaying] = useState<string | null>(null)

  function toggle(id: string) {
    setExpanded(e => e === id ? null : id)
    setPaying(null)
  }

  return (
    <div className="divide-y divide-gray-50">
      {rows.map(row => {
        const outstanding = Math.max(row.totalSelling - row.totalReceived, 0)
        const pct = row.totalSelling > 0 ? Math.round((row.totalReceived / row.totalSelling) * 100) : 0
        const isOpen = expanded === row.quoteId
        const daysOutstanding = outstanding > 0 ? daysAgo(row.acceptedAt) : null
        const overdue = daysOutstanding !== null && daysOutstanding > 30

        return (
          <div key={row.quoteId}>
            <button
              type="button"
              onClick={() => toggle(row.quoteId)}
              className="w-full text-left px-5 py-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-gray-400">{row.quoteNumber}</span>
                    <span className="font-medium text-gray-900 text-sm">{row.clientName}</span>
                  </div>
                  {row.acceptedAt && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                      <span>Accepted {new Date(row.acceptedAt).toLocaleDateString('en-GB')}</span>
                      {daysOutstanding !== null && (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          overdue ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {daysOutstanding}d
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">${fmt(row.totalSelling)}</p>
                  <div className="flex items-center gap-2 mt-0.5 justify-end">
                    <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-[#7A9A4A]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{pct}%</span>
                  </div>
                  {outstanding > 0 ? (
                    <p className={`text-xs mt-0.5 font-medium ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
                      Due ${fmt(outstanding)}{overdue ? ' — overdue' : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-green-600 mt-0.5">Paid in full</p>
                  )}
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="px-5 pb-4 bg-gray-50/50 border-t border-gray-100">
                {paying === row.quoteId ? (
                  <div className="max-w-md pt-4">
                    <PaymentForm
                      quoteId={row.quoteId}
                      quoteNumber={row.quoteNumber}
                      totalSelling={row.totalSelling}
                      alreadyReceived={row.totalReceived}
                      onDone={() => { setPaying(null); window.location.reload() }}
                    />
                  </div>
                ) : (
                  <div className="pt-3">
                    {row.payments.length > 0 ? (
                      <div className="overflow-x-auto">
                      <table className="w-full text-sm mb-3 min-w-[420px]">
                        <thead>
                          <tr className="text-xs text-gray-400 text-left border-b border-gray-100">
                            <th className="pb-1 font-medium">Date</th>
                            <th className="pb-1 font-medium">Type</th>
                            <th className="pb-1 font-medium">Method</th>
                            <th className="pb-1 font-medium">Ref</th>
                            <th className="pb-1 font-medium text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.payments.map(p => (
                            <tr key={p.id} className="border-b border-gray-50 last:border-0">
                              <td className="py-1.5 text-gray-600">
                                {new Date(p.received_at).toLocaleDateString('en-GB')}
                              </td>
                              <td className="py-1.5 text-gray-600 capitalize">{p.payment_type}</td>
                              <td className="py-1.5 text-gray-500">{p.method ?? '—'}</td>
                              <td className="py-1.5 text-gray-400 text-xs">{p.reference ?? '—'}</td>
                              <td className="py-1.5 text-right font-medium text-gray-900">
                                ${fmt(Number(p.amount_usd))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mb-3">No payments recorded yet.</p>
                    )}
                    {outstanding > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaying(row.quoteId)}
                        className="text-sm font-medium text-[#4C5E2A] hover:text-[#7A9A4A] border border-[#7A9A4A]/30 rounded px-3 py-1.5 hover:bg-[#7A9A4A]/5 transition"
                      >
                        + Record payment
                      </button>
                    )}
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
