'use client'

import Link from 'next/link'
import StatusBadge from '@/components/admin/status-badge'
import BulkSelectableList from '@/components/admin/bulk-select-list'
import { bulkDeleteQuotes, bulkSetQuoteStatus } from './actions'

export interface QuoteRow {
  id: string
  quoteNumber: string
  status: string
  mode: string
  createdAt: string
  clientName: string
  clientEmail: string | null
  versionCount: number
  latestVersionNumber: number | null
  travelStartDate: string | null
  travelEndDate: string | null
  sharingPricePerPerson: number | null
}

// Same statuses the single-quote version status control allows moving to.
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'sent', label: 'Sent' },
]

export default function QuotesListClient({ quotes }: { quotes: QuoteRow[] }) {
  return (
    <BulkSelectableList
      items={quotes}
      getId={q => q.id}
      statusOptions={STATUS_OPTIONS}
      onSetStatus={(ids, status) => bulkSetQuoteStatus(ids, status)}
      onDelete={ids => bulkDeleteQuotes(ids)}
      deleteConfirm={count =>
        `Delete ${count} quote${count === 1 ? '' : 's'}? This permanently removes the itinerary, pricing, and delivery history. This cannot be undone.`
      }
      renderItem={q => (
        <Link
          href={`/admin/quotes/${q.id}`}
          className="block rounded-xl border border-border bg-surface p-4 shadow-sm transition-all duration-150 hover:border-ring/50 hover:shadow"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-mono text-muted-foreground">{q.quoteNumber}</span>
                <StatusBadge status={q.status} />
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                  {q.mode === 'fixed_departure' ? 'Fixed Departure' : 'Custom Safari'}
                </span>
                {q.versionCount > 1 && (
                  <span className="text-xs text-muted-foreground">v{q.latestVersionNumber}</span>
                )}
              </div>
              <p className="font-medium text-foreground">{q.clientName}</p>
              {q.clientEmail && (
                <p className="text-sm text-muted-foreground">{q.clientEmail}</p>
              )}
              {q.travelStartDate && (
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(q.travelStartDate).toLocaleDateString('en-GB')}
                  {q.travelEndDate && (
                    <> → {new Date(q.travelEndDate).toLocaleDateString('en-GB')}</>
                  )}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-muted-foreground shrink-0">
              {q.sharingPricePerPerson ? (
                <p className="text-base font-semibold text-foreground">
                  ${Number(q.sharingPricePerPerson).toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground"> /pp</span>
                </p>
              ) : null}
              <p className="mt-1">{new Date(q.createdAt).toLocaleDateString('en-GB')}</p>
            </div>
          </div>
        </Link>
      )}
    />
  )
}
