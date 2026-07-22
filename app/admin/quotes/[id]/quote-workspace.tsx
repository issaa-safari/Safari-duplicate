'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import QuoteItineraryBuilder from './versions/[versionId]/quote-itinerary-builder'
import VersionEditorForm from './versions/[versionId]/form'
import VersionStatusControls from './versions/[versionId]/version-status-controls'
import TripBuilderForm, { type LookupOption, type AccommodationOption } from '../../trip-builder/trip-builder-form'
import DeliveryPanel from './delivery-panel'
import type { TripBuilderState } from '../../trip-builder/types'

type Step = 'itinerary' | 'pricing' | 'preview' | 'send'

interface VersionRow {
  id: string
  version_number: number
  status: string
  title: string | null
  travel_start_date: string | null
  travel_end_date: string | null
  valid_until: string | null
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
  tripBuilderInitialVersionId,
  deliveries,
  dayCountByVersion,
  baseUrl,
  clientEmail,
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
  tripBuilderInitialVersionId: string | null
  deliveries: any[]
  dayCountByVersion: Record<string, number>
  baseUrl: string
  clientEmail?: string | null
}) {
  const router = useRouter()

  // The workspace stays mounted across soft navigations (e.g. the clone
  // action's redirect only changes searchParams), so plain useState seeds
  // would ignore fresh props. Instead, tab/version selection is *derived*
  // from the props, with a local override that is dropped as soon as the
  // props change — a clone redirect then lands on its version immediately.
  const navKey = `${initialStep}|${initialVersionId}`
  const [manualNav, setManualNav] = useState<{ key: string; step?: Step; versionId?: string }>({ key: navKey })
  const nav = manualNav.key === navKey ? manualNav : { key: navKey }
  const step = nav.step ?? initialStep
  const activeVersionId = nav.versionId ?? initialVersionId
  const setStep = (s: Step) => setManualNav({ ...nav, key: navKey, step: s })
  const setActiveVersionId = (id: string) => setManualNav({ ...nav, key: navKey, versionId: id })

  // Live travel dates per version — from the server load, overridden the
  // moment "Save Dates" succeeds so the Pricing tab (mounted alongside, not
  // remounted) can pick up the new trip window without a page reload.
  const [savedDates, setSavedDates] = useState<Record<string, { start: string; end: string }>>({})
  const versionDates: Record<string, { start: string; end: string }> = {
    ...Object.fromEntries(versions.map(v => [v.id, { start: v.travel_start_date ?? '', end: v.travel_end_date ?? '' }])),
    ...savedDates,
  }
  const pricingDates = tripBuilderInitialVersionId ? versionDates[tripBuilderInitialVersionId] : undefined

  // A successful pricing save moves the version draft → ready server-side;
  // mirror that locally so badges and the share panel update instantly even
  // if the background route refresh is slow (or dropped).
  const [readyVersionIds, setReadyVersionIds] = useState<Set<string>>(new Set())
  const effectiveVersions = versions.map(v =>
    readyVersionIds.has(v.id) && v.status === 'draft' ? { ...v, status: 'ready' } : v)

  // Render an itinerary panel for every version the server loaded data for
  // (latest, all tracked versions, and/or an explicitly requested older one).
  const versionsWithItinerary = effectiveVersions.filter(v => itineraryByVersion[v.id])
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
                  ? 'bg-primary-strong text-white'
                  : 'bg-muted text-muted-foreground hover:bg-gray-200')}>
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
            <span className="text-xs text-muted-foreground">Editing:</span>
            {versionsWithItinerary.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveVersionId(v.id)}
                className={'px-3 py-1 rounded-full text-xs font-medium border ' +
                  (activeVersionId === v.id
                    ? 'bg-accent border-primary-strong text-brand-ink'
                    : 'border-border text-muted-foreground hover:bg-muted')}>
                {`v${v.version_number}`}
              </button>
            ))}
          </div>
        )}

        {versionsWithItinerary.map(v => {
          const data = itineraryByVersion[v.id]
          if (!data) return null
          // Prefer just-saved dates over the server-loaded ones so the trip-date
          // frame and readiness checks update the moment "Save Dates" succeeds,
          // without waiting on a manual page refresh.
          const override = savedDates[v.id]
          const effectiveStart = override ? (override.start || null) : v.travel_start_date
          const effectiveEnd = override ? (override.end || null) : v.travel_end_date
          const effectiveVersion = { ...v, travel_start_date: effectiveStart, travel_end_date: effectiveEnd }
          return (
            <div key={v.id} className={v.id === activeVersionId ? 'space-y-6' : 'hidden'}>
              <VersionStatusControls quoteId={quoteId} versionId={v.id} status={v.status} />
              <VersionEditorForm
                quoteId={quoteId}
                version={v as any}
                travellers={data.travellers}
                ageBands={ageBands}
                quoteRequest={quoteRequest}
                onDatesSaved={(start, end) => setSavedDates(prev => ({ ...prev, [v.id]: { start, end } }))}
              />
              <ReadinessChecklist quoteDays={data.quoteDays} dayItems={data.dayItems} version={effectiveVersion} />
              <QuoteItineraryBuilder
                quoteId={quoteId}
                versionId={v.id}
                travelStartDate={effectiveStart}
                travelEndDate={effectiveEnd}
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
        {/* Keyed by target version so a clone re-seeds the pricing form instead
            of silently editing the previous version. */}
        <TripBuilderForm
          key={tripBuilderInitialVersionId ?? 'new'}
          {...tripBuilderLookups}
          initialQuoteId={quoteId}
          initialVersionId={tripBuilderInitialVersionId}
          initialState={tripBuilderInitialState ?? undefined}
          tripStartDate={pricingDates?.start}
          tripEndDate={pricingDates?.end}
          onDirtyChange={setPricingDirty}
          onSaved={() => {
            // The save action moves draft → ready server-side; mirror that
            // locally, jump to Preview, and refresh the route data.
            if (tripBuilderInitialVersionId) {
              setReadyVersionIds(prev => new Set(prev).add(tripBuilderInitialVersionId))
            }
            setStep('preview')
            router.refresh()
          }}
        />
      </div>

      <div className={step === 'preview' || step === 'send' ? '' : 'hidden'}>
        <DeliveryPanel
          quoteId={quoteId}
          versions={effectiveVersions.map(v => ({ id: v.id, version_number: v.version_number, status: v.status }))}
          deliveries={deliveries}
          dayCountByVersion={dayCountByVersion}
          baseUrl={baseUrl}
          clientEmail={clientEmail}
          onGoToItinerary={() => setStep('itinerary')}
        />
      </div>
    </div>
  )
}

// Calendar days a stop covers — a multi-night stop spans several, a day-only
// stop (day_number_end === day_number, no overnight) spans one.
type QuoteDaySpan = { day_number: number; day_number_end?: number | null }
const spanOf = (d: QuoteDaySpan) =>
  d.day_number_end && d.day_number_end > d.day_number ? d.day_number_end - d.day_number + 1 : 1
const isDayOnly = (d: QuoteDaySpan) => d.day_number_end != null && d.day_number_end === d.day_number

function ReadinessChecklist({
  quoteDays, dayItems, version,
}: {
  quoteDays: any[]
  dayItems: any[]
  version: VersionRow
}) {
  const dayCount = quoteDays.reduce((s: number, d: QuoteDaySpan) => s + spanOf(d), 0)

  const daysMissingAccom = useMemo(() => {
    const dayIdsWithAccom = new Set(
      dayItems.filter((it: any) => it.item_type === 'accommodation').map((it: any) => it.quote_day_id),
    )
    // Day-only stops intentionally have no accommodation — don't flag them.
    return quoteDays.filter((d: any) => !isDayOnly(d) && !dayIdsWithAccom.has(d.id)).length
  }, [quoteDays, dayItems])

  if (quoteDays.length === 0) return null

  const tripDayCount = version.travel_start_date && version.travel_end_date
    ? Math.max(1, Math.round((new Date(version.travel_end_date).getTime() - new Date(version.travel_start_date).getTime()) / 86_400_000) + 1)
    : null

  const items = [
    { ok: true, label: `${dayCount} day${dayCount === 1 ? '' : 's'} added` },
    { ok: !!version.travel_start_date, label: version.travel_start_date ? 'Dates set' : 'No start date set' },
    { ok: daysMissingAccom === 0, label: daysMissingAccom === 0 ? 'Accommodation picked for every day' : `${daysMissingAccom} day${daysMissingAccom === 1 ? '' : 's'} missing accommodation` },
    ...(tripDayCount != null ? [{
      ok: dayCount === tripDayCount,
      label: dayCount === tripDayCount
        ? 'Itinerary matches trip dates'
        : `Itinerary covers ${dayCount} day${dayCount === 1 ? '' : 's'} but the trip dates span ${tripDayCount}`,
    }] : []),
  ]
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((it, i) => (
        <span key={i} className={it.ok ? 'text-brand-ink' : 'text-warning-foreground'}>
          {it.ok ? '✓' : '⚠'} {it.label}
        </span>
      ))}
    </div>
  )
}
