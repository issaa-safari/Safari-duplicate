'use client'

import Link from 'next/link'
import BulkSelectableList from '@/components/admin/bulk-select-list'
import { bulkDeleteQuotes, bulkSetQuoteStatus } from '../quotes/actions'

export interface TemplateRow {
  id: string
  quoteNumber: string
  title: string
  travelStartDate: string | null
  travelEndDate: string | null
  totalSellingUsd: number | null
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'sent', label: 'Sent' },
]

export default function TemplatesListClient({ templates }: { templates: TemplateRow[] }) {
  return (
    <BulkSelectableList
      items={templates}
      getId={t => t.id}
      statusOptions={STATUS_OPTIONS}
      onSetStatus={(ids, status) => bulkSetQuoteStatus(ids, status)}
      onDelete={ids => bulkDeleteQuotes(ids)}
      deleteConfirm={count =>
        `Delete ${count} template${count === 1 ? '' : 's'}? This permanently removes the underlying quote (itinerary + pricing). This cannot be undone.`
      }
      renderItem={t => (
        <Link href={`/admin/quotes/${t.id}`}
          className="block rounded-xl border border-border bg-surface shadow-sm p-4 hover:border-primary-strong hover:shadow-sm transition">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-accent text-brand-ink px-2 py-0.5 rounded-full font-medium">Template</span>
                <span className="text-xs text-muted-foreground font-mono">{t.quoteNumber}</span>
              </div>
              <p className="font-medium text-foreground">{t.title || 'Untitled template'}</p>
              {t.travelStartDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sample dates: {new Date(t.travelStartDate).toLocaleDateString('en-GB')}
                  {t.travelEndDate ? ` – ${new Date(t.travelEndDate).toLocaleDateString('en-GB')}` : ''}
                </p>
              )}
            </div>
            {t.totalSellingUsd != null && (
              <span className="text-sm font-semibold text-foreground shrink-0">
                ${Number(t.totalSellingUsd).toLocaleString()}
              </span>
            )}
          </div>
        </Link>
      )}
    />
  )
}
