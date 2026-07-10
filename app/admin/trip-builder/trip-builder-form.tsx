'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import CreateLookupDialog from '@/components/admin/create-lookup-dialog'
import { createLookup } from '@/lib/create-lookup'
import { resolveTripRate, resyncHotelRowsFromItinerary, saveTrip } from './actions'
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
  'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--olive)] disabled:bg-gray-50 disabled:text-gray-400'
const labelCls = 'block text-[11px] text-gray-500 mb-0.5'
const readonlyCls =
  'w-full rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5 text-sm text-right text-gray-700 tabular-nums'

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
  }, [guest, title, hotelRows, transportRows, parkRows, salePrice])
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
    guest.name.trim().length > 0 && !!guest.startDate && !!guest.endDate &&
    guest.endDate >= guest.startDate

  function handleSave() {
    setSaveError('')
    setSaveGaps([])
    setSavedOk(false)
    const state: TripBuilderState = { guest, title, hotelRows, transportRows, parkRows, salePrice }
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
        {res === 'pending' && <span className="text-[10px] text-gray-400 animate-pulse">resolving…</span>}
        {resolvedOk && !manual && (
          <span className="text-[10px] text-gray-400 tabular-nums"
            title={resolvedOk.segments.map(s => `${s.label}: ${s.units} × $${fmt(s.unitCostUsd)}`).join('\n')}>
            rate list ${fmt(resolvedOk.unitCostUsd)}{perUnitSuffix}
            {resolvedOk.segments.length > 1 && <span className="text-amber-600 ml-1" title="Season split">≀</span>}
            {resolvedOk.segments[0]?.sourceCurrency === 'KES' && (
              <span className="ml-1">KES {fmt0(resolvedOk.segments[0].sourceUnitCost)}</span>
            )}
          </span>
        )}
        {resolvedOk && manual && (
          <span className="text-[10px] text-gray-400 tabular-nums line-through">
            ${fmt(resolvedOk.unitCostUsd)}{perUnitSuffix}
          </span>
        )}
        {res && res !== 'pending' && !res.ok && (
          manual ? (
            <span className="text-[10px] text-amber-600">no rate card — manual price used</span>
          ) : (
            <span className="inline-block rounded-full bg-red-50 border border-red-200 text-red-700 text-[11px] px-2 py-0.5 whitespace-nowrap">
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
        <span className="tabular-nums font-medium text-gray-900">
          ${fmt(total)}
          {manual && <span className="block text-[10px] font-normal text-amber-600">manual</span>}
        </span>
      )
      : <span className="text-xs text-gray-300">—</span>
  }

  const section = 'bg-white rounded-lg border border-gray-200'
  const sectionHead = 'px-4 py-2.5 border-b border-gray-100 flex items-center justify-between'
  const sectionTitle = 'text-sm font-semibold text-gray-800'
  const addBtn = 'text-xs font-medium text-[var(--olive)] hover:text-[var(--olive-dk)]'
  const removeBtn = 'text-gray-300 hover:text-red-500 text-sm px-1'

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
                className="text-xs text-gray-500 hover:text-[var(--olive-dk)] border border-gray-200 hover:border-[var(--olive-lt)] rounded px-2 py-1 disabled:opacity-50">
                {resyncing ? 'Syncing…' : '↻ Re-sync from itinerary'}
              </button>
            )}
            <button type="button" onClick={addRow} className={addBtn}>+ Add hotel row (↵)</button>
          </div>
        </div>
        {resyncError && <p className="px-4 pt-2 text-xs text-red-600">{resyncError}</p>}
        {rows.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-400">No hotel rows yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="stack-table w-full text-sm min-w-[1080px]">
              <thead>
                <tr className="text-left text-[11px] text-gray-400 border-b border-gray-100">
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
            <span className="text-xs text-gray-400">
              Editing draft {quoteNumber ? <span className="font-mono">{quoteNumber}</span> : 'quote'}
            </span>
          )}
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Guest name *</label>
            <input className={inputCls} value={guest.name}
              onChange={e => setGuest(g => ({ ...g, name: e.target.value }))}
              placeholder="e.g. Amina Hassan" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Email (links CRM client)</label>
            <input className={inputCls} type="email" value={guest.email}
              onChange={e => setGuest(g => ({ ...g, email: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Adults</label>
            <input className={inputCls} type="number" min={1} value={guest.adults}
              onChange={e => setGuest(g => ({ ...g, adults: Math.max(1, parseInt(e.target.value) || 1) }))} />
          </div>
          <div>
            <label className={labelCls}>Children</label>
            <input className={inputCls} type="number" min={0} max={12} value={guest.childAges.length}
              onChange={e => updateChildCount(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className={labelCls}>Trip start *</label>
            <input className={inputCls} type="date" value={guest.startDate}
              onChange={e => setGuest(g => ({ ...g, startDate: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Trip end *</label>
            <input className={inputCls} type="date" value={guest.endDate} min={guest.startDate || undefined}
              onChange={e => setGuest(g => ({ ...g, endDate: e.target.value }))} />
          </div>
        </div>
        {(guest.childAges.length > 0 || tripDays) && (
          <div className="px-4 pb-3 flex flex-wrap items-end gap-3">
            {guest.childAges.map((age, i) => (
              <div key={i}>
                <label className={labelCls}>Child {i + 1} age</label>
                <input className={inputCls + ' w-16'} type="number" min={0} max={17} value={age}
                  onChange={e => setGuest(g => ({
                    ...g,
                    childAges: g.childAges.map((a, j) => (j === i ? Math.max(0, Math.min(17, parseInt(e.target.value) || 0)) : a)),
                  }))} />
              </div>
            ))}
            {tripDays && (
              <p className="text-xs text-gray-500 pb-2 ml-auto">
                <span className="font-semibold text-gray-700">{tripDays}</span> day{tripDays === 1 ? '' : 's'} ·{' '}
                <span className="font-semibold text-gray-700">{tripDays - 1}</span> night{tripDays - 1 === 1 ? '' : 's'}
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
          <p className="px-4 py-4 text-sm text-gray-400">No transport rows yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="stack-table w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-[11px] text-gray-400 border-b border-gray-100">
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
          <p className="px-4 py-4 text-sm text-gray-400">No park rows yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="stack-table w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-[11px] text-gray-400 border-b border-gray-100">
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
          <span className="text-xs text-gray-400">USD · KES @ {fmt0(usdToKes)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="stack-table w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[11px] text-gray-400 border-b border-gray-100">
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
                const sale = parseFloat(salePrice)
                const hasSale = Number.isFinite(sale) && sale > 0
                const margin = hasSale ? sale - summary.total : null
                const marginPct = hasSale && sale > 0 ? ((sale - summary.total) / sale) * 100 : null
                return (
                  <tr className="border-b border-gray-50 last:border-0">
                    <td data-label="Hotels" className="px-3 py-2.5 text-right tabular-nums text-gray-700">${fmt(summary.hotels)}</td>
                    <td data-label="Transport" className="px-3 py-2.5 text-right tabular-nums text-gray-700">${fmt(transportTotal)}</td>
                    <td data-label="Parks" className="px-3 py-2.5 text-right tabular-nums text-gray-700">${fmt(parksTotal)}</td>
                    <td data-label="Total cost" className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900">
                      <span>
                        ${fmt(summary.total)}
                        <span className="block text-[10px] text-gray-400 font-normal">KES {fmt0(summary.total * usdToKes)}</span>
                      </span>
                    </td>
                    <td data-label="Per guest" className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                      {payingGuests > 0 ? `$${fmt(summary.total / payingGuests)}` : '—'}
                    </td>
                    <td data-label="Sale price" className="px-3 py-2.5 text-right">
                      <input
                        type="number" min={0} step="1"
                        className={inputCls + ' w-28 text-right tabular-nums inline-block'}
                        value={salePrice}
                        placeholder="0"
                        onChange={e => setSalePrice(e.target.value)}
                      />
                    </td>
                    <td data-label="Margin" className="px-3 py-2.5 text-right tabular-nums">
                      {margin === null ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span className={margin >= 0 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
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
        {payingGuests > 0 && (
          <p className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-50">
            Per guest = total ÷ {payingGuests} paying guest{payingGuests === 1 ? '' : 's'} (infants under 3 excluded).
          </p>
        )}
      </div>

      {/* Gap + error surface */}
      {(gapMessages.length > 0 || saveGaps.length > 0) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700 mb-1">Missing rates block saving:</p>
          <ul className="text-sm text-red-600 list-disc pl-5 space-y-0.5">
            {[...new Set([...gapMessages, ...saveGaps])].map(m => <li key={m}>{m}</li>)}
          </ul>
          <p className="text-xs text-red-500 mt-1.5">Add the missing rate cards in Content → Supplier Rates, then re-price.</p>
        </div>
      )}
      {saveError && !saveGaps.length && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg border border-red-200 px-4 py-3">{saveError}</p>
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
          <label className={labelCls}>Quote title (optional)</label>
          <input className={inputCls + ' w-72'} value={title}
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
        {anyPending && <span className="mt-4 text-xs text-gray-400 animate-pulse">Resolving rates…</span>}
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
