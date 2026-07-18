'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ActivitiesModal, { DayActivity } from '@/components/admin/activities-modal'
import CreateLookupDialog from '@/components/admin/create-lookup-dialog'
import { createLookup } from '@/lib/create-lookup'
import { GalleryUpload } from '@/components/admin/image-upload'
import { cloneVersion } from '../../version-actions'

type ContentItem = { id: string; name: string; [key: string]: unknown }

type DayItem = {
  _key: string
  id: string | null
  itemType: 'accommodation' | 'activity' | 'vehicle' | 'staff'
  entityId: string | null
  titleSnapshot: string
  contentSnapshot: Record<string, unknown>
}

type Day = {
  _key: string
  id: string | null
  dayNumber: number
  // Nights at this stop (1 = single day). day_number_end is derived for saving.
  nights: number
  dayNumberEnd: number | null
  dayDate: string
  title: string
  descriptionEn: string
  clientNotes: string
  titleAr: string
  descriptionAr: string
  clientNotesAr: string
  destinationId: string | null
  destinationSnapshot: Record<string, unknown>
  meals: string[]
  photos: string[]
  items: DayItem[]
}

type TourDay = {
  day_number: number
  title_en: string | null
  title_ar: string | null
  description_en: string | null
  destination_id: string | null
  accommodation_id: string | null
  activity_ids: string[] | null
  meal_breakfast: boolean
  meal_lunch: boolean
  meal_dinner: boolean
}

const GRID_COLS = '104px 168px 200px 1fr 128px 40px'

const ITEM_LABELS: Record<string, string> = {
  accommodation: 'Stay', activity: 'Activity', vehicle: 'Vehicle', staff: 'Staff',
}
const ITEM_COLORS: Record<string, string> = {
  accommodation: 'bg-blue-50 text-blue-700',
  activity:      'bg-accent text-brand-ink',
  vehicle:       'bg-amber-50 text-warning-foreground',
  staff:         'bg-purple-50 text-purple-700',
}

const uid = () => Math.random().toString(36).slice(2)

// Walk stops in order, assigning each a start day_number from the running total
// of nights, so a 2-night stop occupies "Day 1-2" and the next stop starts at
// Day 3. dayNumberEnd is null for single-night stops.
function renumberDays(list: Day[]): Day[] {
  let start = 1
  return list.map(d => {
    const nights = Math.max(1, d.nights || 1)
    const dayNumber = start
    const dayNumberEnd = nights > 1 ? dayNumber + nights - 1 : null
    start = dayNumber + nights
    return { ...d, dayNumber, nights, dayNumberEnd }
  })
}

const dayOffsetOf = (it: DayItem) => Number((it.contentSnapshot?.day_offset as any) ?? 0) || 0

// Auto-added road-transfer activities (destination changed vs the previous
// stop). Flagged in the snapshot so they can be deduplicated, kept out of the
// activities modal, and labelled "A to B" in the proposal.
const TRANSFER_TITLE = 'Transfer by Road'
const isTransferItem = (it: DayItem) => it.itemType === 'activity' && !!it.contentSnapshot?.transfer

const inputCls = 'w-full rounded-md border border-border px-2 py-1.5 text-sm text-foreground bg-surface transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring/50'
const smallSelectCls = 'w-full rounded border border-border px-1.5 py-1 text-xs text-muted-foreground bg-surface transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-ring/50'

const MEAL_NAMES: Record<string, string> = { B: 'Breakfast', L: 'Lunch', D: 'Dinner' }

const MealPill = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
  <button type="button" onClick={onClick}
    aria-pressed={on}
    aria-label={MEAL_NAMES[label] ?? label}
    title={MEAL_NAMES[label] ?? label}
    className={'h-7 w-7 rounded-md text-xs font-semibold border transition-colors duration-150 ' +
      (on ? 'bg-primary-strong text-white border-primary-strong' : 'bg-surface text-muted-foreground border-border hover:bg-muted')}>
    {label}
  </button>
)

function fmtFrameDate(d: string | null): string | null {
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return null
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fromTourDays(
  tourDays: TourDay[],
  destinations: ContentItem[],
  accommodations: ContentItem[],
  activities: ContentItem[],
): Day[] {
  return tourDays.map(td => {
    const dest = destinations.find(d => d.id === td.destination_id) ?? null
    const items: DayItem[] = []

    const acc = accommodations.find(a => a.id === td.accommodation_id)
    if (acc) items.push({
      _key: uid(), id: null, itemType: 'accommodation', entityId: acc.id,
      titleSnapshot: acc.name,
      contentSnapshot: { destination_id: acc.destination_id, description_en: acc.description_en ?? null },
    })

    for (const actId of (td.activity_ids ?? [])) {
      const act = activities.find(a => a.id === actId)
      if (act) items.push({
        _key: uid(), id: null, itemType: 'activity', entityId: act.id,
        titleSnapshot: act.name,
        contentSnapshot: { destination_id: act.destination_id, description_en: act.description_en ?? null },
      })
    }

    const meals: string[] = []
    if (td.meal_breakfast) meals.push('breakfast')
    if (td.meal_lunch)     meals.push('lunch')
    if (td.meal_dinner)    meals.push('dinner')

    return {
      _key: uid(), id: null,
      dayNumber: td.day_number,
      nights: 1,
      dayNumberEnd: null,
      dayDate: '',
      title: td.title_en ?? '',
      descriptionEn: td.description_en ?? '',
      clientNotes: '',
      titleAr: td.title_ar ?? '',
      descriptionAr: (td as any).description_ar ?? '',
      clientNotesAr: '',
      destinationId: dest?.id ?? null,
      destinationSnapshot: dest ? { id: dest.id, name: dest.name } : {},
      meals,
      photos: [],
      items,
    }
  })
}

function loadInitialDays(
  quoteDays: any[],
  dayItems: any[],
): Day[] {
  return quoteDays.map(qd => {
    const items: DayItem[] = dayItems
      .filter(i => i.quote_day_id === qd.id)
      .map(i => ({
        _key: uid(),
        id: i.id,
        itemType: i.item_type as DayItem['itemType'],
        entityId: i.accommodation_id ?? i.activity_id ?? i.vehicle_id ?? i.staff_id ?? null,
        titleSnapshot: i.title_snapshot,
        contentSnapshot: i.content_snapshot ?? {},
      }))
    return {
      _key: uid(),
      id: qd.id,
      dayNumber: qd.day_number,
      nights: qd.day_number_end && qd.day_number_end > qd.day_number ? qd.day_number_end - qd.day_number + 1 : 1,
      dayNumberEnd: qd.day_number_end ?? null,
      dayDate: qd.day_date ?? '',
      title: qd.title ?? '',
      descriptionEn: qd.description_en ?? '',
      clientNotes: qd.client_notes ?? '',
      titleAr: qd.title_ar ?? '',
      descriptionAr: qd.description_ar ?? '',
      clientNotesAr: qd.client_notes_ar ?? '',
      destinationId: qd.destination_id ?? null,
      destinationSnapshot: qd.destination_snapshot ?? {},
      meals: qd.meals ?? [],
      photos: qd.photos ?? [],
      items,
    }
  })
}

export default function QuoteItineraryBuilder({
  quoteId,
  versionId,
  travelStartDate,
  travelEndDate,
  quoteDays: initialQuoteDays,
  dayItems: initialDayItems,
  tourDays,
  destinations: destinationsProp,
  accommodations: accommodationsProp,
  activities: activitiesProp,
  vehicles,
  staff,
  isLocked,
  language = 'en',
  onContinueToPricing,
  onDirtyChange,
}: {
  quoteId: string
  versionId: string
  travelStartDate: string | null
  travelEndDate: string | null
  quoteDays: any[]
  dayItems: any[]
  tourDays: any[]
  destinations: ContentItem[]
  accommodations: ContentItem[]
  activities: ContentItem[]
  vehicles: ContentItem[]
  staff: ContentItem[]
  isLocked: boolean
  language?: 'en' | 'ar'
  /** When provided, shows a "Save & Continue to Pricing" button that saves then calls this. */
  onContinueToPricing?: () => void
  /** Reports unsaved-changes state to an embedding parent (e.g. for a navigation guard). */
  onDirtyChange?: (dirty: boolean) => void
}) {
  const router = useRouter()

  // Lookups are held in state so new destinations/accommodations/activities added
  // inline (and saved to the Content library) appear immediately in the dropdowns.
  const [destinations, setDestinations] = useState<ContentItem[]>(destinationsProp)
  const [accommodations, setAccommodations] = useState<ContentItem[]>(accommodationsProp)
  const [activities, setActivities] = useState<ContentItem[]>(activitiesProp)

  const [creating, setCreating] = useState<null | { kind: 'destination' | 'accommodation'; row: number; alt?: boolean }>(null)

  async function createDestinationInline(name: string, en: string, ar: string) {
    const it = await createLookup('destination', name, { descriptionEn: en, descriptionAr: ar })
    setDestinations(p => [...p, it as any].sort((a, b) => (a.name as string).localeCompare(b.name as string)))
    return it
  }
  async function createActivityInline(name: string, en: string, ar: string) {
    const it = await createLookup('activity', name, { descriptionEn: en, descriptionAr: ar })
    setActivities(p => [...p, it as any].sort((a, b) => (a.name as string).localeCompare(b.name as string)))
    return it
  }
  function onDestSelect(i: number, val: string) {
    if (val === '__add__') { setCreating({ kind: 'destination', row: i }); return }
    onDestChange(i, val)
  }
  function onAccomSelect(i: number, val: string, alt: boolean) {
    if (val === '__add__') { setCreating({ kind: 'accommodation', row: i, alt }); return }
    setAccom(i, val, alt)
  }

  const [days, setDays] = useState<Day[]>(() =>
    loadInitialDays(initialQuoteDays, initialDayItems)
  )
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Unsaved-changes tracking for the embedding workspace's navigation guard —
  // low-risk (watches `days` rather than instrumenting every mutation site).
  const isFirstDaysRender = useRef(true)
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    if (isFirstDaysRender.current) { isFirstDaysRender.current = false; return }
    setDirty(true)
  }, [days])
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])
  const [arOpenIndices, setArOpenIndices] = useState<Set<number>>(
    () => language === 'ar'
      ? new Set(initialQuoteDays.map((_: any, i: number) => i))
      : new Set(
          initialQuoteDays
            .map((d: any, i: number) => (d.title_ar || d.description_ar || d.client_notes_ar ? i : -1))
            .filter((i: number) => i >= 0)
        )
  )
  const [genCount, setGenCount] = useState<string>('')
  // Which stop + sub-day (day_offset) the activities modal is editing.
  const [activityModal, setActivityModal] = useState<{ day: number; offset: number } | null>(null)
  const [photoOpenIndices, setPhotoOpenIndices] = useState<Set<number>>(
    () => new Set(initialQuoteDays.map((d: any, i: number) => ((d.photos ?? []).length > 0 ? i : -1)).filter((i: number) => i >= 0))
  )
  // "Add drinks / options" — collapsible notes under the meal plan.
  const [notesOpenIndices, setNotesOpenIndices] = useState<Set<number>>(
    () => new Set(initialQuoteDays.map((d: any, i: number) => (d.client_notes ? i : -1)).filter((i: number) => i >= 0))
  )

  // Bridge the shared ActivitiesModal <-> the quote's activity items.
  function dayActivitiesFor(day: Day): DayActivity[] {
    return day.items
      .filter(it => it.itemType === 'activity' && !isTransferItem(it))
      .map(it => ({
        activity_id: it.entityId ?? '',
        moment: ((it.contentSnapshot?.moment as any) ?? '') as DayActivity['moment'],
        optional: !!it.contentSnapshot?.optional,
        destination_id: (it.contentSnapshot?.destination_id as any) ?? null,
        day_offset: dayOffsetOf(it),
      }))
  }

  // Structured accommodation (primary + optional alternative), like tour templates.
  // Stored as accommodation items; the alternative is flagged in its content snapshot.
  function accomIdFor(day: Day, alt: boolean): string {
    const it = day.items.find(it => it.itemType === 'accommodation' && !!it.contentSnapshot?.alternative === alt)
    return it?.entityId ?? ''
  }
  function setAccom(i: number, accomId: string, alt: boolean) {
    if (isLocked) return
    setDays(prev => prev.map((d, idx) => {
      if (idx !== i) return d
      const others = d.items.filter(it => !(it.itemType === 'accommodation' && !!it.contentSnapshot?.alternative === alt))
      if (!accomId) return { ...d, items: others }
      const acc = accommodations.find(a => a.id === accomId)
      const item: DayItem = {
        _key: uid(), id: null, itemType: 'accommodation', entityId: accomId,
        titleSnapshot: (acc?.name as string) ?? 'Accommodation',
        contentSnapshot: { destination_id: acc?.destination_id ?? null, description_en: acc?.description_en ?? null, alternative: alt },
      }
      return { ...d, items: [...others, item] }
    }))
    setSaved(false)
  }

  // Replace the activity items of one sub-day (day_offset) of a stop; the
  // other sub-days' activities are untouched.
  function applyActivities(i: number, offset: number, rows: DayActivity[]) {
    if (isLocked) return
    setDays(prev => prev.map((d, idx) => {
      if (idx !== i) return d
      // Transfer items are managed from the destination column, not the modal
      // (which would drop their entity-less rows) — always keep them.
      const kept = d.items.filter(it => it.itemType !== 'activity' || isTransferItem(it) || dayOffsetOf(it) !== offset)
      const activityItems: DayItem[] = rows.map(r => {
        const act = activities.find(a => a.id === r.activity_id)
        return {
          _key: uid(), id: null, itemType: 'activity', entityId: r.activity_id,
          titleSnapshot: (act?.name as string) ?? 'Activity',
          contentSnapshot: { moment: r.moment || null, optional: !!r.optional, destination_id: r.destination_id ?? null, day_offset: offset },
        }
      })
      return { ...d, items: [...kept, ...activityItems] }
    }))
    setSaved(false)
  }

  // Calculate trip duration from dates (inclusive)
  const tripDays = travelStartDate && travelEndDate
    ? Math.max(1, Math.round((new Date(travelEndDate).getTime() - new Date(travelStartDate).getTime()) / 86_400_000) + 1)
    : null

  // Countries visited — derived from the chosen destinations' countries.
  const countriesVisited = [...new Set(
    days
      .map(d => (destinations.find(x => x.id === d.destinationId) as any)?.country as string | undefined)
      .filter(Boolean)
  )] as string[]

  // ── Day mutations ───────────────────────────────────────────────────────

  function update(i: number, patch: Partial<Day>) {
    if (isLocked) return
    setDays(prev => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d))
    setSaved(false)
  }

  function addBlankDay() {
    if (isLocked) return
    const newIdx = days.length
    setDays(p => renumberDays([...p, {
      _key: uid(), id: null, dayNumber: p.length + 1, nights: 1, dayNumberEnd: null, dayDate: '', title: '',
      descriptionEn: '', clientNotes: '',
      titleAr: '', descriptionAr: '', clientNotesAr: '',
      destinationId: null, destinationSnapshot: {}, meals: [], photos: [], items: [],
    }]))
    if (language === 'ar') {
      setArOpenIndices(prev => new Set([...prev, newIdx]))
    }
    setSaved(false)
  }

  function generateBlankDays(count: number) {
    if (isLocked) return
    if (count < 1 || count > 60) return
    setDays(renumberDays(Array.from({ length: count }, (_, i) => ({
      _key: uid(), id: null,
      dayNumber: i + 1, nights: 1, dayNumberEnd: null, dayDate: '', title: '',
      descriptionEn: '', clientNotes: '',
      titleAr: '', descriptionAr: '', clientNotesAr: '',
      destinationId: null, destinationSnapshot: {}, meals: [], photos: [], items: [],
    }))))
    if (language === 'ar') {
      setArOpenIndices(new Set(Array.from({ length: count }, (_, i) => i)))
    }
    setSaved(false)
  }

  // Nights at a stop → recompute all day numbers cumulatively.
  function setNights(i: number, nights: number) {
    if (isLocked) return
    const n = Math.max(1, Math.min(30, Math.floor(nights) || 1))
    setDays(prev => renumberDays(prev.map((d, idx) => idx === i ? { ...d, nights: n } : d)))
    setSaved(false)
  }

  function removeDay(i: number) {
    if (isLocked) return
    setDays(p => renumberDays(p.filter((_, idx) => idx !== i)))
    setSaved(false)
  }

  function move(i: number, dir: -1 | 1) {
    if (isLocked) return
    const t = i + dir
    if (t < 0 || t >= days.length) return
    setDays(prev => {
      const n = [...prev]
      ;[n[i], n[t]] = [n[t], n[i]]
      return renumberDays(n)
    })
    setSaved(false)
  }

  function renumber() {
    if (isLocked) return
    setDays(p => renumberDays(p))
    setSaved(false)
  }

  function autoComputeDates() {
    if (isLocked) return
    if (!travelStartDate) return
    const start = new Date(travelStartDate)
    setDays(p => p.map(d => {
      const date = new Date(start)
      date.setDate(date.getDate() + d.dayNumber - 1)
      return { ...d, dayDate: date.toISOString().split('T')[0] }
    }))
    setSaved(false)
  }

  function prefillFromTour() {
    if (isLocked) return
    const mapped = fromTourDays(tourDays, destinations, accommodations, activities)
    setDays(mapped)
    if (language === 'ar') {
      setArOpenIndices(new Set(mapped.map((_: Day, i: number) => i)))
    }
    setSaved(false)
  }

  // ── Destination change ──────────────────────────────────────────────────

  function onDestChange(i: number, destId: string) {
    const dest = destinations.find(d => d.id === destId) ?? null
    const patch: Partial<Day> = {
      destinationId: destId || null,
      destinationSnapshot: dest ? { id: dest.id, name: dest.name } : {},
    }
    // A stop whose destination differs from the previous stop's is a travel
    // day — auto-add an editable "Transfer by Road" activity (never on the
    // first stop, never twice). Reverting to the previous stop's destination
    // removes the auto-added item again.
    if (!isLocked && i > 0 && days[i]) {
      const prevDestId = days[i - 1]?.destinationId ?? null
      const isTravelDay = !!destId && !!prevDestId && destId !== prevDestId
      const hasTransfer = days[i].items.some(isTransferItem)
      if (isTravelDay && !hasTransfer) {
        patch.items = [{
          _key: uid(), id: null, itemType: 'activity', entityId: null,
          titleSnapshot: TRANSFER_TITLE,
          contentSnapshot: { destination_id: destId, transfer: true, day_offset: 0 },
        }, ...days[i].items]
      } else if (!isTravelDay && hasTransfer) {
        patch.items = days[i].items.filter(it => !isTransferItem(it))
      } else if (isTravelDay && hasTransfer) {
        // Keep the transfer but point its location at the new destination.
        patch.items = days[i].items.map(it => isTransferItem(it)
          ? { ...it, contentSnapshot: { ...it.contentSnapshot, destination_id: destId } }
          : it)
      }
    }
    update(i, patch)
  }

  // ── Item mutations ──────────────────────────────────────────────────────

  function addItem(
    dayIdx: number,
    itemType: DayItem['itemType'],
    entityId: string,
    list: ContentItem[],
  ) {
    if (!entityId) return
    const entity = list.find(e => e.id === entityId)
    if (!entity) return

    let contentSnapshot: Record<string, unknown> = {}
    if (itemType === 'accommodation' || itemType === 'activity') {
      contentSnapshot = {
        destination_id: entity.destination_id ?? null,
        description_en: entity.description_en ?? null,
      }
    } else if (itemType === 'vehicle') {
      contentSnapshot = { type: entity.type, seats: entity.seats }
    } else if (itemType === 'staff') {
      contentSnapshot = { role: entity.role }
    }

    const newItem: DayItem = {
      _key: uid(), id: null, itemType, entityId,
      titleSnapshot: entity.name as string,
      contentSnapshot,
    }
    update(dayIdx, { items: [...days[dayIdx].items, newItem] })
  }

  function removeItem(dayIdx: number, itemKey: string) {
    update(dayIdx, { items: days[dayIdx].items.filter(it => it._key !== itemKey) })
  }

  // ── Save ────────────────────────────────────────────────────────────────

  async function save(): Promise<boolean> {
    if (isLocked) {
      setError('This quote version has been sent and is locked — create a new version to edit the itinerary.')
      return false
    }
    setLoading(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/admin/save-quote-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId, quoteId, days }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      setSaved(true)
      setDirty(false)
      router.refresh()
      return true
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save itinerary.')
      return false
    } finally {
      setLoading(false)
    }
  }

  async function saveAndContinue() {
    const ok = await save()
    if (ok) onContinueToPricing?.()
  }

  // Sent/locked versions can't be edited — offer a one-click editable copy
  // (the same clone action used in the versions sidebar).
  const lockedBanner = isLocked ? (
    <div role="alert"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warning-foreground">
      <span className="flex-1 min-w-[16rem]">
        This version has been <strong>sent to the client and is locked</strong> — the itinerary can no longer
        be changed. Create a new version to edit and re-send it.
      </span>
      <form action={cloneVersion}>
        <input type="hidden" name="versionId" value={versionId} />
        <input type="hidden" name="quoteId" value={quoteId} />
        <button type="submit"
          className="rounded-md bg-primary-strong px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors duration-150 hover:bg-primary-strong-hover">
          Create new editable version
        </button>
      </form>
    </div>
  ) : null

  // ── Empty state ─────────────────────────────────────────────────────────

  if (days.length === 0) {
    return (
      <div className="space-y-4">
        {lockedBanner}
        <section className="rounded-xl border border-border bg-surface shadow-sm p-8 text-center">
          <p className="text-sm text-muted-foreground mb-5">No itinerary days yet.</p>
          <div className="flex flex-col items-center gap-3">
            {tourDays.length > 0 && !isLocked && (
              <button
                type="button"
                onClick={prefillFromTour}
                className="rounded-md px-4 py-2 text-sm font-medium text-white bg-olive hover:bg-olive-dk"
              >
                Pre-fill from tour template ({tourDays.length} days)
              </button>
            )}
            {tripDays && !isLocked && (
              <button
                type="button"
                onClick={() => generateBlankDays(tripDays)}
                className="rounded-md px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--gold)' }}
              >
                Generate {tripDays} blank days (from trip dates)
              </button>
            )}
            {!isLocked && (
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={60}
                  placeholder="Days"
                  value={genCount}
                  onChange={e => setGenCount(e.target.value)}
                  className="w-20 rounded-md border border-border px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
                <button
                  type="button"
                  onClick={() => { const n = parseInt(genCount); if (n > 0) generateBlankDays(n) }}
                  disabled={!genCount || parseInt(genCount) < 1}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40"
                >
                  Generate blank days
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    )
  }

  // ── Day-by-day program table ────────────────────────────────────────────

  const firstDestName = days[0]
    ? ((days[0].destinationSnapshot as any)?.name
        ?? destinations.find(d => d.id === days[0].destinationId)?.name
        ?? null)
    : null
  const startLabel = fmtFrameDate(travelStartDate)
  const endLabel = fmtFrameDate(travelEndDate)

  return (
    <div className="space-y-4">
      {lockedBanner}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {tourDays.length > 0 && !isLocked && (
          <button type="button" onClick={prefillFromTour}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
            Re-fill from template ({tourDays.length} days)
          </button>
        )}
        {travelStartDate && !isLocked && (
          <button type="button" onClick={autoComputeDates}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
            Auto-set dates
          </button>
        )}
        {!isLocked && (
          <button type="button" onClick={renumber}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
            Renumber
          </button>
        )}
      </div>

      {/* Program header + countries visited */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Create Day by Day Program</h3>
        <p className="text-xs text-muted-foreground">
          Countries visited:{' '}
          <span className="font-medium text-foreground">
            {countriesVisited.length > 0 ? countriesVisited.join(', ') : '—'}
          </span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="stack-grid-wrap rounded-xl border border-border bg-surface shadow-sm overflow-hidden"
          style={{ minWidth: 980 }}>

          {/* Header */}
          <div className="stack-grid-header grid gap-3 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b border-border"
            style={{ gridTemplateColumns: GRID_COLS }}>
            <div>Days</div>
            <div>Main Destination</div>
            <div>Accommodation</div>
            <div>Activities</div>
            <div>Meal Plan</div>
            <div />
          </div>

          {/* Arrival framing row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 bg-accent/40 px-3 py-2 text-xs border-b border-border">
            <span className="font-semibold text-brand-ink">Arrival &amp; start of tour</span>
            {startLabel && <span className="text-muted-foreground">· {startLabel}</span>}
            {firstDestName && <span className="text-muted-foreground">· {firstDestName}</span>}
          </div>

          {/* Stop rows — one row per stop; a stop can span several nights. */}
          {days.map((day, i) => (
            <div key={day._key}
              className="stack-grid grid gap-3 p-3 items-start border-b border-border/70"
              style={{ gridTemplateColumns: GRID_COLS }}>

              {/* Days — auto range from the running nights total */}
              <div data-label="Days" className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">
                  Day {day.dayNumber}{day.dayNumberEnd ? `–${day.dayNumberEnd}` : ''}
                </p>
                <input type="date" value={day.dayDate}
                  onChange={e => { update(i, { dayDate: e.target.value }); setSaved(false) }}
                  aria-label={`Date of day ${day.dayNumber}`}
                  className={inputCls} disabled={isLocked} />
              </div>

              {/* Destination */}
              <div data-label="Main Destination">
                <select value={day.destinationId ?? ''}
                  onChange={e => onDestSelect(i, e.target.value)}
                  aria-label={`Main destination of day ${day.dayNumber}`}
                  className={inputCls} disabled={isLocked}>
                  <option value="">— none —</option>
                  {destinations.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                  <option value="__add__">+ Add new destination…</option>
                </select>
              </div>

              {/* Accommodation (primary + nights + optional alternative) */}
              <div data-label="Accommodation" className="space-y-1.5">
                <select value={accomIdFor(day, false)}
                  onChange={e => onAccomSelect(i, e.target.value, false)}
                  aria-label={`Accommodation for day ${day.dayNumber}`}
                  className={inputCls} disabled={isLocked}>
                  <option value="">— none —</option>
                  {accommodations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  <option value="__add__">+ Add new accommodation…</option>
                </select>
                <select value={day.nights}
                  onChange={e => setNights(i, Number(e.target.value))}
                  aria-label={`Nights at day ${day.dayNumber}`}
                  className={smallSelectCls} disabled={isLocked}>
                  {Array.from({ length: 21 }, (_, k) => k + 1).map(n => (
                    <option key={n} value={n}>{n} night{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
                <div>
                  <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Alternative</span>
                  <select value={accomIdFor(day, true)}
                    onChange={e => onAccomSelect(i, e.target.value, true)}
                    aria-label={`Alternative accommodation for day ${day.dayNumber}`}
                    className={inputCls + ' text-muted-foreground'} disabled={isLocked}>
                    <option value="">+ Alternative…</option>
                    {accommodations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    <option value="__add__">+ Add new accommodation…</option>
                  </select>
                </div>
              </div>

              {/* Activities — one block per sub-day of the stop */}
              <div data-label="Activities" className="space-y-1.5">
                {day.items.filter(isTransferItem).map(item => (
                  <span key={item._key}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-warning-foreground border border-amber-200">
                    <span aria-hidden="true">🚙</span>
                    {item.titleSnapshot}
                    {i > 0 && (() => {
                      const from = (days[i - 1]?.destinationSnapshot as any)?.name
                        ?? destinations.find(d => d.id === days[i - 1]?.destinationId)?.name
                      const to = (day.destinationSnapshot as any)?.name
                        ?? destinations.find(d => d.id === day.destinationId)?.name
                      return from && to ? <span className="opacity-60">· {from as string} → {to as string}</span> : null
                    })()}
                    {!isLocked && (
                      <button onClick={() => removeItem(i, item._key)}
                        aria-label="Remove transfer"
                        className="ml-0.5 opacity-50 hover:opacity-100">×</button>
                    )}
                  </span>
                ))}
                {Array.from({ length: day.nights }, (_, k) => {
                  const subDayNumber = day.dayNumber + k
                  const acts = day.items.filter(it => it.itemType === 'activity' && !isTransferItem(it) && dayOffsetOf(it) === k)
                  return (
                    <div key={k} className={day.nights > 1 ? 'rounded-md border border-border/60 p-1.5 space-y-1' : 'space-y-1'}>
                      {acts.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {acts.map(item => (
                            <span key={item._key} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-accent text-brand-ink">
                              {item.titleSnapshot}
                              {(item.contentSnapshot?.moment as string) ? <span className="opacity-60">· {item.contentSnapshot.moment as string}</span> : null}
                              {item.contentSnapshot?.optional ? <span className="text-warning-foreground">· opt</span> : null}
                            </span>
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={() => setActivityModal({ day: i, offset: k })} disabled={isLocked}
                        className="w-full rounded-md border border-dashed border-primary-strong text-brand-ink px-2 py-1 text-xs font-medium hover:bg-accent/60 disabled:opacity-50">
                        {acts.length > 0 ? 'Edit' : '+ Add'} Activities{day.nights > 1 ? ` – Day ${subDayNumber}` : ''}{acts.length > 0 ? ` (${acts.length})` : ''}
                      </button>
                    </div>
                  )
                })}

                <input type="text" value={day.title}
                  onChange={e => update(i, { title: e.target.value })}
                  placeholder="Day title (English)"
                  className={inputCls} disabled={isLocked} />
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Day description is pulled from the destination in the Content library (EN/AR by client language).
                </p>

                <button type="button"
                  aria-expanded={arOpenIndices.has(i)}
                  onClick={() => setArOpenIndices(prev => {
                    const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next
                  })}
                  className="text-[11px] font-medium text-muted-foreground transition-colors duration-150 hover:text-brand-ink">
                  {arOpenIndices.has(i) ? 'Hide Arabic' : '+ Arabic'}
                </button>
                {arOpenIndices.has(i) && (
                  <div className="mt-1 space-y-1.5 border-t border-border/70 pt-1" dir="rtl">
                    <input type="text" value={day.titleAr}
                      onChange={e => update(i, { titleAr: e.target.value })}
                      placeholder="عنوان اليوم" className={inputCls + ' text-right'} disabled={isLocked} />
                    <textarea value={day.clientNotesAr}
                      onChange={e => update(i, { clientNotesAr: e.target.value })}
                      placeholder="ملاحظات (اختياري)" rows={2}
                      className={inputCls + ' resize-none text-right'} disabled={isLocked} />
                  </div>
                )}

                {!isLocked && (
                  <button type="button"
                    aria-expanded={photoOpenIndices.has(i)}
                    onClick={() => setPhotoOpenIndices(prev => {
                      const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next
                    })}
                    className="text-[11px] font-medium text-muted-foreground transition-colors duration-150 hover:text-brand-ink">
                    {photoOpenIndices.has(i) ? 'Hide Photos' : `+ Photos${day.photos.length ? ` (${day.photos.length})` : ''}`}
                  </button>
                )}
                {photoOpenIndices.has(i) && (
                  <div className="mt-1 pt-1 border-t border-border/70">
                    <GalleryUpload
                      value={day.photos}
                      onChange={photos => update(i, { photos })}
                      folder={`quote-days/${day.id ?? day._key}`}
                    />
                  </div>
                )}

                {/* Extras: Vehicle & Staff */}
                {(day.items.some(it => it.itemType === 'vehicle' || it.itemType === 'staff')) && (
                  <div className="flex flex-wrap gap-1">
                    {day.items.filter(it => it.itemType === 'vehicle' || it.itemType === 'staff').map(item => (
                      <span key={item._key}
                        className={'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ' + (ITEM_COLORS[item.itemType] ?? 'bg-muted text-muted-foreground')}>
                        <span className="text-[10px] opacity-60">{ITEM_LABELS[item.itemType]}</span>
                        {item.titleSnapshot}
                        {!isLocked && <button onClick={() => removeItem(i, item._key)} className="ml-0.5 opacity-50 hover:opacity-100">×</button>}
                      </span>
                    ))}
                  </div>
                )}
                {!isLocked && (
                  <div className="flex gap-1">
                    <select value="" className={smallSelectCls}
                      onChange={e => { addItem(i, 'vehicle', e.target.value, vehicles); (e.target as HTMLSelectElement).value = '' }}>
                      <option value="">+ Vehicle…</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}{v.type ? ` (${v.type})` : ''}</option>)}
                    </select>
                    <select value="" className={smallSelectCls}
                      onChange={e => { addItem(i, 'staff', e.target.value, staff); (e.target as HTMLSelectElement).value = '' }}>
                      <option value="">+ Staff…</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name}{s.role ? ` · ${s.role}` : ''}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Meal Plan + drinks/options notes */}
              <div data-label="Meal Plan" className="space-y-1.5 pt-1">
                <div className="flex gap-1">
                  <MealPill on={day.meals.includes('breakfast')} label="B"
                    onClick={() => !isLocked && update(i, {
                      meals: day.meals.includes('breakfast')
                        ? day.meals.filter(m => m !== 'breakfast')
                        : [...day.meals, 'breakfast'],
                    })} />
                  <MealPill on={day.meals.includes('lunch')} label="L"
                    onClick={() => !isLocked && update(i, {
                      meals: day.meals.includes('lunch')
                        ? day.meals.filter(m => m !== 'lunch')
                        : [...day.meals, 'lunch'],
                    })} />
                  <MealPill on={day.meals.includes('dinner')} label="D"
                    onClick={() => !isLocked && update(i, {
                      meals: day.meals.includes('dinner')
                        ? day.meals.filter(m => m !== 'dinner')
                        : [...day.meals, 'dinner'],
                    })} />
                </div>
                <button type="button"
                  aria-expanded={notesOpenIndices.has(i)}
                  onClick={() => setNotesOpenIndices(prev => {
                    const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next
                  })}
                  className="text-[11px] font-medium text-muted-foreground transition-colors duration-150 hover:text-brand-ink">
                  {notesOpenIndices.has(i) ? 'Hide drinks / options' : '+ Add drinks / options'}
                </button>
                {notesOpenIndices.has(i) && (
                  <textarea value={day.clientNotes}
                    onChange={e => update(i, { clientNotes: e.target.value })}
                    placeholder="Drinks, options & notes shown to the client" rows={3}
                    className={inputCls + ' resize-none'} disabled={isLocked} />
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-col max-sm:flex-row max-sm:justify-end items-center gap-1 pt-0.5">
                {!isLocked && (
                  <>
                    <button onClick={() => move(i, -1)} disabled={i === 0}
                      aria-label={`Move day ${day.dayNumber} up`}
                      className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted disabled:opacity-30">↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === days.length - 1}
                      aria-label={`Move day ${day.dayNumber} down`}
                      className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted disabled:opacity-30">↓</button>
                    <button onClick={() => removeDay(i)}
                      aria-label={`Remove day ${day.dayNumber}`}
                      className="rounded px-1.5 py-0.5 text-xs text-destructive transition-colors duration-150 hover:bg-destructive/10">✕</button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Departure framing row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 bg-accent/40 px-3 py-2 text-xs">
            <span className="font-semibold text-brand-ink">End of tour &amp; departure</span>
            {endLabel && <span className="text-muted-foreground">· {endLabel}</span>}
          </div>
        </div>
      </div>

      {/* Footer controls */}
      {!isLocked && (
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={addBlankDay}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            + Add Day
          </button>
        </div>
      )}

      {activityModal !== null && days[activityModal.day] && (() => {
        const d = days[activityModal.day]
        const offset = activityModal.offset
        return (
          <ActivitiesModal
            dayLabel={`Day ${d.dayNumber + offset}`}
            value={dayActivitiesFor(d).filter(a => (a.day_offset ?? 0) === offset)}
            activities={activities as any}
            destinations={destinations as any}
            dayDestinationId={d.destinationId}
            newRowDayOffset={offset}
            onChange={(rows) => applyActivities(activityModal.day, offset, rows)}
            onClose={() => setActivityModal(null)}
            onCreateActivity={createActivityInline as any}
            onCreateDestination={createDestinationInline as any}
          />
        )
      })()}

      {creating && (
        <CreateLookupDialog
          title={creating.kind === 'destination' ? 'New Destination' : 'New Accommodation'}
          onClose={() => setCreating(null)}
          onSubmit={async (name, en, ar) => {
            if (creating.kind === 'destination') {
              const it = await createDestinationInline(name, en, ar)
              onDestChange(creating.row, it.id)
            } else {
              const it = await createLookup('accommodation', name, { descriptionEn: en, descriptionAr: ar })
              setAccommodations(p => [...p, it as any].sort((a, b) => (a.name as string).localeCompare(b.name as string)))
              setAccom(creating.row, it.id, !!creating.alt)
            }
          }}
        />
      )}

      {error && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {saved && <p role="status" className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">Itinerary saved.</p>}

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-2 border-t border-border bg-surface/95 px-1 py-3 backdrop-blur">
        <button type="button" onClick={() => save()} disabled={loading || isLocked}
          title={isLocked ? 'This version is locked — create a new version to edit.' : undefined}
          className="rounded-md bg-primary-strong px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-primary-strong-hover disabled:opacity-60">
          {loading ? 'Saving…' : 'Save Itinerary'}
        </button>
        {onContinueToPricing && (
          <button type="button" onClick={saveAndContinue} disabled={loading || isLocked}
            title={isLocked ? 'This version is locked — create a new version to edit.' : undefined}
            className="rounded-md border border-primary-strong bg-surface px-6 py-2.5 text-sm font-medium text-brand-ink shadow-sm transition-colors duration-150 hover:bg-accent/60 disabled:opacity-60">
            Save &amp; Continue to Pricing →
          </button>
        )}
        {isLocked ? (
          <span className="text-xs text-muted-foreground" role="status">
            Version locked (sent to client) — saving is disabled.
          </span>
        ) : dirty && !loading ? (
          <span className="text-xs text-warning-foreground" role="status">Unsaved changes</span>
        ) : null}
      </div>
    </div>
  )
}
