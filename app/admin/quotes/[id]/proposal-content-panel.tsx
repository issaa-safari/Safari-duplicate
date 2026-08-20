'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveProposalContent, type ContentEdit, type SaveTarget } from './proposal-content-actions'

// The descriptions a proposal is built from, shown at the Preview step so they
// can be read and fixed before the client ever sees them.
//
// Destination, hotel and activity descriptions are looked up live in the
// Content library, so a record with nothing written renders a blank section on
// the proposal — those are flagged here as "Nothing written yet". Day titles
// and day copy are not edited here; they belong to the itinerary step.
//
// Language follows the version: an Arabic proposal edits the Arabic fields, an
// English one the English fields. Only the proposal's own language is touched.

type Lookup = { id: string; name: string; description_en?: string | null; description_ar?: string | null }

/** The jsonb snapshot a destination or item carries on the quote row. */
type Snapshot = {
  id?: string | null
  name?: string | null
  description_en?: string | null
  description_ar?: string | null
} | null | undefined

type QuoteDayRow = {
  id: string
  day_number: number
  day_number_end?: number | null
  destination_id?: string | null
  destination_snapshot?: Snapshot
}

type DayItemRow = {
  id: string
  quote_day_id: string
  item_type: string
  accommodation_id?: string | null
  activity_id?: string | null
  title_snapshot?: string | null
  content_snapshot?: Snapshot
  sort_order?: number | null
}

interface Props {
  quoteId: string
  versionId: string
  language: 'en' | 'ar'
  isLocked: boolean
  quoteDays: QuoteDayRow[]
  dayItems: DayItemRow[]
  destinations: Lookup[]
  accommodations: Lookup[]
  activities: Lookup[]
}

type Row = {
  key: string
  edit: ContentEdit
  label: string
  sublabel: string | null
  /** Text the proposal would render today, before any edit in this session. */
  initial: string
  /** True when the value came from the Content library rather than the quote. */
  fromLibrary: boolean
  /** A record linked to the Content library can take a reusable description. */
  canSaveToLibrary: boolean
}

const dayLabel = (d: QuoteDayRow) =>
  d.day_number_end && d.day_number_end > d.day_number
    ? `Days ${d.day_number}–${d.day_number_end}`
    : `Day ${d.day_number}`

export default function ProposalContentPanel({
  quoteId, versionId, language, isLocked,
  quoteDays, dayItems, destinations, accommodations, activities,
}: Props) {
  const router = useRouter()
  const isAr = language === 'ar'
  const descKey = isAr ? 'description_ar' : 'description_en'

  const [values, setValues] = useState<Record<string, string>>({})
  const [targets, setTargets] = useState<Record<string, SaveTarget>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState<number | null>(null)

  const byId = <T extends Lookup>(list: T[]) => {
    const m: Record<string, T> = {}
    for (const x of list) m[x.id] = x
    return m
  }
  const destMap = useMemo(() => byId(destinations), [destinations])
  const accMap = useMemo(() => byId(accommodations), [accommodations])
  const actMap = useMemo(() => byId(activities), [activities])

  const lib = useCallback(
    (rec: Lookup | undefined) => (rec ? (isAr ? rec.description_ar : rec.description_en) : null) ?? '',
    [isAr],
  )
  const snap = useCallback(
    (o: Snapshot) => ((o ?? {})[descKey] as string | undefined) ?? '',
    [descKey],
  )

  // One group per itinerary day, in the order the proposal renders them.
  const groups = useMemo(() => {
    const itemsByDay: Record<string, DayItemRow[]> = {}
    for (const it of dayItems) (itemsByDay[it.quote_day_id] ??= []).push(it)

    return [...quoteDays]
      .sort((a, b) => a.day_number - b.day_number)
      .map((d) => {
        const rows: Row[] = []

        const destId: string | null = d.destination_snapshot?.id ?? d.destination_id ?? null
        const destName: string | null = d.destination_snapshot?.name ?? (destId ? destMap[destId]?.name : null) ?? null
        const destOverride = snap(d.destination_snapshot)
        const destLib = lib(destId ? destMap[destId] : undefined)

        if (destId || destName) {
          rows.push({
            key: `dest:${d.id}`,
            edit: {
              field: { kind: 'destination', quoteDayId: d.id, destinationId: destId },
              target: destOverride ? 'proposal' : 'library',
              value: '',
            },
            label: `Destination — ${destName ?? 'Unnamed'}`,
            sublabel: destId ? null : 'Not linked to the Content library — can only be saved to this proposal',
            initial: destOverride || destLib,
            fromLibrary: !destOverride && !!destLib,
            canSaveToLibrary: !!destId,
          })
        }

        for (const it of (itemsByDay[d.id] ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
          if (it.item_type === 'accommodation') {
            const override = snap(it.content_snapshot)
            const libText = lib(it.accommodation_id ? accMap[it.accommodation_id] : undefined)
            rows.push({
              key: `acc:${it.id}`,
              edit: {
                field: { kind: 'accommodation', itemId: it.id, accommodationId: it.accommodation_id ?? null },
                target: override ? 'proposal' : 'library',
                value: '',
              },
              label: `Stay — ${it.title_snapshot ?? 'Accommodation'}`,
              sublabel: it.accommodation_id ? null : 'Not linked to the Content library — can only be saved to this proposal',
              initial: override || libText,
              fromLibrary: !override && !!libText,
              canSaveToLibrary: !!it.accommodation_id,
              })
          } else if (it.item_type === 'activity') {
            const override = snap(it.content_snapshot)
            const libText = lib(it.activity_id ? actMap[it.activity_id] : undefined)
            rows.push({
              key: `act:${it.id}`,
              edit: {
                field: { kind: 'activity', itemId: it.id, activityId: it.activity_id ?? null },
                target: override ? 'proposal' : 'library',
                value: '',
              },
              label: `Activity — ${it.title_snapshot ?? 'Activity'}`,
              sublabel: it.activity_id ? null : 'Not linked to the Content library — can only be saved to this proposal',
              initial: override || libText,
              fromLibrary: !override && !!libText,
              canSaveToLibrary: !!it.activity_id,
              })
          }
        }

        return { day: d, rows }
      })
  }, [quoteDays, dayItems, destMap, accMap, actMap, lib, snap])

  const allRows = useMemo(() => groups.flatMap(g => g.rows), [groups])
  const valueOf = (r: Row) => values[r.key] ?? r.initial
  const targetOf = (r: Row) => targets[r.key] ?? r.edit.target
  const dirtyRows = allRows.filter(r => valueOf(r) !== r.initial)
  const missingCount = allRows.filter(r => !valueOf(r).trim()).length

  async function onSave() {
    setSaving(true); setError(null); setSavedCount(null)
    const edits: ContentEdit[] = dirtyRows.map(r => ({
      field: r.edit.field,
      target: r.canSaveToLibrary ? targetOf(r) : 'proposal',
      value: valueOf(r),
    }))
    const res = await saveProposalContent(quoteId, versionId, edits)
    setSaving(false)
    if (res.error !== null) { setError(res.error); return }
    setSavedCount(res.saved)
    setValues({})
    router.refresh()
  }

  if (quoteDays.length === 0) return null

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Proposal content</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The copy this proposal is built from, in{' '}
            <span className="font-medium">{isAr ? 'Arabic' : 'English'}</span> — the language of this version.
            {missingCount > 0 && (
              <> <span className="font-medium text-amber-700">{missingCount} field{missingCount === 1 ? '' : 's'} still blank.</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedCount != null && <span className="text-xs text-emerald-700">Saved {savedCount} field{savedCount === 1 ? '' : 's'}.</span>}
          {dirtyRows.length > 0 && <span className="text-xs text-muted-foreground">{dirtyRows.length} unsaved</span>}
          <button
            type="button"
            onClick={onSave}
            disabled={saving || isLocked || dirtyRows.length === 0}
            className="rounded-md bg-olive px-4 py-2 text-sm font-medium text-white hover:bg-olive-dk disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save content'}
          </button>
        </div>
      </div>

      {isLocked && (
        <p className="mt-3 text-xs text-muted-foreground">This version is locked — content can no longer be edited.</p>
      )}
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-4 space-y-5">
        {groups.map(({ day, rows }) => (
          <div key={day.id} className="rounded-md border border-border">
            <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {dayLabel(day)}
              {day.destination_snapshot?.name ? ` · ${day.destination_snapshot.name}` : ''}
            </div>
            <div className="divide-y divide-border">
              {rows.map((r) => {
                const v = valueOf(r)
                const blank = !v.trim()
                return (
                  <div key={r.key} className="px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-medium text-foreground">
                        {r.label}
                        {blank && <span className="ml-2 font-normal text-amber-700">Nothing written yet</span>}
                        {!blank && r.fromLibrary && <span className="ml-2 font-normal text-muted-foreground">from Content library</span>}
                      </label>
                      {r.canSaveToLibrary && (
                        <div className="flex items-center gap-1 text-[11px]">
                          {(['library', 'proposal'] as SaveTarget[]).map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTargets(p => ({ ...p, [r.key]: t }))}
                              className={
                                'rounded px-2 py-1 ' +
                                (targetOf(r) === t
                                  ? 'bg-olive text-white'
                                  : 'border border-border text-muted-foreground hover:bg-muted')
                              }
                            >
                              {t === 'library' ? 'Save to library' : 'Only this proposal'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {r.sublabel && <p className="mt-1 text-[11px] text-muted-foreground">{r.sublabel}</p>}
                    <textarea
                        dir={isAr ? 'rtl' : 'ltr'}
                        rows={3}
                        value={v}
                        disabled={isLocked}
                        onChange={(e) => setValues(p => ({ ...p, [r.key]: e.target.value }))}
                        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
                      placeholder={isAr ? 'اكتب الوصف هنا…' : 'Write the description shown to the client…'}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
