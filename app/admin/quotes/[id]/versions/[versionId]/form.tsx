'use client'

import { useState, useTransition } from 'react'
import { saveDates, saveLanguage, addTraveller, deleteTraveller, updateTraveller } from './actions'

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

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'
const labelCls = 'block text-sm font-medium text-foreground mb-1'

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
  quoteRequest,
}: {
  quoteId: string
  version: Version
  travellers: Traveller[]
  ageBands: AgeBand[]
  quoteRequest?: { start_date: string | null; duration_days: number | null } | null
}) {
  const isLocked = !['draft', 'ready'].includes(version.status)

  // Local copy of the traveller list — updated straight from the action
  // results so saves don't need a full page revalidation to show up.
  const [travellers, setTravellers] = useState<Traveller[]>(initialTravellers)

  // Calculate end date from start date + duration if available
  const calculateEndDate = (start: string, duration: number | null) => {
    if (!start || !duration) return ''
    const d = new Date(start)
    d.setDate(d.getDate() + duration - 1)
    return d.toISOString().split('T')[0]
  }

  // ── Dates ──────────────────────────────────────────────────────────────
  const defaultStartDate = version.travel_start_date || quoteRequest?.start_date || ''
  const defaultEndDate = version.travel_end_date ||
    (quoteRequest?.start_date && quoteRequest?.duration_days
      ? calculateEndDate(quoteRequest.start_date, quoteRequest.duration_days)
      : '')

  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)
  const [datesPending, startDateTransition] = useTransition()
  const [datesError, setDatesError] = useState('')
  const [datesSaved, setDatesSaved] = useState(false)

  function handleSaveDates() {
    setDatesError('')
    setDatesSaved(false)
    if (startDate && endDate && endDate < startDate) {
      setDatesError('End date cannot be before start date.')
      return
    }
    const fd = new FormData()
    fd.set('versionId', version.id)
    fd.set('quoteId', quoteId)
    fd.set('travelStartDate', startDate)
    fd.set('travelEndDate', endDate)
    startDateTransition(async () => {
      const result = await saveDates(fd)
      if (result.error) setDatesError(result.error)
      else setDatesSaved(true)
    })
  }

  // ── Language ────────────────────────────────────────────────────────────
  const [language, setLanguage] = useState(version.language ?? 'en')
  const [langPending, startLangTransition] = useTransition()
  const [langSaved, setLangSaved] = useState(false)
  const [langError, setLangError] = useState('')

  function handleSaveLang(lang: string) {
    const previous = language
    setLanguage(lang)
    setLangSaved(false)
    setLangError('')
    const fd = new FormData()
    fd.set('versionId', version.id)
    fd.set('quoteId', quoteId)
    fd.set('language', lang)
    startLangTransition(async () => {
      const result = await saveLanguage(fd)
      if (result.error) {
        setLanguage(previous)
        setLangError(result.error)
      } else {
        setLangSaved(true)
      }
    })
  }

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
  const [deleteError, setDeleteError] = useState('')

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
      const result = await addTraveller(buildAddFd(addForm))
      if (result.error !== null) {
        setAddError(result.error)
        return
      }
      setTravellers(prev => [...prev, result.traveller as unknown as Traveller])
      setAddForm(blankTravellerForm(ageBands))
      setShowAdd(false)
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
      const result = await updateTraveller(fd)
      if (result.error !== null) {
        setEditError(result.error)
        return
      }
      const updated = result.traveller as unknown as Traveller
      setTravellers(prev => prev.map(t => (t.id === updated.id ? updated : t)))
      setEditingId(null)
    })
  }

  function handleDelete(travellerId: string) {
    setDeleteError('')
    const fd = new FormData()
    fd.set('travellerId', travellerId)
    fd.set('versionId', version.id)
    fd.set('quoteId', quoteId)
    startDeleteTransition(async () => {
      const result = await deleteTraveller(fd)
      if (result.error) setDeleteError(result.error)
      else setTravellers(prev => prev.filter(t => t.id !== travellerId))
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
            <label htmlFor="name-optional" className={labelCls}>Name <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input id="name-optional"
              className={inputCls}
              placeholder="e.g. John"
              value={f.displayName}
              onChange={e => set({ displayName: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="age-on-travel-date-optional" className={labelCls}>Age on travel date <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input id="age-on-travel-date-optional"
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
            <label htmlFor="category" className={labelCls}>Category</label>
            <select id="category"
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
        <div className="rounded-md bg-surface-alt border border-border px-4 py-3 flex flex-wrap items-end gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Pricing method</p>
            <div className="flex gap-2 flex-wrap">
              {(['percentage', 'fixed', 'free'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set({ pricingMethod: m })}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    f.pricingMethod === m
                      ? 'border-primary-strong bg-accent text-[var(--olive-dk)]'
                      : 'border-border text-muted-foreground hover:border-gray-400'
                  }`}
                >
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
          {f.pricingMethod === 'percentage' && (
            <div>
              <label htmlFor="percentage" className="block text-xs text-muted-foreground mb-1">Percentage</label>
              <div className="flex items-center gap-1">
                <input id="percentage"
                  type="number"
                  min={0}
                  max={200}
                  step={0.5}
                  className="w-20 rounded-md border border-border px-2 py-1.5 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)]"
                  value={f.pricingPercent}
                  onChange={e => set({ pricingPercent: e.target.value })}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          )}
          {f.pricingMethod === 'fixed' && (
            <div>
              <label htmlFor="fixed-rate" className="block text-xs text-muted-foreground mb-1">Fixed rate</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">USD</span>
                <input id="fixed-rate"
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-28 rounded-md border border-border px-2 py-1.5 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)]"
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
            <label htmlFor="room-category" className={labelCls}>Room category</label>
            <select id="room-category"
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
                className="h-4 w-4 rounded border-border text-brand-text focus:ring-[var(--olive)]"
              />
              <span className="text-sm text-foreground">Paying traveller</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={f.isComplimentary}
                onChange={e => set({ isComplimentary: e.target.checked })}
                className="h-4 w-4 rounded border-border text-brand-text focus:ring-[var(--olive)]"
              />
              <span className="text-sm text-foreground">Complimentary</span>
            </label>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Trip Dates ─────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-surface shadow-sm p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Trip Dates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="travel-start-date" className={labelCls}>Travel start date</label>
            <input id="travel-start-date"
              type="date"
              className={inputCls}
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setDatesSaved(false) }}
              disabled={isLocked}
            />
          </div>
          <div>
            <label htmlFor="travel-end-date" className={labelCls}>Travel end date</label>
            <input id="travel-end-date"
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
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-3">{datesError}</p>
        )}
        {!isLocked && (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSaveDates}
              disabled={datesPending}
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 bg-olive hover:bg-olive-dk"
            >
              {datesPending ? 'Saving…' : 'Save Dates'}
            </button>
            {datesSaved && !datesPending && (
              <span className="text-sm text-green-600">Saved</span>
            )}
          </div>
        )}

        {/* Language / direction */}
        <div className="mt-4 pt-4 border-t border-border/70 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Quote language <span className="text-muted-foreground text-xs">(auto-set from client)</span>:</span>
          {(['en', 'ar'] as const).map(lang => (
            <button
              key={lang}
              type="button"
              disabled={isLocked || langPending}
              onClick={() => handleSaveLang(lang)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition disabled:opacity-50 ${
                language === lang
                  ? 'border-primary-strong bg-accent text-[var(--olive-dk)]'
                  : 'border-border text-muted-foreground hover:border-gray-400'
              }`}
            >
              {lang === 'en' ? '🇬🇧 English' : '🇸🇦 Arabic (RTL)'}
            </button>
          ))}
          {langSaved && !langPending && (
            <span className="text-xs text-green-600">Saved</span>
          )}
          {langError && (
            <span className="text-xs text-destructive">{langError}</span>
          )}
        </div>
      </section>

      {/* ── Travellers ─────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Travellers</h2>
            {travellers.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {travellers.filter(t => t.is_paying).length} paying
                {travellers.some(t => t.is_complimentary) &&
                  ` · ${travellers.filter(t => t.is_complimentary).length} complimentary`}
              </p>
            )}
          </div>
          {!isLocked && !showAdd && (
            <button
              type="button"
              onClick={() => { setShowAdd(true); setAddError('') }}
              className="text-sm font-medium text-brand-text hover:text-brand-ink"
            >
              + Add Traveller
            </button>
          )}
        </div>

        {/* Existing travellers */}
        {travellers.length > 0 && (
          <div className="divide-y divide-gray-50">
            {travellers.map((t, idx) => {
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
                        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{editError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleUpdate}
                          disabled={editPending}
                          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 bg-olive hover:bg-olive-dk"
                        >
                          {editPending ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground border border-border hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {t.display_name || <span className="text-muted-foreground">Unnamed</span>}
                            {t.age_on_travel_date != null && (
                              <span className="text-muted-foreground font-normal ml-1">· age {t.age_on_travel_date}</span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium capitalize">
                              {bandName}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {ROOM_LABELS[t.room_category] ?? t.room_category}
                            </span>
                            {method === 'percentage' && pct != null && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-warning-foreground">
                                {pct}%
                              </span>
                            )}
                            {method === 'free' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">Free</span>
                            )}
                            {!t.is_paying && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Non-paying</span>
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
                            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:border-border"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id)}
                            disabled={deletePending}
                            className="text-xs text-red-500 hover:opacity-80 px-2 py-1 rounded border border-red-100 hover:border-red-300 disabled:opacity-40"
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

        {deleteError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mx-6 my-3">{deleteError}</p>
        )}

        {travellers.length === 0 && !showAdd && (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No travellers added yet.
          </div>
        )}

        {/* Add traveller form */}
        {showAdd && !isLocked && (
          <div className="px-6 py-5 border-t border-border/70 bg-surface-alt/50">
            <p className="text-sm font-medium text-foreground mb-4">New traveller</p>
            <TravellerFormFields
              f={addForm}
              set={patch => setAddForm(f => ({ ...f, ...patch }))}
            />
            {addError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mt-3">{addError}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleAdd}
                disabled={addPending}
                className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 bg-olive hover:bg-olive-dk"
              >
                {addPending ? 'Adding…' : 'Add Traveller'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setAddError('') }}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground border border-border hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

    </div>
  )
}
