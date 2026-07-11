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
              className="w-full text-left px-5 py-4 hover:bg-muted transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">{row.quoteNumber}</span>
                    <span className="font-medium text-foreground text-sm">{row.clientName}</span>
                  </div>
                  {row.acceptedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>Accepted {new Date(row.acceptedAt).toLocaleDateString('en-GB')}</span>
                      {daysOutstanding !== null && (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          overdue ? 'bg-destructive/10 text-destructive' : 'bg-amber-50 text-warning-foreground'
                        }`}>
                          {daysOutstanding}d
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">${fmt(row.totalSelling)}</p>
                  <div className="flex items-center gap-2 mt-0.5 justify-end">
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--olive)]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </div>
                  {outstanding > 0 ? (
                    <p className={`text-xs mt-0.5 font-medium ${overdue ? 'text-destructive' : 'text-warning-foreground'}`}>
                      Due ${fmt(outstanding)}{overdue ? ' — overdue' : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-green-600 mt-0.5">Paid in full</p>
                  )}
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="px-5 pb-4 bg-surface-alt/50 border-t border-border/70">
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
                      <table className="stack-table w-full text-sm mb-3 min-w-[420px]">
                        <thead>
                          <tr className="text-xs text-muted-foreground text-left border-b border-border/70">
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
                              <td data-label="Date" className="py-1.5 text-muted-foreground">
                                {new Date(p.received_at).toLocaleDateString('en-GB')}
                              </td>
                              <td data-label="Type" className="py-1.5 text-muted-foreground capitalize">{p.payment_type}</td>
                              <td data-label="Method" className="py-1.5 text-muted-foreground">{p.method ?? '—'}</td>
                              <td data-label="Ref" className="py-1.5 text-muted-foreground text-xs">{p.reference ?? '—'}</td>
                              <td data-label="Amount" className="py-1.5 text-right font-medium text-foreground">
                                ${fmt(Number(p.amount_usd))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mb-3">No payments recorded yet.</p>
                    )}
                    {outstanding > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaying(row.quoteId)}
                        className="text-sm font-medium text-brand-ink hover:text-brand-text border border-primary-strong/30 rounded px-3 py-1.5 hover:bg-accent/60 transition"
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
