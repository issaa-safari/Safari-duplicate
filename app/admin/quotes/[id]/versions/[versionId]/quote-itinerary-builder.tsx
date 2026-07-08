'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ActivitiesModal, { DayActivity } from '@/components/admin/activities-modal'
import CreateLookupDialog from '@/components/admin/create-lookup-dialog'
import { createLookup } from '@/lib/create-lookup'
import { GalleryUpload } from '@/components/admin/image-upload'

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

const GRID_COLS = '84px 150px 160px 1fr 76px 40px'

const ITEM_LABELS: Record<string, string> = {
  accommodation: 'Stay', activity: 'Activity', vehicle: 'Vehicle', staff: 'Staff',
}
const ITEM_COLORS: Record<string, string> = {
  accommodation: 'bg-blue-50 text-blue-700',
  activity:      'bg-[var(--olive)]/10 text-[var(--olive-dk)]',
  vehicle:       'bg-amber-50 text-amber-700',
  staff:         'bg-purple-50 text-purple-700',
}

const uid = () => Math.random().toString(36).slice(2)

const inputCls = 'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'
const smallSelectCls = 'w-full rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-[var(--olive)]'

const MealPill = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
  <button type="button" onClick={onClick}
    className={'h-7 w-7 rounded-md text-xs font-semibold border transition ' +
      (on ? 'bg-[var(--olive)] text-white border-[var(--olive)]' : 'bg-white text-gray-400 border-gray-300')}>
    {label}
  </button>
)

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
  const [activityModal, setActivityModal] = useState<number | null>(null)
  const [photoOpenIndices, setPhotoOpenIndices] = useState<Set<number>>(
    () => new Set(initialQuoteDays.map((d: any, i: number) => ((d.photos ?? []).length > 0 ? i : -1)).filter((i: number) => i >= 0))
  )

  // Bridge the shared ActivitiesModal <-> the quote's activity items.
  function dayActivitiesFor(day: Day): DayActivity[] {
    return day.items
      .filter(it => it.itemType === 'activity')
      .map(it => ({
        activity_id: it.entityId ?? '',
        moment: ((it.contentSnapshot?.moment as any) ?? '') as DayActivity['moment'],
        optional: !!it.contentSnapshot?.optional,
        destination_id: (it.contentSnapshot?.destination_id as any) ?? null,
      }))
  }

  // Structured accommodation (primary + optional alternative), like tour templates.
  // Stored as accommodation items; the alternative is flagged in its content snapshot.
  function accomIdFor(day: Day, alt: boolean): string {
    const it = day.items.find(it => it.itemType === 'accommodation' && !!it.contentSnapshot?.alternative === alt)
    return it?.entityId ?? ''
  }
  function setAccom(i: number, accomId: string, alt: boolean) {
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

  function applyActivities(i: number, rows: DayActivity[]) {
    setDays(prev => prev.map((d, idx) => {
      if (idx !== i) return d
      const nonActivity = d.items.filter(it => it.itemType !== 'activity')
      const activityItems: DayItem[] = rows.map(r => {
        const act = activities.find(a => a.id === r.activity_id)
        return {
          _key: uid(), id: null, itemType: 'activity', entityId: r.activity_id,
          titleSnapshot: (act?.name as string) ?? 'Activity',
          contentSnapshot: { moment: r.moment || null, optional: !!r.optional, destination_id: r.destination_id ?? null },
        }
      })
      return { ...d, items: [...nonActivity, ...activityItems] }
    }))
    setSaved(false)
  }

  // Calculate trip duration from dates (inclusive)
  const tripDays = travelStartDate && travelEndDate
    ? Math.max(1, Math.round((new Date(travelEndDate).getTime() - new Date(travelStartDate).getTime()) / 86_400_000) + 1)
    : null

  // ── Day mutations ───────────────────────────────────────────────────────

  function update(i: number, patch: Partial<Day>) {
    setDays(prev => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d))
    setSaved(false)
  }

  function addBlankDay() {
    const next = days.length
      ? Math.max(...days.map(d => d.dayNumber)) + 1
      : 1
    const newIdx = days.length
    setDays(p => [...p, {
      _key: uid(), id: null, dayNumber: next, dayDate: '', title: '',
      descriptionEn: '', clientNotes: '',
      titleAr: '', descriptionAr: '', clientNotesAr: '',
      destinationId: null, destinationSnapshot: {}, meals: [], photos: [], items: [],
    }])
    if (language === 'ar') {
      setArOpenIndices(prev => new Set([...prev, newIdx]))
    }
    setSaved(false)
  }

  function generateBlankDays(count: number) {
    if (count < 1 || count > 60) return
    setDays(Array.from({ length: count }, (_, i) => ({
      _key: uid(), id: null,
      dayNumber: i + 1, dayDate: '', title: '',
      descriptionEn: '', clientNotes: '',
      titleAr: '', descriptionAr: '', clientNotesAr: '',
      destinationId: null, destinationSnapshot: {}, meals: [], photos: [], items: [],
    })))
    if (language === 'ar') {
      setArOpenIndices(new Set(Array.from({ length: count }, (_, i) => i)))
    }
    setSaved(false)
  }

  function removeDay(i: number) {
    setDays(p => p.filter((_, idx) => idx !== i))
    setSaved(false)
  }

  function move(i: number, dir: -1 | 1) {
    const t = i + dir
    if (t < 0 || t >= days.length) return
    setDays(prev => {
      const n = [...prev]
      ;[n[i], n[t]] = [n[t], n[i]]
      // swap day numbers too
      const numA = n[i].dayNumber; const numB = n[t].dayNumber
      n[i] = { ...n[i], dayNumber: numB }
      n[t] = { ...n[t], dayNumber: numA }
      return n
    })
    setSaved(false)
  }

  function renumber() {
    setDays(p => p.map((d, i) => ({ ...d, dayNumber: i + 1 })))
    setSaved(false)
  }

  function autoComputeDates() {
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
    update(i, {
      destinationId: destId || null,
      destinationSnapshot: dest ? { id: dest.id, name: dest.name } : {},
    })
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

  // ── Empty state ─────────────────────────────────────────────────────────

  if (days.length === 0) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500 mb-5">No itinerary days yet.</p>
        <div className="flex flex-col items-center gap-3">
          {tourDays.length > 0 && (
            <button
              type="button"
              onClick={prefillFromTour}
              className="rounded-md px-4 py-2 text-sm font-medium text-white bg-olive hover:bg-olive-dk"
            >
              Pre-fill from tour template ({tourDays.length} days)
            </button>
          )}
          {tripDays && (
            <button
              type="button"
              onClick={() => generateBlankDays(tripDays)}
              className="rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--gold)' }}
            >
              Generate {tripDays} blank days (from trip dates)
            </button>
          )}
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} max={60}
              placeholder="Days"
              value={genCount}
              onChange={e => setGenCount(e.target.value)}
              className="w-20 rounded-md border border-gray-300 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--olive)]"
            />
            <button
              type="button"
              onClick={() => { const n = parseInt(genCount); if (n > 0) generateBlankDays(n) }}
              disabled={!genCount || parseInt(genCount) < 1}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Generate blank days
            </button>
          </div>
        </div>
      </section>
    )
  }

  // ── Grid ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {tourDays.length > 0 && (
          <button type="button" onClick={prefillFromTour}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
            Re-fill from template ({tourDays.length} days)
          </button>
        )}
        {travelStartDate && (
          <button type="button" onClick={autoComputeDates}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
            Auto-set dates
          </button>
        )}
        <button type="button" onClick={renumber}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
          Renumber
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="stack-grid-wrap space-y-3" style={{ minWidth: 940 }}>

          {/* Header */}
          <div className="stack-grid-header grid gap-3 px-2 text-xs font-medium text-gray-500"
            style={{ gridTemplateColumns: GRID_COLS }}>
            <div>Day / Date</div>
            <div>Main Destination</div>
            <div>Accommodation</div>
            <div>Activities &amp; Details</div>
            <div>Meal Plan</div>
            <div />
          </div>

          {/* Day rows */}
          {days.map((day, i) => (
            <div key={day._key}
              className="stack-grid grid gap-3 bg-white rounded-lg border border-gray-200 p-3 items-start"
              style={{ gridTemplateColumns: GRID_COLS }}>

              {/* Day # + Date */}
              <div data-label="Day / Date" className="space-y-1.5">
                <p className="text-sm font-semibold text-gray-900">Day {day.dayNumber}</p>
                <input type="number" min={1} value={day.dayNumber}
                  onChange={e => update(i, { dayNumber: Number(e.target.value) })}
                  className={inputCls} disabled={isLocked} />
                <input type="date" value={day.dayDate}
                  onChange={e => { update(i, { dayDate: e.target.value }); setSaved(false) }}
                  className={inputCls} disabled={isLocked} />
              </div>

              {/* Destination */}
              <div data-label="Main Destination">
                <select value={day.destinationId ?? ''}
                  onChange={e => onDestSelect(i, e.target.value)}
                  className={inputCls} disabled={isLocked}>
                  <option value="">— none —</option>
                  {destinations.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                  <option value="__add__">+ Add new destination…</option>
                </select>
              </div>

              {/* Accommodation (primary + optional alternative) */}
              <div data-label="Accommodation" className="space-y-1.5">
                <select value={accomIdFor(day, false)}
                  onChange={e => onAccomSelect(i, e.target.value, false)}
                  className={inputCls} disabled={isLocked}>
                  <option value="">— no accommodation —</option>
                  {accommodations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  <option value="__add__">+ Add new accommodation…</option>
                </select>
                <select value={accomIdFor(day, true)}
                  onChange={e => onAccomSelect(i, e.target.value, true)}
                  className={inputCls + ' text-gray-500'} disabled={isLocked}>
                  <option value="">+ Alternative (optional)</option>
                  {accommodations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  <option value="__add__">+ Add new accommodation…</option>
                </select>
              </div>

              {/* Activities & Details */}
              <div data-label="Activities & Details" className="space-y-1.5">
                <button type="button" onClick={() => setActivityModal(i)} disabled={isLocked}
                  className="w-full rounded-md border border-dashed border-[var(--olive)] text-[var(--olive-dk)] px-2 py-1 text-xs font-medium hover:bg-[var(--olive)]/5 disabled:opacity-50">
                  + Add Activities{day.items.filter(it => it.itemType === 'activity').length > 0 ? ` (${day.items.filter(it => it.itemType === 'activity').length})` : ''}
                </button>
                {day.items.filter(it => it.itemType === 'activity').length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {day.items.filter(it => it.itemType === 'activity').map(item => (
                      <span key={item._key} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--olive)]/10 text-[var(--olive-dk)]">
                        {item.titleSnapshot}
                        {(item.contentSnapshot?.moment as string) ? <span className="opacity-60">· {item.contentSnapshot.moment as string}</span> : null}
                        {item.contentSnapshot?.optional ? <span className="text-amber-600">· opt</span> : null}
                      </span>
                    ))}
                  </div>
                )}

                <input type="text" value={day.title}
                  onChange={e => update(i, { title: e.target.value })}
                  placeholder="Day title (English)"
                  className={inputCls} disabled={isLocked} />
                <p className="text-[10px] text-gray-400 leading-snug">
                  Day description is pulled from the destination in the Content library (EN/AR by client language).
                </p>
                <textarea value={day.clientNotes}
                  onChange={e => update(i, { clientNotes: e.target.value })}
                  placeholder="Client notes (optional)" rows={2}
                  className={inputCls + ' resize-none'} disabled={isLocked} />

                <button type="button"
                  onClick={() => setArOpenIndices(prev => {
                    const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next
                  })}
                  className="text-[10px] text-gray-400 hover:text-[var(--olive)] transition">
                  {arOpenIndices.has(i) ? '▲ Hide Arabic' : '🇸🇦 + Arabic'}
                </button>
                {arOpenIndices.has(i) && (
                  <div className="mt-1 pt-1 border-t border-amber-100 space-y-1.5" dir="rtl">
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
                    onClick={() => setPhotoOpenIndices(prev => {
                      const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next
                    })}
                    className="text-[10px] text-gray-400 hover:text-[var(--olive)] transition">
                    {photoOpenIndices.has(i) ? '▲ Hide Photos' : `📷 + Photos${day.photos.length ? ` (${day.photos.length})` : ''}`}
                  </button>
                )}
                {photoOpenIndices.has(i) && (
                  <div className="mt-1 pt-1 border-t border-gray-100">
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
                        className={'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ' + (ITEM_COLORS[item.itemType] ?? 'bg-gray-100 text-gray-600')}>
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

              {/* Meal Plan */}
              <div data-label="Meal Plan" className="flex gap-1 pt-1">
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

              {/* Controls */}
              <div className="flex flex-col max-sm:flex-row max-sm:justify-end items-center gap-1 pt-0.5">
                <button onClick={() => move(i, -1)} disabled={i === 0}
                  className="px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === days.length - 1}
                  className="px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">↓</button>
                {!isLocked && (
                  <button onClick={() => removeDay(i)}
                    className="px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50 rounded">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer controls */}
      {!isLocked && (
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={addBlankDay}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            + Add Day
          </button>
        </div>
      )}

      {activityModal !== null && days[activityModal] && (
        <ActivitiesModal
          dayLabel={`Day ${days[activityModal].dayNumber}`}
          value={dayActivitiesFor(days[activityModal])}
          activities={activities as any}
          destinations={destinations as any}
          dayDestinationId={days[activityModal].destinationId}
          onChange={(rows) => applyActivities(activityModal, rows)}
          onClose={() => setActivityModal(null)}
          onCreateActivity={createActivityInline as any}
          onCreateDestination={createDestinationInline as any}
        />
      )}

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

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">{error}</p>}
      {saved && <p className="text-sm text-green-600 bg-green-50 rounded-md px-4 py-3">Itinerary saved.</p>}

      {!isLocked && (
        <div className="sticky bottom-4 flex gap-2">
          <button type="button" onClick={() => save()} disabled={loading}
            className="rounded-md px-6 py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-60 bg-olive hover:bg-olive-dk">
            {loading ? 'Saving…' : 'Save Itinerary'}
          </button>
          {onContinueToPricing && (
            <button type="button" onClick={saveAndContinue} disabled={loading}
              className="rounded-md px-6 py-2.5 text-sm font-medium shadow-lg disabled:opacity-60 border border-[var(--olive)] text-[var(--olive-dk)] bg-white hover:bg-[var(--olive)]/5">
              Save &amp; Continue to Pricing →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
