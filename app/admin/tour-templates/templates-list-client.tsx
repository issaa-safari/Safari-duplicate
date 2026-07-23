'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import BulkSelectableList from '@/components/admin/bulk-select-list'
import { bulkDeleteQuotes, bulkSetQuoteStatus } from '../quotes/actions'
import ShareTemplateDialog, { type TemplateClient } from './share-template-dialog'

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

export default function TemplatesListClient({
  templates,
  clients,
}: {
  templates: TemplateRow[]
  clients: TemplateClient[]
}) {
  // The template currently being instantiated for a client (opens the dialog).
  const [shareTarget, setShareTarget] = useState<TemplateRow | null>(null)

  return (
    <>
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
          // The card opens the template; the button is a sibling (never nested
          // in the anchor) so it can trigger the "use for a client" dialog.
          <div className="relative">
            <Link href={`/admin/quotes/${t.id}`}
              className="block rounded-xl border border-border bg-surface shadow-sm p-4 pb-14 hover:border-primary-strong hover:shadow-sm transition sm:pb-4">
              <div className="flex items-start justify-between gap-4 sm:pr-40">
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
            <button
              type="button"
              onClick={() => setShareTarget(t)}
              className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-md border border-primary-strong/40 bg-surface px-3 py-1.5 text-xs font-medium text-brand-ink shadow-sm transition hover:bg-accent/60 active:bg-accent"
            >
              <UserPlus size={14} aria-hidden />
              Use for a client
            </button>
          </div>
        )}
      />

      {shareTarget && (
        <ShareTemplateDialog
          templateId={shareTarget.id}
          templateTitle={shareTarget.title}
          clients={clients}
          onClose={() => setShareTarget(null)}
        />
      )}
    </>
  )
}
