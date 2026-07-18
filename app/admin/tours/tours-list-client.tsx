'use client'

import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button'
import BulkSelectableList from '@/components/admin/bulk-select-list'
import { bulkDeleteTours, bulkSetTourStatus } from './actions'

export interface TourRow {
  id: string
  type: string
  status: string
  titleEn: string
  durationDays: number | null
  durationNights: number | null
  countriesVisited: string | null
  startDestination: string | null
  endDestination: string | null
}

const TYPE_LABEL: Record<string, string> = {
  bike: 'Bike Tour',
  private: 'Private Safari',
  group: 'Group Safari',
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

export default function ToursListClient({ tours }: { tours: TourRow[] }) {
  return (
    <BulkSelectableList
      items={tours}
      getId={t => t.id}
      gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      statusOptions={STATUS_OPTIONS}
      onSetStatus={(ids, status) => bulkSetTourStatus(ids, status)}
      onDelete={ids => bulkDeleteTours(ids)}
      deleteConfirm={count =>
        `Delete ${count} tour${count === 1 ? '' : 's'}? Tours with customer bookings are skipped automatically. This cannot be undone.`
      }
      renderItem={tour => (
        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden hover:border-primary-strong hover:shadow-sm transition flex flex-col">
          {/* Card image / colour band */}
          <div className="h-28 bg-gradient-to-br from-[var(--olive-dk)] to-[var(--olive)] relative flex items-start justify-between p-3">
            <span className="text-xs font-medium bg-surface/20 text-white px-2 py-0.5 rounded-full">
              {TYPE_LABEL[tour.type] ?? tour.type}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                tour.status === 'active' ? 'bg-green-500 text-white' :
                tour.status === 'draft'  ? 'bg-amber-400 text-white' :
                'bg-gray-400 text-white'
              }`}>
                {tour.status.charAt(0).toUpperCase() + tour.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Card body */}
          <div className="p-4 flex flex-col flex-1">
            <h2 className="font-semibold text-foreground text-sm leading-snug mb-3">
              {tour.titleEn}
            </h2>

            <div className="space-y-1.5 text-xs text-muted-foreground flex-1">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-32 shrink-0">Tour Type</span>
                <span className="text-foreground capitalize">{TYPE_LABEL[tour.type] ?? tour.type}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-32 shrink-0">Tour Length</span>
                <span className="text-foreground">
                  {tour.durationDays} Days / {tour.durationNights} Nights
                </span>
              </div>
              {tour.countriesVisited && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-32 shrink-0">Countries Visited</span>
                  <span className="text-foreground">{tour.countriesVisited}</span>
                </div>
              )}
              {tour.startDestination && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-32 shrink-0">Start Destination</span>
                  <span className="text-foreground">{tour.startDestination}</span>
                </div>
              )}
              {tour.endDestination && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-32 shrink-0">End Destination</span>
                  <span className="text-foreground">{tour.endDestination}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2">
              <ButtonLink href={`/admin/tours/${tour.id}`} size="sm" className="flex-1 text-center">Edit Tour</ButtonLink>
              <Link href={`/admin/tours/${tour.id}/days`}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
                Share Tour
              </Link>
            </div>
          </div>
        </div>
      )}
    />
  )
}
