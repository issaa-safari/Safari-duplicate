'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import CreateLookupDialog from '@/components/admin/create-lookup-dialog'
import { createLookup } from '@/lib/create-lookup'
import { resolveTripRate, resyncHotelRowsFromItinerary, saveTrip } from './actions'
import { computeBandSale, type AgeBandLite, type BandSalePrices } from './band-pricing'
import {
  MEAL_PLANS,
  ROOM_CATEGORIES,
  type GuestDetails,
  type HotelRowInput,
  type ParkRowInput,
  type ResolveRowRequest,
  type ResolveRowResult,
  type TransportRowInput,
  type TripBuilderState,
} from './types'

export interface LookupOption { id: string; name: string }
export interface AccommodationOption extends LookupOption {
  destination_id: string | null
  budget_tier: string | null
}

const BUDGET_TIERS = [
  { value: 'budget', label: 'Budget' },
  { value: 'midrange', label: 'Mid-range' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'ultra', label: 'Ultra-luxury' },
]

const RESIDENCIES = [
  { value: 'non_resident', label: 'Non-resident' },
  { value: 'resident', label: 'Resident' },
  { value: 'citizen', label: 'Citizen' },
] as const

const inputCls =
  'w-full rounded-md border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:bg-surface-alt disabled:text-muted-foreground'
const labelCls = 'block text-[11px] text-muted-foreground mb-0.5'
const readonlyCls =
  'w-full rounded-md border border-border/70 bg-surface-alt px-2 py-1.5 text-sm text-right text-foreground tabular-nums'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmt0(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

let keySeq = 0
function newKey() {
  keySeq += 1
  return `row-${Date.now()}-${keySeq}`
}

function blankHotelRow(checkIn: string, checkOut: string): HotelRowInput {
  return {
    key: newKey(), destinationId: '', budgetTier: '', accommodationId: '',
    roomCategory: 'sharing', mealPlan: '', rooms: 1, checkIn, checkOut,
  }
}
function blankTransportRow(start: string, end: string): TransportRowInput {
  return { key: newKey(), vehicleId: '', startDate: start, endDate: end, vehicleCount: 1 }
}
function blankParkRow(date: string): ParkRowInput {
  return {
    key: newKey(), parkId: '', travellerCategory: 'adult',
    residency: 'non_resident', entryDate: date, tickets: 1,
  }
}

function nightsOf(checkIn: string, checkOut: string): number | null {
  if (!checkIn || !checkOut) return null
  const n = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000)
  return n > 0 ? n : null
}
function daysInclusive(start: string, end: string): number | null {
  if (!start || !end) return null
  const d = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1
  return d > 0 ? d : null
}

type Resolutions = Record<string, ResolveRowResult | 'pending' | undefined>

function resolvedTotal(res: ResolveRowResult | 'pending' | undefined): number | null {
  return res && res !== 'pending' && res.ok ? res.totalCostUsd : null
}

/** Parse a row's manual price override; null = use the rate list. */
function manualPriceOf(raw: string | undefined): number | null {
  const n = Number(raw)
  return raw !== undefined && raw.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null
}

export default function TripBuilderForm({
  destinations,
  accommodations,
  vehicles,
  parks,
  ageBands,
  usdToKes,
  initialQuoteId,
  initialVersionId,
  initialState,
  onDirtyChange,
  onSaved,
}: {
  destinations: LookupOption[]
  accommodations: AccommodationOption[]
  vehicles: LookupOption[]
  parks: LookupOption[]
  ageBands: AgeBandLite[]
  usdToKes: number
  initialQuoteId?: string | null
  initialVersionId?: string | null
  initialState?: TripBuilderState | null
  /** Reports unsaved-changes state to an embedding parent (e.g. for a navigation guard). */
  onDirtyChange?: (dirty: boolean) => void
  /** Called after a successful save (e.g. to advance an embedding workspace to Preview). */
  onSaved?: () => void
}) {
  const [guest, setGuest] = useState<GuestDetails>(
    initialState?.guest ?? {
      name: '', email: '', phone: '', adults: 2, childAges: [], startDate: '', endDate: '',
    },
  )
  const [title, setTitle] = useState(initialState?.title ?? '')
  const [hotelRows, setHotelRows] = useState<HotelRowInput[]>(
    initialState?.hotelRows ?? [],
  )
  const [transportRows, setTransportRows] = useState<TransportRowInput[]>(
    initialState?.transportRows ?? [],
  )
  const [parkRows, setParkRows] = useState<ParkRowInput[]>(initialState?.parkRows ?? [])
  const [salePrice, setSalePrice] = useState(initialState?.salePrice ?? '')
  // Per-person sale price by traveller band ('adult' / 'child'); when any is
  // set the sale total is Σ count × price instead of the single total input.
  const [bandSalePrices, setBandSalePrices] = useState<BandSalePrices>(
    initialState?.bandSalePrices ?? {},
  )
  // Empty = not customised: the proposal falls back to its language-aware
  // defaults. Pre-filling defaults here would persist English text onto
  // Arabic quotes and hide the price-line-derived Included list.
  const [inclusions, setInclusions] = useState<string[]>(initialState?.inclusions ?? [])
  const [exclusions, setExclusions] = useState<string[]>(initialState?.exclusions ?? [])

  // Lookups live in state so items added inline (saved to the Content
  // library) appear in the dropdowns immediately.
  const [destinationList, setDestinationList] = useState<LookupOption[]>(destinations)
  const [accommodationList, setAccommodationList] = useState<AccommodationOption[]>(accommodations)
  const [creating, setCreating] = useState<null | {
    kind: 'destination' | 'accommodation'
    rowKey: string
  }>(null)

  const [quoteId, setQuoteId] = useState<string | null>(initialQuoteId ?? null)
  const [versionId, setVersionId] = useState<string | null>(initialVersionId ?? null)
  const [quoteNumber, setQuoteNumber] = useState<string | null>(null)

  const [resolutions, setResolutions] = useState<Resolutions>({})
  const sigRef = useRef<Record<string, string>>({})
  const [saving, startSave] = useTransition()
  const [saveError, setSaveError] = useState('')
  const [saveGaps, setSaveGaps] = useState<string[]>([])
  const [savedOk, setSavedOk] = useState(false)

  // Unsaved-changes tracking for the embedding workspace's navigation guard —
  // low-risk (watches the pricing state rather than instrumenting every setter).
  const isFirstPricingRender = useRef(true)
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    if (isFirstPricingRender.current) { isFirstPricingRender.current = false; return }
    setDirty(true)
  }, [guest, title, hotelRows, transportRows, parkRows, salePrice, bandSalePrices, inclusions, exclusions])
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])

  // ── Row rate resolution (fires when a row becomes complete or changes) ──
  useEffect(() => {
    const jobs: { key: string; req: ResolveRowRequest }[] = []

    for (const row of hotelRows) {
      if (row.accommodationId && row.checkIn && row.checkOut && row.checkOut > row.checkIn) {
        jobs.push({
          key: row.key,
          req: {
            kind: 'hotel', accommodationId: row.accommodationId,
            checkIn: row.checkIn, checkOut: row.checkOut,
            roomCategory: row.roomCategory, mealPlan: row.mealPlan,
            rooms: row.rooms,
          },
        })
      }
    }
    for (const row of transportRows) {
      if (row.vehicleId && row.startDate && row.endDate && row.endDate >= row.startDate) {
        jobs.push({
          key: row.key,
          req: {
            kind: 'transport', vehicleId: row.vehicleId,
            startDate: row.startDate, endDate: row.endDate, vehicleCount: row.vehicleCount,
          },
        })
      }
    }
    for (const row of parkRows) {
      if (row.parkId && row.entryDate) {
        jobs.push({
          key: row.key,
          req: {
            kind: 'park', parkId: row.parkId, entryDate: row.entryDate,
            travellerCategory: row.travellerCategory, residency: row.residency,
            tickets: row.tickets,
          },
        })
      }
    }

    const liveKeys = new Set(jobs.map(j => j.key))
    for (const key of Object.keys(sigRef.current)) {
      if (!liveKeys.has(key)) {
        delete sigRef.current[key]
        setResolutions(prev => {
          if (!(key in prev)) return prev
          const next = { ...prev }
          delete next[key]
          return next
        })
      }
    }

    for (const { key, req } of jobs) {
      const sig = JSON.stringify(req)
      if (sigRef.current[key] === sig) continue
      sigRef.current[key] = sig
      setResolutions(prev => ({ ...prev, [key]: 'pending' }))
      resolveTripRate(req).then(res => {
        if (sigRef.current[key] !== sig) return
        setResolutions(prev => ({ ...prev, [key]: res }))
      })
    }
  }, [hotelRows, transportRows, parkRows])

  // ── Summary math (display only — the server recomputes on save) ──
  // Manual prices win over the resolved rate; their units are computable
  // locally (nights × rooms / days × vehicles / tickets).
  const hotelUnits = (row: HotelRowInput) => {
    const nights = nightsOf(row.checkIn, row.checkOut)
    return nights !== null ? nights * Math.max(1, row.rooms) : null
  }
  const transportUnits = (row: TransportRowInput) => {
    const days = daysInclusive(row.startDate, row.endDate)
    return days !== null ? days * Math.max(1, row.vehicleCount) : null
  }
  const parkUnits = (row: ParkRowInput) => Math.max(1, row.tickets)

  function effectiveTotal(row: { key: string; manualUnitCostUsd?: string }, units: number | null): number | null {
    const manual = manualPriceOf(row.manualUnitCostUsd)
    if (manual !== null && units !== null) return manual * units
    return resolvedTotal(resolutions[row.key])
  }

  const transportTotal = transportRows.reduce((s, r) => s + (effectiveTotal(r, transportUnits(r)) ?? 0), 0)
  const parksTotal = parkRows.reduce((s, r) => s + (effectiveTotal(r, parkUnits(r)) ?? 0), 0)
  const summary = (() => {
    const hotels = hotelRows.reduce((s, r) => s + (effectiveTotal(r, hotelUnits(r)) ?? 0), 0)
    const total = hotels + transportTotal + parksTotal
    return { hotels, total }
  })()
  const payingGuests = guest.adults + guest.childAges.filter(a => a >= 3).length

  // Per-band sale pricing, computed with the same helper (and the same
  // age-band table) the server uses, so the preview can't diverge from the
  // saved totals. When any per-person price is set, the sale total is
  // Σ count × price and the single total input is superseded.
  const bandSale = computeBandSale(ageBands, guest, bandSalePrices)
  const { adultCount, childCount: payingChildCount, adultPp, childPp, usesBandPricing } = bandSale
  const bandSaleTotal = bandSale.total

  // Rows priced manually don't need a rate card — their gaps don't block saving.
  const manualKeys = new Set<string>()
  for (const r of hotelRows) if (manualPriceOf(r.manualUnitCostUsd) !== null) manualKeys.add(r.key)
  for (const r of transportRows) if (manualPriceOf(r.manualUnitCostUsd) !== null) manualKeys.add(r.key)
  for (const r of parkRows) if (manualPriceOf(r.manualUnitCostUsd) !== null) manualKeys.add(r.key)

  const gapMessages: string[] = []
  let anyPending = false
  for (const [key, res] of Object.entries(resolutions)) {
    if (res === 'pending') anyPending = true
    else if (res && !res.ok && !manualKeys.has(key)) gapMessages.push(res.message)
  }

  const tripDays = guest.startDate && guest.endDate ? daysInclusive(guest.startDate, guest.endDate) : null
  const canSave =
    !saving && !anyPending && gapMessages.length === 0 &&
    bandSale.missing.length === 0 &&
    guest.name.trim().length > 0 && !!guest.startDate && !!guest.endDate &&
    guest.endDate >= guest.startDate

  function handleSave() {
    setSaveError('')
    setSaveGaps([])
    setSavedOk(false)
    const state: TripBuilderState = {
      guest, title, hotelRows, transportRows, parkRows, salePrice,
      bandSalePrices, inclusions, exclusions,
    }
    startSave(async () => {
      const result = await saveTrip({ quoteId, versionId, state })
      if (result.ok) {
        setQuoteId(result.quoteId)
        setQuoteNumber(result.quoteNumber)
        setVersionId(result.versionId)
        setDirty(false)
        if (onSaved) {
          onSaved()
        } else {
          setSavedOk(true)
        }
      } else {
        // A failure can still have created the quote/version (e.g. a
        // post-save write failed) — keep the ids so retrying updates it
        // instead of creating a duplicate.
        if (result.quoteId) setQuoteId(result.quoteId)
        if (result.versionId) setVersionId(result.versionId)
        setSaveError(result.message)
        setSaveGaps(result.gaps ?? [])
      }
    })
  }

  // Re-pull hotel rows from the itinerary (for quotes whose itinerary changed
  // after pricing was first built). Rows matching an existing row by
  // accommodation + check-in keep the existing row (preserving manual price
  // overrides); everything else is replaced by the fresh seed.
  const [resyncing, setResyncing] = useState(false)
  const [resyncError, setResyncError] = useState('')
  async function handleResync() {
    if (!versionId) return
    if (!confirm('Re-sync hotel rows from the itinerary? Rows for stays no longer in the itinerary will be removed; matching rows keep their manual prices.')) return
    setResyncing(true); setResyncError('')
    try {
      const res = await resyncHotelRowsFromItinerary(versionId)
      if (!res.ok) { setResyncError(res.message); return }
      setHotelRows(existing => res.rows.map((seed, i) => {
        const match = existing.find(r => r.accommodationId === seed.accommodationId && r.checkIn === seed.checkIn)
        return match ?? { ...seed, key: `resync-${Date.now()}-${i}` }
      }))
    } catch (err) {
      setResyncError(err instanceof Error ? err.message : 'Re-sync failed.')
    } finally {
      setResyncing(false)
    }
  }

  // Enter adds a row inside a section (spreadsheet muscle memory).
  function sectionKeyDown(addRow: () => void) {
    return (e: React.KeyboardEvent) => {
      if (e.key !== 'Enter') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'SELECT') {
        e.preventDefault()
        addRow()
      }
    }
  }

  function updateChildCount(count: number) {
    const n = Math.max(0, Math.min(12, count))
    setGuest(g => ({
      ...g,
      childAges: Array.from({ length: n }, (_, i) => g.childAges[i] ?? 8),
    }))
  }

  const hotelOptions = (row: HotelRowInput) =>
    accommodationList.filter(a =>
      (!row.destinationId || a.destination_id === row.destinationId) &&
      (!row.budgetTier || a.budget_tier === row.budgetTier),
    )

  const updateHotelRow = (key: string, patch: Partial<HotelRowInput>) =>
    setHotelRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)))

  // Rate cell: shows the rate-list price, and doubles as a manual override —
  // type a price to use it instead of the rate list, clear it to go back.
  function rateCell(
    row: { key: string; manualUnitCostUsd?: string },
    perUnitSuffix: string,
    onManual: (value: string) => void,
  ) {
    const res = resolutions[row.key]
    const manual = manualPriceOf(row.manualUnitCostUsd) !== null
    const resolvedOk = res && res !== 'pending' && res.ok ? res : null
    return (
      <div className="inline-flex flex-col items-end gap-0.5">
        <input
          type="number" min={0} step="0.01"
          className={inputCls + ' w-24 text-right tabular-nums' + (manual ? ' border-amber-400 bg-amber-50' : '')}
          value={row.manualUnitCostUsd ?? ''}
          placeholder={resolvedOk ? fmt(resolvedOk.unitCostUsd) : 'manual $'}
          title="Type a price to override the rate list; clear it to use the saved rate"
          onChange={e => onManual(e.target.value)}
        />
        {res === 'pending' && <span className="text-[10px] text-muted-foreground animate-pulse">resolving…</span>}
        {resolvedOk && !manual && (
          <span className="text-[10px] text-muted-foreground tabular-nums"
            title={resolvedOk.segments.map(s => `${s.label}: ${s.units} × $${fmt(s.unitCostUsd)}`).join('\n')}>
            rate list ${fmt(resolvedOk.unitCostUsd)}{perUnitSuffix}
            {resolvedOk.segments.length > 1 && <span className="text-warning-foreground ml-1" title="Season split">≀</span>}
            {resolvedOk.segments[0]?.sourceCurrency === 'KES' && (
              <span className="ml-1">KES {fmt0(resolvedOk.segments[0].sourceUnitCost)}</span>
            )}
          </span>
        )}
        {resolvedOk && manual && (
          <span className="text-[10px] text-muted-foreground tabular-nums line-through">
            ${fmt(resolvedOk.unitCostUsd)}{perUnitSuffix}
          </span>
        )}
        {res && res !== 'pending' && !res.ok && (
          manual ? (
            <span className="text-[10px] text-warning-foreground">no rate card — manual price used</span>
          ) : (
            <span className="inline-block rounded-full bg-destructive/10 border border-destructive/30 text-destructive text-[11px] px-2 py-0.5 whitespace-nowrap">
              {res.message}
            </span>
          )
        )}
      </div>
    )
  }

  function totalCell(row: { key: string; manualUnitCostUsd?: string }, units: number | null) {
    const total = effectiveTotal(row, units)
    const manual = manualPriceOf(row.manualUnitCostUsd) !== null
    return total !== null
      ? (
        <span className="tabular-nums font-medium text-foreground">
          ${fmt(total)}
          {manual && <span className="block text-[10px] font-normal text-warning-foreground">manual</span>}
        </span>
      )
      : <span className="text-xs text-gray-300">—</span>
  }

  const section = 'rounded-xl border border-border bg-surface shadow-sm'
  const sectionHead = 'px-4 py-2.5 border-b border-border/70 flex items-center justify-between'
  const sectionTitle = 'text-sm font-semibold text-foreground'
  const addBtn = 'text-xs font-medium text-brand-text hover:text-brand-ink'
  const removeBtn = 'text-gray-300 hover:text-destructive text-sm px-1'

  function hotelSection(heading: string) {
    const rows = hotelRows
    const addRow = () =>
      setHotelRows(prev => [...prev, blankHotelRow(guest.startDate, guest.endDate)])
    const update = (key: string, patch: Partial<HotelRowInput>) =>
      updateHotelRow(key, patch)
    const remove = (key: string) =>
      setHotelRows(prev => prev.filter(r => r.key !== key))

    return (
      <div className={section} onKeyDown={sectionKeyDown(addRow)}>
        <div className={sectionHead}>
          <h2 className={sectionTitle}>{heading}</h2>
          <div className="flex items-center gap-2">
            {versionId && (
              <button type="button" onClick={() => handleResync()} disabled={resyncing}
                title="Re-pull hotel stays from this quote's itinerary"
                className="text-xs text-muted-foreground hover:text-brand-ink border border-border hover:border-ring/40 rounded px-2 py-1 disabled:opacity-50">
                {resyncing ? 'Syncing…' : '↻ Re-sync from itinerary'}
              </button>
            )}
            <button type="button" onClick={addRow} className={addBtn}>+ Add hotel row (↵)</button>
          </div>
        </div>
        {resyncError && <p className="px-4 pt-2 text-xs text-destructive">{resyncError}</p>}
        {rows.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No hotel rows yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="stack-table w-full text-sm min-w-[1080px]">
              <thead>
                <tr className="text-left text-[11px] text-muted-foreground border-b border-border/70">
                  <th className="px-3 py-2 font-medium">Location</th>
                  <th className="px-2 py-2 font-medium">Budget</th>
                  <th className="px-2 py-2 font-medium">Hotel</th>
                  <th className="px-2 py-2 font-medium">Room</th>
                  <th className="px-2 py-2 font-medium">Rooms</th>
                  <th className="px-2 py-2 font-medium">Meal</th>
                  <th className="px-2 py-2 font-medium">Check-in</th>
                  <th className="px-2 py-2 font-medium">Check-out</th>
                  <th className="px-2 py-2 font-medium text-right">Nights</th>
                  <th className="px-2 py-2 font-medium text-right">/night</th>
                  <th className="px-2 py-2 font-medium text-right">Total</th>
                  <th className="px-1 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const nights = nightsOf(row.checkIn, row.checkOut)
                  return (
                    <tr key={row.key} className="border-b border-gray-50 last:border-0 align-top">
                      <td data-label="Location" className="px-3 py-1.5 min-w-[120px]">
                        <select className={inputCls} value={row.destinationId}
                          onChange={e => {
                            if (e.target.value === '__add__') { setCreating({ kind: 'destination', rowKey: row.key }); return }
                            update(row.key, { destinationId: e.target.value, accommodationId: '' })
                          }}>
                          <option value="">Any</option>
                          {destinationList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          <option value="__add__">+ Add new destination…</option>
                        </select>
                      </td>
                      <td data-label="Budget" className="px-2 py-1.5 min-w-[110px]">
                        <select className={inputCls} value={row.budgetTier}
                          onChange={e => update(row.key, { budgetTier: e.target.value, accommodationId: '' })}>
                          <option value="">Any</option>
                          {BUDGET_TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </td>
                      <td data-label="Hotel" className="px-2 py-1.5 min-w-[170px]">
                        <select className={inputCls} value={row.accommodationId}
                          onChange={e => {
                            if (e.target.value === '__add__') { setCreating({ kind: 'accommodation', rowKey: row.key }); return }
                            update(row.key, { accommodationId: e.target.value })
                          }}>
                          <option value="">— select —</option>
                          {hotelOptions(row).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                          <option value="__add__">+ Add new accommodation…</option>
                        </select>
                      </td>
                      <td data-label="Room" className="px-2 py-1.5 min-w-[100px]">
                        <select className={inputCls} value={row.roomCategory}
                          onChange={e => update(row.key, { roomCategory: e.target.value as HotelRowInput['roomCategory'] })}>
                          {ROOM_CATEGORIES.map(r => (
                            <option key={r} value={r}>{r.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </td>
                      <td data-label="Rooms" className="px-2 py-1.5 w-16">
                        <input type="number" min={1} className={inputCls} value={row.rooms}
                          onChange={e => update(row.key, { rooms: Math.max(1, parseInt(e.target.value) || 1) })} />
                      </td>
                      <td data-label="Meal" className="px-2 py-1.5 min-w-[75px]">
                        <select className={inputCls} value={row.mealPlan}
                          onChange={e => update(row.key, { mealPlan: e.target.value as HotelRowInput['mealPlan'] })}>
                          <option value="">Any</option>
                          {MEAL_PLANS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                      <td data-label="Check-in" className="px-2 py-1.5 min-w-[130px]">
                        <input type="date" className={inputCls} value={row.checkIn}
                          min={guest.startDate || undefined} max={guest.endDate || undefined}
                          onChange={e => update(row.key, { checkIn: e.target.value })} />
                      </td>
                      <td data-label="Check-out" className="px-2 py-1.5 min-w-[130px]">
                        <input type="date" className={inputCls} value={row.checkOut}
                          min={row.checkIn || guest.startDate || undefined} max={guest.endDate || undefined}
                          onChange={e => update(row.key, { checkOut: e.target.value })} />
                      </td>
                      <td data-label="Nights" className="px-2 py-1.5 text-right">
                        <span className={readonlyCls + ' inline-block w-12'}>{nights ?? '—'}</span>
                      </td>
                      <td data-label="Per night" className="px-2 py-1.5 text-right whitespace-nowrap">
                        {rateCell(row, '', v => update(row.key, { manualUnitCostUsd: v }))}
                      </td>
                      <td data-label="Total" className="px-2 py-1.5 text-right whitespace-nowrap">{totalCell(row, hotelUnits(row))}</td>
                      <td className="px-1 py-1.5">
                        <button type="button" onClick={() => remove(row.key)} className={removeBtn} title="Remove row">✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 1 ─ Guest details */}
      <div className={section}>
        <div className={sectionHead}>
          <h2 className={sectionTitle}>1 · Guest details</h2>
          {quoteId && (
            <span className="text-xs text-muted-foreground">
              Editing draft {quoteNumber ? <span className="font-mono">{quoteNumber}</span> : 'quote'}
            </span>
          )}
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="col-span-2">
            <label htmlFor="guest-name" className={labelCls}>Guest name *</label>
            <input id="guest-name" className={inputCls} value={guest.name}
              onChange={e => setGuest(g => ({ ...g, name: e.target.value }))}
              placeholder="e.g. Amina Hassan" />
          </div>
          <div className="col-span-2">
            <label htmlFor="email-links-crm-client" className={labelCls}>Email (links CRM client)</label>
            <input id="email-links-crm-client" className={inputCls} type="email" value={guest.email}
              onChange={e => setGuest(g => ({ ...g, email: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="adults" className={labelCls}>Adults</label>
            <input id="adults" className={inputCls} type="number" min={1} value={guest.adults}
              onChange={e => setGuest(g => ({ ...g, adults: Math.max(1, parseInt(e.target.value) || 1) }))} />
          </div>
          <div>
            <label htmlFor="children" className={labelCls}>Children</label>
            <input id="children" className={inputCls} type="number" min={0} max={12} value={guest.childAges.length}
              onChange={e => updateChildCount(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label htmlFor="trip-start" className={labelCls}>Trip start *</label>
            <input id="trip-start" className={inputCls} type="date" value={guest.startDate}
              onChange={e => setGuest(g => ({ ...g, startDate: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="trip-end" className={labelCls}>Trip end *</label>
            <input id="trip-end" className={inputCls} type="date" value={guest.endDate} min={guest.startDate || undefined}
              onChange={e => setGuest(g => ({ ...g, endDate: e.target.value }))} />
          </div>
        </div>
        {(guest.childAges.length > 0 || tripDays) && (
          <div className="px-4 pb-3 flex flex-wrap items-end gap-3">
            {guest.childAges.map((age, i) => (
              <div key={i}>
                <label htmlFor={`child-age-${i}`} className={labelCls}>Child {i + 1} age</label>
                <input id={`child-age-${i}`} className={inputCls + ' w-16'} type="number" min={0} max={17} value={age}
                  onChange={e => setGuest(g => ({
                    ...g,
                    childAges: g.childAges.map((a, j) => (j === i ? Math.max(0, Math.min(17, parseInt(e.target.value) || 0)) : a)),
                  }))} />
              </div>
            ))}
            {tripDays && (
              <p className="text-xs text-muted-foreground pb-2 ml-auto">
                <span className="font-semibold text-foreground">{tripDays}</span> day{tripDays === 1 ? '' : 's'} ·{' '}
                <span className="font-semibold text-foreground">{tripDays - 1}</span> night{tripDays - 1 === 1 ? '' : 's'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 2 ─ Hotels */}
      {hotelSection('2 · Hotels')}

      {/* 3 ─ Transport */}
      <div className={section}
        onKeyDown={sectionKeyDown(() => setTransportRows(rows => [...rows, blankTransportRow(guest.startDate, guest.endDate)]))}>
        <div className={sectionHead}>
          <h2 className={sectionTitle}>3 · Transport</h2>
          <button type="button" className={addBtn}
            onClick={() => setTransportRows(rows => [...rows, blankTransportRow(guest.startDate, guest.endDate)])}>
            + Add vehicle row (↵)
          </button>
        </div>
        {transportRows.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No transport rows yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="stack-table w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-[11px] text-muted-foreground border-b border-border/70">
                  <th className="px-3 py-2 font-medium">Vehicle</th>
                  <th className="px-2 py-2 font-medium">Count</th>
                  <th className="px-2 py-2 font-medium">Start</th>
                  <th className="px-2 py-2 font-medium">End</th>
                  <th className="px-2 py-2 font-medium text-right">Days</th>
                  <th className="px-2 py-2 font-medium text-right">Rate/day</th>
                  <th className="px-2 py-2 font-medium text-right">Total</th>
                  <th className="px-1 py-2" />
                </tr>
              </thead>
              <tbody>
                {transportRows.map(row => {
                  const days = daysInclusive(row.startDate, row.endDate)
                  const update = (patch: Partial<TransportRowInput>) =>
                    setTransportRows(rows => rows.map(r => (r.key === row.key ? { ...r, ...patch } : r)))
                  return (
                    <tr key={row.key} className="border-b border-gray-50 last:border-0">
                      <td data-label="Vehicle" className="px-3 py-1.5 min-w-[180px]">
                        <select className={inputCls} value={row.vehicleId}
                          onChange={e => update({ vehicleId: e.target.value })}>
                          <option value="">— select —</option>
                          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </td>
                      <td data-label="Count" className="px-2 py-1.5 w-16">
                        <input type="number" min={1} className={inputCls} value={row.vehicleCount}
                          onChange={e => update({ vehicleCount: Math.max(1, parseInt(e.target.value) || 1) })} />
                      </td>
                      <td data-label="Start" className="px-2 py-1.5 min-w-[130px]">
                        <input type="date" className={inputCls} value={row.startDate}
                          min={guest.startDate || undefined} max={guest.endDate || undefined}
                          onChange={e => update({ startDate: e.target.value })} />
                      </td>
                      <td data-label="End" className="px-2 py-1.5 min-w-[130px]">
                        <input type="date" className={inputCls} value={row.endDate}
                          min={row.startDate || guest.startDate || undefined} max={guest.endDate || undefined}
                          onChange={e => update({ endDate: e.target.value })} />
                      </td>
                      <td data-label="Days" className="px-2 py-1.5 text-right">
                        <span className={readonlyCls + ' inline-block w-12'}>{days ?? '—'}</span>
                      </td>
                      <td data-label="Rate/day" className="px-2 py-1.5 text-right whitespace-nowrap">
                        {rateCell(row, '/day', v => update({ manualUnitCostUsd: v }))}
                      </td>
                      <td data-label="Total" className="px-2 py-1.5 text-right whitespace-nowrap">{totalCell(row, transportUnits(row))}</td>
                      <td className="px-1 py-1.5">
                        <button type="button" className={removeBtn} title="Remove row"
                          onClick={() => setTransportRows(rows => rows.filter(r => r.key !== row.key))}>✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5 ─ Park fees */}
      <div className={section}
        onKeyDown={sectionKeyDown(() => setParkRows(rows => [...rows, blankParkRow(guest.startDate)]))}>
        <div className={sectionHead}>
          <h2 className={sectionTitle}>4 · Park fees</h2>
          <button type="button" className={addBtn}
            onClick={() => setParkRows(rows => [...rows, blankParkRow(guest.startDate)])}>
            + Add park row (↵)
          </button>
        </div>
        {parkRows.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No park rows yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="stack-table w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-[11px] text-muted-foreground border-b border-border/70">
                  <th className="px-3 py-2 font-medium">Park</th>
                  <th className="px-2 py-2 font-medium">Category</th>
                  <th className="px-2 py-2 font-medium">Group</th>
                  <th className="px-2 py-2 font-medium">Entry date</th>
                  <th className="px-2 py-2 font-medium">Tickets</th>
                  <th className="px-2 py-2 font-medium text-right">Rate</th>
                  <th className="px-2 py-2 font-medium text-right">Total</th>
                  <th className="px-1 py-2" />
                </tr>
              </thead>
              <tbody>
                {parkRows.map(row => {
                  const update = (patch: Partial<ParkRowInput>) =>
                    setParkRows(rows => rows.map(r => (r.key === row.key ? { ...r, ...patch } : r)))
                  return (
                    <tr key={row.key} className="border-b border-gray-50 last:border-0">
                      <td data-label="Park" className="px-3 py-1.5 min-w-[180px]">
                        <select className={inputCls} value={row.parkId}
                          onChange={e => update({ parkId: e.target.value })}>
                          <option value="">— select —</option>
                          {parks.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td data-label="Category" className="px-2 py-1.5 min-w-[90px]">
                        <select className={inputCls} value={row.travellerCategory}
                          onChange={e => update({ travellerCategory: e.target.value as ParkRowInput['travellerCategory'] })}>
                          <option value="adult">Adult</option>
                          <option value="child">Child</option>
                        </select>
                      </td>
                      <td data-label="Group" className="px-2 py-1.5 min-w-[120px]">
                        <select className={inputCls} value={row.residency}
                          onChange={e => update({ residency: e.target.value as ParkRowInput['residency'] })}>
                          {RESIDENCIES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </td>
                      <td data-label="Entry date" className="px-2 py-1.5 min-w-[130px]">
                        <input type="date" className={inputCls} value={row.entryDate}
                          min={guest.startDate || undefined} max={guest.endDate || undefined}
                          onChange={e => update({ entryDate: e.target.value })} />
                      </td>
                      <td data-label="Tickets" className="px-2 py-1.5 w-16">
                        <input type="number" min={1} className={inputCls} value={row.tickets}
                          onChange={e => update({ tickets: Math.max(1, parseInt(e.target.value) || 1) })} />
                      </td>
                      <td data-label="Rate" className="px-2 py-1.5 text-right whitespace-nowrap">
                        {rateCell(row, '', v => update({ manualUnitCostUsd: v }))}
                      </td>
                      <td data-label="Total" className="px-2 py-1.5 text-right whitespace-nowrap">{totalCell(row, parkUnits(row))}</td>
                      <td className="px-1 py-1.5">
                        <button type="button" className={removeBtn} title="Remove row"
                          onClick={() => setParkRows(rows => rows.filter(r => r.key !== row.key))}>✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5 ─ Live summary */}
      <div className={section}>
        <div className={sectionHead}>
          <h2 className={sectionTitle}>5 · Cost summary &amp; sale price</h2>
          <span className="text-xs text-muted-foreground">USD · KES @ {fmt0(usdToKes)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="stack-table w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[11px] text-muted-foreground border-b border-border/70">
                <th className="px-3 py-2 font-medium text-right">Hotels</th>
                <th className="px-3 py-2 font-medium text-right">Transport</th>
                <th className="px-3 py-2 font-medium text-right">Parks</th>
                <th className="px-3 py-2 font-medium text-right">Total cost</th>
                <th className="px-3 py-2 font-medium text-right">Per guest</th>
                <th className="px-3 py-2 font-medium text-right">Sale price</th>
                <th className="px-3 py-2 font-medium text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const sale = usesBandPricing ? bandSaleTotal : parseFloat(salePrice)
                const hasSale = Number.isFinite(sale) && sale > 0
                const margin = hasSale ? sale - summary.total : null
                const marginPct = hasSale && sale > 0 ? ((sale - summary.total) / sale) * 100 : null
                return (
                  <tr className="border-b border-gray-50 last:border-0">
                    <td data-label="Hotels" className="px-3 py-2.5 text-right tabular-nums text-foreground">${fmt(summary.hotels)}</td>
                    <td data-label="Transport" className="px-3 py-2.5 text-right tabular-nums text-foreground">${fmt(transportTotal)}</td>
                    <td data-label="Parks" className="px-3 py-2.5 text-right tabular-nums text-foreground">${fmt(parksTotal)}</td>
                    <td data-label="Total cost" className="px-3 py-2.5 text-right tabular-nums font-semibold text-foreground">
                      <span>
                        ${fmt(summary.total)}
                        <span className="block text-[10px] text-muted-foreground font-normal">KES {fmt0(summary.total * usdToKes)}</span>
                      </span>
                    </td>
                    <td data-label="Per guest" className="px-3 py-2.5 text-right tabular-nums text-foreground">
                      {payingGuests > 0 ? `$${fmt(summary.total / payingGuests)}` : '—'}
                    </td>
                    <td data-label="Sale price" className="px-3 py-2.5 text-right">
                      {usesBandPricing ? (
                        <span className="tabular-nums font-semibold text-foreground" title="Sum of the per-traveller-type prices below">
                          ${fmt(bandSaleTotal)}
                          <span className="block text-[10px] font-normal text-muted-foreground">per traveller type ↓</span>
                        </span>
                      ) : (
                        <input
                          type="number" min={0} step="1"
                          className={inputCls + ' w-28 text-right tabular-nums inline-block'}
                          value={salePrice}
                          placeholder="0"
                          onChange={e => setSalePrice(e.target.value)}
                        />
                      )}
                    </td>
                    <td data-label="Margin" className="px-3 py-2.5 text-right tabular-nums">
                      {margin === null ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span className={margin >= 0 ? 'text-green-700 font-medium' : 'text-destructive font-medium'}>
                          ${fmt(margin)}
                          <span className="block text-[10px] font-normal">{marginPct!.toFixed(1)}%</span>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })()}
            </tbody>
          </table>
        </div>
        {/* Per-traveller-type sale prices (Adult / Child set manually) */}
        <div className="px-4 py-3 border-t border-border/70">
          <p className="text-xs font-semibold text-foreground">
            Sale price per traveller type
            <span className="ml-2 font-normal text-muted-foreground">
              set a per-person price for every type (0 = free) — or leave all blank and use the single total above
            </span>
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
            {([
              { code: 'adult', label: 'Adult', count: adultCount, pp: adultPp },
              { code: 'child', label: 'Child', count: payingChildCount, pp: childPp },
            ] as const).filter(b => b.count > 0).map(b => (
              <div key={b.code} className="flex items-center gap-2">
                <span className="text-sm text-foreground w-20">{b.count} × {b.label}</span>
                <span className="text-sm text-muted-foreground">$</span>
                <input
                  type="number" min={0} step="1"
                  className={inputCls + ' w-28 text-right tabular-nums' + (b.pp !== null ? ' border-amber-400 bg-amber-50' : '')}
                  value={bandSalePrices[b.code] ?? ''}
                  placeholder="per person"
                  aria-label={`${b.label} sale price per person`}
                  onChange={e => setBandSalePrices(prev => ({ ...prev, [b.code]: e.target.value }))}
                />
                <span className="text-xs text-muted-foreground tabular-nums w-24">
                  {b.pp !== null ? `= $${fmt(b.pp * b.count)}` : ''}
                </span>
              </div>
            ))}
            {usesBandPricing && bandSale.missing.length === 0 && (
              <span className="text-sm font-semibold text-foreground tabular-nums">
                Total sale: ${fmt(bandSaleTotal)}
              </span>
            )}
          </div>
          {bandSale.missing.length > 0 && (
            <p className="mt-2 text-xs text-destructive">
              Enter a per-person price for every traveller type (0 = free) — a blank type would
              be left out of the sale total. Clear all type prices to use the single total instead.
            </p>
          )}
        </div>
        {payingGuests > 0 && (
          <p className="px-4 py-2 text-[11px] text-muted-foreground border-t border-gray-50">
            Per guest = total ÷ {payingGuests} paying guest{payingGuests === 1 ? '' : 's'} (infants under 3 excluded).
          </p>
        )}
      </div>

      {/* 6 ─ Included / Excluded (shown on the client proposal) */}
      <div className={section}>
        <div className={sectionHead}>
          <h2 className={sectionTitle}>6 · Inclusions &amp; Exclusions</h2>
          <span className="text-xs text-muted-foreground">shown on the client proposal</span>
        </div>
        <div className="p-4 grid gap-6 md:grid-cols-2">
          <ChipListEditor
            label="Included"
            items={inclusions}
            onChange={setInclusions}
            chipClass="bg-accent text-brand-ink border border-primary-strong/30"
            placeholder="Add an included item…"
            emptyHint="Empty — the proposal will show the default Included list."
          />
          <ChipListEditor
            label="Excluded"
            items={exclusions}
            onChange={setExclusions}
            chipClass="bg-destructive/10 text-destructive border border-destructive/30"
            placeholder="Add an excluded item…"
            emptyHint="Empty — the proposal will show the default Excluded list."
          />
        </div>
      </div>

      {/* Gap + error surface */}
      {(gapMessages.length > 0 || saveGaps.length > 0) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium text-destructive mb-1">Missing rates block saving:</p>
          <ul className="text-sm text-destructive list-disc pl-5 space-y-0.5">
            {[...new Set([...gapMessages, ...saveGaps])].map(m => <li key={m}>{m}</li>)}
          </ul>
          <p className="text-xs text-destructive mt-1.5">Add the missing rate cards in Content → Supplier Rates, then re-price.</p>
        </div>
      )}
      {saveError && !saveGaps.length && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/30 px-4 py-3">{saveError}</p>
      )}
      {savedOk && quoteId && (
        <p className="text-sm text-green-800 bg-green-50 rounded-lg border border-green-200 px-4 py-3">
          Trip saved{quoteNumber ? <> as <span className="font-mono">{quoteNumber}</span></> : ''}.{' '}
          <Link href={`/admin/quotes/${quoteId}`} className="underline font-medium">Open quote</Link>
          <span className="text-green-600"> · Keep editing here and Save again to update the same draft.</span>
        </p>
      )}

      {/* 6 ─ Save */}
      <div className="flex items-center gap-3 pb-8">
        <div>
          <label htmlFor="quote-title-optional" className={labelCls}>Quote title (optional)</label>
          <input id="quote-title-optional" className={inputCls + ' w-72'} value={title}
            onChange={e => setTitle(e.target.value)} placeholder="e.g. Hassan family — Christmas safari" />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="mt-4 rounded-md px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40 bg-olive hover:bg-olive-dk"
        >
          {saving ? 'Saving…' : quoteId ? 'Save changes' : 'Save quote'}
        </button>
        {anyPending && <span className="mt-4 text-xs text-muted-foreground animate-pulse">Resolving rates…</span>}
      </div>

      {creating && (
        <CreateLookupDialog
          title={creating.kind === 'destination' ? 'New Destination' : 'New Accommodation'}
          onClose={() => setCreating(null)}
          onSubmit={async (name, en, ar) => {
            const row = hotelRows.find(r => r.key === creating.rowKey)
            if (creating.kind === 'destination') {
              const it = await createLookup('destination', name, { descriptionEn: en, descriptionAr: ar })
              setDestinationList(p =>
                [...p, { id: it.id, name: it.name }].sort((a, b) => a.name.localeCompare(b.name)))
              updateHotelRow(creating.rowKey, { destinationId: it.id, accommodationId: '' })
            } else {
              const it = await createLookup('accommodation', name, {
                destinationId: row?.destinationId || null,
                budgetTier: row?.budgetTier || null,
                descriptionEn: en,
                descriptionAr: ar,
              })
              setAccommodationList(p =>
                [...p, {
                  id: it.id,
                  name: it.name,
                  destination_id: it.destination_id ?? null,
                  budget_tier: (it as { budget_tier?: string | null }).budget_tier ?? null,
                }].sort((a, b) => a.name.localeCompare(b.name)))
              updateHotelRow(creating.rowKey, { accommodationId: it.id })
            }
          }}
        />
      )}
    </div>
  )
}

function ChipListEditor({
  label,
  items,
  onChange,
  chipClass,
  placeholder,
  emptyHint,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  chipClass: string
  placeholder: string
  emptyHint: string
}) {
  const [draft, setDraft] = useState('')

  function add() {
    const value = draft.trim()
    if (!value || items.includes(value)) return
    onChange([...items, value])
    setDraft('')
  }

  return (
    <div>
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={item}
            className={'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ' + chipClass}>
            {item}
            <button type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label={`Remove ${item}`}
              className="opacity-50 hover:opacity-100 leading-none">×</button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-muted-foreground">{emptyHint}</span>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          aria-label={placeholder}
          className={inputCls + ' max-w-xs'}
        />
        <button type="button" onClick={add} disabled={!draft.trim()}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40">
          Add
        </button>
      </div>
    </div>
  )
}
