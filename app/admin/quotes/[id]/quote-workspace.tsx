'use client'

import { useEffect, useMemo, useState } from 'react'
import QuoteItineraryBuilder from './versions/[versionId]/quote-itinerary-builder'
import VersionEditorForm from './versions/[versionId]/form'
import VersionStatusControls from './versions/[versionId]/version-status-controls'
import TripBuilderForm, { type LookupOption, type AccommodationOption } from '../../trip-builder/trip-builder-form'
import DeliveryPanel from './delivery-panel'
import type { TrackKey, TripBuilderState } from '../../trip-builder/types'

type Step = 'itinerary' | 'pricing' | 'preview' | 'send'

interface VersionRow {
  id: string
  version_number: number
  status: string
  title: string | null
  travel_start_date: string | null
  travel_end_date: string | null
  valid_until: string | null
  track_label: string | null
  language?: string | null
}

interface ItineraryData {
  travellers: any[]
  quoteDays: any[]
  dayItems: any[]
  isLocked: boolean
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'itinerary', label: 'Itinerary & details' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'preview', label: 'Preview' },
  { key: 'send', label: 'Send' },
]

const TRACK_LABELS: Record<string, string> = { standard: 'Standard', premium: 'Premium' }

export default function QuoteWorkspace({
  quoteId,
  initialStep,
  versions,
  initialVersionId,
  destinations,
  accommodations,
  activities,
  vehicles,
  staff,
  ageBands,
  tourDays,
  quoteRequest,
  itineraryByVersion,
  tripBuilderLookups,
  tripBuilderInitialState,
  tripBuilderInitialVersionIds,
  deliveries,
  baseUrl,
}: {
  quoteId: string
  initialStep: Step
  versions: VersionRow[]
  initialVersionId: string
  destinations: any[]
  accommodations: any[]
  activities: any[]
  vehicles: any[]
  staff: any[]
  ageBands: any[]
  tourDays: any[]
  quoteRequest: { start_date: string | null; duration_days: number | null }
  itineraryByVersion: Record<string, ItineraryData>
  tripBuilderLookups: {
    destinations: LookupOption[]
    accommodations: AccommodationOption[]
    vehicles: LookupOption[]
    parks: LookupOption[]
    usdToKes: number
  }
  tripBuilderInitialState: TripBuilderState | null
  tripBuilderInitialVersionIds: Partial<Record<TrackKey, string | null>>
  deliveries: any[]
  baseUrl: string
}) {
  const [step, setStep] = useState<Step>(initialStep)
  const [activeVersionId, setActiveVersionId] = useState(initialVersionId)

  // Render an itinerary panel for every version the server loaded data for
  // (latest, all tracked versions, and/or an explicitly requested older one).
  const versionsWithItinerary = versions.filter(v => itineraryByVersion[v.id])
  const showVersionPills = versionsWithItinerary.length > 1

  // Dirty flags — one per mounted itinerary builder (keyed by version id) plus pricing.
  const [itineraryDirty, setItineraryDirty] = useState<Record<string, boolean>>({})
  const [pricingDirty, setPricingDirty] = useState(false)
  const anyDirty = pricingDirty || Object.values(itineraryDirty).some(Boolean)

  useEffect(() => {
    if (!anyDirty) return
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [anyDirty])


  return (
    <div>
      {/* Step tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto">
        {STEPS.map((s, i) => (
          <span key={s.key} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setStep(s.key)}
              className={'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ' +
                (step === s.key
                  ? 'bg-[var(--olive)] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
              {i + 1} · {s.label}
            </button>
            {i < STEPS.length - 1 && <span className="text-gray-300 text-xs">→</span>}
          </span>
        ))}
      </div>

      {/* All panels stay mounted (CSS-hidden when inactive) so switching tabs never drops unsaved edits. */}

      <div className={step === 'itinerary' ? '' : 'hidden'}>
        {showVersionPills && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-500">Editing:</span>
            {versionsWithItinerary.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveVersionId(v.id)}
                className={'px-3 py-1 rounded-full text-xs font-medium border ' +
                  (activeVersionId === v.id
                    ? 'bg-[var(--olive)]/10 border-[var(--olive)] text-[var(--olive-dk)]'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                {v.track_label
                  ? `${TRACK_LABELS[v.track_label] ?? v.track_label} (v${v.version_number})`
                  : `v${v.version_number}`}
              </button>
            ))}
          </div>
        )}

        {versionsWithItinerary.map(v => {
          const data = itineraryByVersion[v.id]
          if (!data) return null
          return (
            <div key={v.id} className={v.id === activeVersionId ? 'space-y-6' : 'hidden'}>
              <VersionStatusControls quoteId={quoteId} versionId={v.id} status={v.status} />
              <VersionEditorForm
                quoteId={quoteId}
                version={v as any}
                travellers={data.travellers}
                ageBands={ageBands}
                quoteRequest={quoteRequest}
              />
              <ReadinessChecklist quoteDays={data.quoteDays} dayItems={data.dayItems} version={v} />
              <QuoteItineraryBuilder
                quoteId={quoteId}
                versionId={v.id}
                travelStartDate={v.travel_start_date}
                travelEndDate={v.travel_end_date}
                quoteDays={data.quoteDays}
                dayItems={data.dayItems}
                tourDays={tourDays}
                destinations={destinations}
                accommodations={accommodations}
                activities={activities}
                vehicles={vehicles}
                staff={staff}
                isLocked={data.isLocked}
                language={(v.language as 'en' | 'ar') ?? 'en'}
                onContinueToPricing={() => setStep('pricing')}
                onDirtyChange={dirty => setItineraryDirty(prev => ({ ...prev, [v.id]: dirty }))}
              />
            </div>
          )
        })}
      </div>

      <div className={step === 'pricing' ? '' : 'hidden'}>
        <TripBuilderForm
          {...tripBuilderLookups}
          initialQuoteId={quoteId}
          initialVersionIds={tripBuilderInitialVersionIds}
          initialState={tripBuilderInitialState ?? undefined}
          onDirtyChange={setPricingDirty}
        />
      </div>

      <div className={step === 'preview' || step === 'send' ? '' : 'hidden'}>
        <DeliveryPanel
          quoteId={quoteId}
          versions={versions.map(v => ({ id: v.id, version_number: v.version_number, status: v.status }))}
          deliveries={deliveries}
          baseUrl={baseUrl}
        />
      </div>
    </div>
  )
}

function ReadinessChecklist({
  quoteDays, dayItems, version,
}: {
  quoteDays: any[]
  dayItems: any[]
  version: VersionRow
}) {
  const dayCount = quoteDays.length
  const daysMissingAccom = useMemo(() => {
    const dayIdsWithAccom = new Set(
      dayItems.filter((it: any) => it.item_type === 'accommodation').map((it: any) => it.quote_day_id),
    )
    return quoteDays.filter((d: any) => !dayIdsWithAccom.has(d.id)).length
  }, [quoteDays, dayItems])

  if (dayCount === 0) return null

  const items = [
    { ok: true, label: `${dayCount} day${dayCount === 1 ? '' : 's'} added` },
    { ok: !!version.travel_start_date, label: version.travel_start_date ? 'Dates set' : 'No start date set' },
    { ok: daysMissingAccom === 0, label: daysMissingAccom === 0 ? 'Accommodation picked for every day' : `${daysMissingAccom} day${daysMissingAccom === 1 ? '' : 's'} missing accommodation` },
  ]
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
      {items.map((it, i) => (
        <span key={i} className={it.ok ? 'text-[var(--olive-dk)]' : 'text-amber-600'}>
          {it.ok ? '✓' : '⚠'} {it.label}
        </span>
      ))}
    </div>
  )
}
