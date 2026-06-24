'use client'

import { useState, useTransition } from 'react'
import { saveDates, saveLanguage, savePricing, addTraveller, deleteTraveller, updateTraveller } from './actions'

interface AgeBand {
  id: string
  name: string
  code: string
  min_age: number
  max_age: number | null
  default_pricing_method: string
  default_percentage: number | null
  default_fixed_amount_usd: number | null
  sort_order: number
}

interface Traveller {
  id: string
  display_name: string | null
  age_on_travel_date: number | null
  age_band_id: string | null
  age_band_snapshot: Record<string, unknown>
  pricing_fixed_amount_usd: number | null
  traveller_category: string
  room_category: string
  is_paying: boolean
  is_complimentary: boolean
  sort_order: number
}

interface Version {
  id: string
  version_number: number
  status: string
  travel_start_date: string | null
  travel_end_date: string | null
  language?: string | null
  cost_base_usd: number | null
  default_markup_percent: number
}

const ROOM_OPTIONS = [
  { value: 'sharing', label: 'Sharing' },
  { value: 'single', label: 'Single Room' },
  { value: 'triple', label: 'Triple Room' },
  { value: 'extra_bed', label: 'Extra Bed' },
  { value: 'no_bed', label: 'No Bed' },
]

const ROOM_LABELS: Record<string, string> = {
  sharing: 'Sharing', single: 'Single', triple: 'Triple', extra_bed: 'Extra Bed', no_bed: 'No Bed',
}

const METHOD_LABELS: Record<string, string> = {
  percentage: '% of adult rate', fixed: 'Fixed price', free: 'Free (no charge)',
}

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

function blankTravellerForm(ageBands: AgeBand[]) {
  const adultBand = ageBands.find(b => b.code === 'adult') ?? ageBands[ageBands.length - 1]
  return {
    displayName: '',
    age: '',
    ageBandId: adultBand?.id ?? '',
    travellerCategory: adultBand?.code ?? 'adult',
    roomCategory: 'sharing',
    isPaying: true,
    isComplimentary: false,
    pricingMethod: adultBand?.default_pricing_method ?? 'percentage',
    pricingPercent: String(
      adultBand?.default_pricing_method === 'fixed'
        ? (adultBand.default_fixed_amount_usd ?? 0)
        : (adultBand?.default_percentage ?? 100)
    ),
  }
}

export default function VersionEditorForm({
  quoteId,
  version,
  travellers: initialTravellers,
  ageBands,
}: {
  quoteId: string
  version: Version
  travellers: Traveller[]
  ageBands: AgeBand[]
}) {
  const isLocked = !['draft', 'ready'].includes(version.status)

  // ── Dates ──────────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(version.travel_start_date ?? '')
  const [endDate, setEndDate] = useState(version.travel_end_date ?? '')
  const [datesPending, startDateTransition] = useTransition()
  const [datesError, setDatesError] = useState('')
  const [datesSaved, setDatesSaved] = useState(false)

  function handleSaveDates() {
    setDatesError('')
    setDatesSaved(false)
    const fd = new FormData()
    fd.set('versionId', version.id)
    fd.set('quoteId', quoteId)
    fd.set('travelStartDate', startDate)
    fd.set('travelEndDate', endDate)
    startDateTransition(async () => {
      try {
        await saveDates(fd)
        setDatesSaved(true)
      } catch (err: unknown) {
        setDatesError(err instanceof Error ? err.message : 'Failed to save dates.')
      }
    })
  }

  // ── Language ────────────────────────────────────────────────────────────
  const [language, setLanguage] = useState(version.language ?? 'en')
  const [langPending, startLangTransition] = useTransition()
  const [langSaved, setLangSaved] = useState(false)

  function handleSaveLang(lang: string) {
    setLanguage(lang)
    setLangSaved(false)
    const fd = new FormData()
    fd.set('versionId', version.id)
    fd.set('quoteId', quoteId)
    fd.set('language', lang)
    startLangTransition(async () => {
      try {
        await saveLanguage(fd)
        setLangSaved(true)
      } catch { /* ignore */ }
    })
  }

  // ── Pricing ─────────────────────────────────────────────────────────────
  const [costBase, setCostBase] = useState(version.cost_base_usd ? String(version.cost_base_usd) : '')
  const [markupPercent, setMarkupPercent] = useState(String(version.default_markup_percent ?? 0))
  const [pricingPending, startPricingTransition] = useTransition()
  const [pricingError, setPricingError] = useState('')
  const [pricingSaved, setPricingSaved] = useState(false)

  function handleSavePricing() {
    setPricingError('')
    setPricingSaved(false)
    const fd = new FormData()
    fd.set('versionId', version.id)
    fd.set('quoteId', quoteId)
    fd.set('costBase', costBase)
    fd.set('markupPercent', markupPercent)
    startPricingTransition(async () => {
      try {
        await savePricing(fd)
        setPricingSaved(true)
      } catch (err: unknown) {
        setPricingError(err instanceof Error ? err.message : 'Failed to save pricing.')
      }
    })
  }

  // Calculate client price for preview
  const costBaseNum = costBase ? parseFloat(costBase) : 0
  const markupNum = markupPercent ? parseFloat(markupPercent) : 0
  const clientPrice = costBaseNum > 0 ? costBaseNum * (1 + markupNum / 100) : 0
  const markup = clientPrice - costBaseNum

  // ── Add traveller ───────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(() => blankTravellerForm(ageBands))
  const [addPending, startAddTransition] = useTransition()
  const [addError, setAddError] = useState('')

  // ── Edit traveller ──────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(() => blankTravellerForm(ageBands))
  const [editPending, startEditTransition] = useTransition()
  const [editError, setEditError] = useState('')

  // ── Delete ──────────────────────────────────────────────────────────────
  const [deletePending, startDeleteTransition] = useTransition()

  // ── Helpers ─────────────────────────────────────────────────────────────
  function classifyAge(ageStr: string, currentBandId: string): Partial<typeof addForm> {
    const age = parseInt(ageStr)
    if (isNaN(age)) return { age: ageStr }
    const band = ageBands.find(b => age >= b.min_age && (b.max_age === null || age <= b.max_age))
    if (!band) return { age: ageStr }
    return {
      age: ageStr,
      ageBandId: band.id,
      travellerCategory: band.code,
      pricingMethod: band.default_pricing_method,
      pricingPercent: String(
        band.default_pricing_method === 'fixed'
          ? (band.default_fixed_amount_usd ?? 0)
          : (band.default_percentage ?? 100)
      ),
    }
  }

  function bandForId(id: string): AgeBand | undefined {
    return ageBands.find(b => b.id === id)
  }

  function applyBandChange(bandId: string): Partial<typeof addForm> {
    const band = bandForId(bandId)
    if (!band) return { ageBandId: bandId }
    return {
      ageBandId: bandId,
      travellerCategory: band.code,
      pricingMethod: band.default_pricing_method,
      pricingPercent: String(
        band.default_pricing_method === 'fixed'
          ? (band.default_fixed_amount_usd ?? 0)
          : (band.default_percentage ?? 100)
      ),
    }
  }

  function buildAddFd(f: typeof addForm) {
    const fd = new FormData()
    fd.set('versionId', version.id)
    fd.set('quoteId', quoteId)
    fd.set('displayName', f.displayName)
    fd.set('age', f.age)
    fd.set('ageBandId', f.ageBandId)
    fd.set('travellerCategory', f.travellerCategory)
    fd.set('roomCategory', f.roomCategory)
    fd.set('isPaying', String(f.isPaying))
    fd.set('isComplimentary', String(f.isComplimentary))
    fd.set('pricingMethod', f.pricingMethod)
    fd.set('pricingPercent', f.pricingPercent)
    return fd
  }

  function handleAdd() {
    setAddError('')
    startAddTransition(async () => {
      try {
        await addTraveller(buildAddFd(addForm))
        setAddForm(blankTravellerForm(ageBands))
        setShowAdd(false)
      } catch (err: unknown) {
        setAddError(err instanceof Error ? err.message : 'Failed to add traveller.')
      }
    })
  }

  function openEdit(t: Traveller) {
    const snap = t.age_band_snapshot as Record<string, unknown>
    setEditForm({
      displayName: t.display_name ?? '',
      age: t.age_on_travel_date != null ? String(t.age_on_travel_date) : '',
      ageBandId: t.age_band_id ?? ageBands[0]?.id ?? '',
      travellerCategory: t.traveller_category,
      roomCategory: t.room_category,
      isPaying: t.is_paying,
      isComplimentary: t.is_complimentary,
      pricingMethod: (snap.default_pricing_method as string) ?? 'percentage',
      pricingPercent: (snap.default_pricing_method as string) === 'fixed'
        ? String(t.pricing_fixed_amount_usd ?? snap.default_fixed_amount_usd ?? 0)
        : String(snap.default_percentage ?? 100),
    })
    setEditingId(t.id)
    setEditError('')
  }

  function handleUpdate() {
    setEditError('')
    const fd = buildAddFd(editForm)
    fd.set('travellerId', editingId!)
    startEditTransition(async () => {
      try {
        await updateTraveller(fd)
        setEditingId(null)
      } catch (err: unknown) {
        setEditError(err instanceof Error ? err.message : 'Failed to update traveller.')
      }
    })
  }

  function handleDelete(travellerId: string) {
    const fd = new FormData()
    fd.set('travellerId', travellerId)
    fd.set('versionId', version.id)
    fd.set('quoteId', quoteId)
    startDeleteTransition(async () => {
      await deleteTraveller(fd)
    })
  }

  function TravellerFormFields({
    f,
    set,
  }: {
    f: typeof addForm
    set: (patch: Partial<typeof addForm>) => void
  }) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Name <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              className={inputCls}
              placeholder="e.g. John"
              value={f.displayName}
              onChange={e => set({ displayName: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Age on travel date <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="number"
              min={0}
              max={120}
              className={inputCls}
              placeholder="e.g. 34"
              value={f.age}
              onChange={e => set(classifyAge(e.target.value, f.ageBandId))}
            />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select
              className={inputCls}
              value={f.ageBandId}
              onChange={e => set(applyBandChange(e.target.value))}
            >
              {ageBands.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.max_age != null ? ` (${b.min_age}–${b.max_age})` : ` (${b.min_age}+)`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 flex flex-wrap items-end gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Pricing method</p>
            <div className="flex gap-2 flex-wrap">
              {(['percentage', 'fixed', 'free'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set({ pricingMethod: m })}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    f.pricingMethod === m
                      ? 'border-[#7A9A4A] bg-[#7A9A4A]/10 text-[#4C5E2A]'
                      : 'border-gray-300 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
          {f.pricingMethod === 'percentage' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Percentage</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={200}
                  step={0.5}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]"
                  value={f.pricingPercent}
                  onChange={e => set({ pricingPercent: e.target.value })}
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
          )}
          {f.pricingMethod === 'fixed' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Fixed rate</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">USD</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]"
                  value={f.pricingPercent}
                  onChange={e => set({ pricingPercent: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Room category</label>
            <select
              className={inputCls}
              value={f.roomCategory}
              onChange={e => set({ roomCategory: e.target.value })}
            >
              {ROOM_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-3 justify-end pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={f.isPaying}
                onChange={e => set({ isPaying: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#7A9A4A] focus:ring-[#7A9A4A]"
              />
              <span className="text-sm text-gray-700">Paying traveller</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={f.isComplimentary}
                onChange={e => set({ isComplimentary: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#7A9A4A] focus:ring-[#7A9A4A]"
              />
              <span className="text-sm text-gray-700">Complimentary</span>
            </label>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Trip Dates ─────────────────────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Trip Dates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>Travel start date</label>
            <input
              type="date"
              className={inputCls}
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setDatesSaved(false) }}
              disabled={isLocked}
            />
          </div>
          <div>
            <label className={labelCls}>Travel end date</label>
            <input
              type="date"
              className={inputCls}
              value={endDate}
              min={startDate || undefined}
              onChange={e => { setEndDate(e.target.value); setDatesSaved(false) }}
              disabled={isLocked}
            />
          </div>
        </div>
        {datesError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2 mb-3">{datesError}</p>
        )}
        {!isLocked && (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSaveDates}
              disabled={datesPending}
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: '#7A9A4A' }}
            >
              {datesPending ? 'Saving…' : 'Save Dates'}
            </button>
            {datesSaved && !datesPending && (
              <span className="text-sm text-green-600">Saved</span>
            )}
          </div>
        )}

        {/* Language / direction */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-500">Quote language <span className="text-gray-400 text-xs">(auto-set from client)</span>:</span>
          {(['en', 'ar'] as const).map(lang => (
            <button
              key={lang}
              type="button"
              disabled={isLocked || langPending}
              onClick={() => handleSaveLang(lang)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition disabled:opacity-50 ${
                language === lang
                  ? 'border-[#7A9A4A] bg-[#7A9A4A]/10 text-[#4C5E2A]'
                  : 'border-gray-300 text-gray-500 hover:border-gray-400'
              }`}
            >
              {lang === 'en' ? '🇬🇧 English' : '🇸🇦 Arabic (RTL)'}
            </button>
          ))}
          {langSaved && !langPending && (
            <span className="text-xs text-green-600">Saved</span>
          )}
        </div>
      </section>

      {/* ── Travellers ─────────────────────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Travellers</h2>
            {initialTravellers.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {initialTravellers.filter(t => t.is_paying).length} paying
                {initialTravellers.some(t => t.is_complimentary) &&
                  ` · ${initialTravellers.filter(t => t.is_complimentary).length} complimentary`}
              </p>
            )}
          </div>
          {!isLocked && !showAdd && (
            <button
              type="button"
              onClick={() => { setShowAdd(true); setAddError('') }}
              className="text-sm font-medium text-[#7A9A4A] hover:text-[#4C5E2A]"
            >
              + Add Traveller
            </button>
          )}
        </div>

        {/* Existing travellers */}
        {initialTravellers.length > 0 && (
          <div className="divide-y divide-gray-50">
            {initialTravellers.map((t, idx) => {
              const snap = t.age_band_snapshot as Record<string, unknown>
              const bandName = (snap.name as string) ?? t.traveller_category
              const method = (snap.default_pricing_method as string) ?? 'percentage'
              const pct = snap.default_percentage as number | null
              const isEditing = editingId === t.id

              return (
                <div key={t.id} className="px-6 py-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <TravellerFormFields
                        f={editForm}
                        set={patch => setEditForm(f => ({ ...f, ...patch }))}
                      />
                      {editError && (
                        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{editError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleUpdate}
                          disabled={editPending}
                          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                          style={{ backgroundColor: '#7A9A4A' }}
                        >
                          {editPending ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500 shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {t.display_name || <span className="text-gray-400">Unnamed</span>}
                            {t.age_on_travel_date != null && (
                              <span className="text-gray-400 font-normal ml-1">· age {t.age_on_travel_date}</span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium capitalize">
                              {bandName}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {ROOM_LABELS[t.room_category] ?? t.room_category}
                            </span>
                            {method === 'percentage' && pct != null && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                {pct}%
                              </span>
                            )}
                            {method === 'free' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">Free</span>
                            )}
                            {!t.is_paying && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Non-paying</span>
                            )}
                            {t.is_complimentary && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">Comp</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isLocked && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEdit(t)}
                            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id)}
                            disabled={deletePending}
                            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-100 hover:border-red-300 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {initialTravellers.length === 0 && !showAdd && (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            No travellers added yet.
          </div>
        )}

        {/* Add traveller form */}
        {showAdd && !isLocked && (
          <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm font-medium text-gray-700 mb-4">New traveller</p>
            <TravellerFormFields
              f={addForm}
              set={patch => setAddForm(f => ({ ...f, ...patch }))}
            />
            {addError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2 mt-3">{addError}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleAdd}
                disabled={addPending}
                className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: '#7A9A4A' }}
              >
                {addPending ? 'Adding…' : 'Add Traveller'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setAddError('') }}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Quote-Level Pricing</h2>
        <p className="text-sm text-gray-500 mb-4">Set a cost base and markup percentage to calculate the client price.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={labelCls}>Cost Base (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              value={costBase}
              onChange={e => { setCostBase(e.target.value); setPricingSaved(false) }}
              disabled={isLocked}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={labelCls}>Markup (%)</label>
            <input
              type="number"
              min="0"
              max="500"
              step="0.1"
              className={inputCls}
              value={markupPercent}
              onChange={e => { setMarkupPercent(e.target.value); setPricingSaved(false) }}
              disabled={isLocked}
              placeholder="0"
            />
          </div>
          <div>
            <label className={labelCls}>Client Price (USD)</label>
            <div className={inputCls.replace('focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]', '').replace('text-gray-900', 'text-gray-700').replace('bg-white', 'bg-gray-50').replace('border-gray-300', 'border-gray-200')} style={{ display: 'flex', alignItems: 'center' }}>
              <span className="font-semibold">${clientPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
        {costBaseNum > 0 && markupNum > 0 && (
          <div className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
            ${costBaseNum.toFixed(2)} + ${markup.toFixed(2)} (markup) = ${clientPrice.toFixed(2)} (client price)
          </div>
        )}
        {pricingError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2 mb-3">{pricingError}</p>
        )}
        {!isLocked && (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSavePricing}
              disabled={pricingPending}
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: '#7A9A4A' }}
            >
              {pricingPending ? 'Saving…' : 'Save Pricing'}
            </button>
            {pricingSaved && !pricingPending && (
              <span className="text-sm text-green-600">Saved</span>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
