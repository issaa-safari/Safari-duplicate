'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import { addPriceLine, updatePriceLine, deletePriceLine, bulkSetMarkup } from './price-line-actions'
import RatePicker from './rate-picker'

const CATEGORIES = [
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'activities',    label: 'Activities' },
  { value: 'park_fees',     label: 'Park Fees' },
  { value: 'transport',     label: 'Transport' },
  { value: 'staff',         label: 'Staff' },
  { value: 'meals',         label: 'Meals' },
  { value: 'flights',       label: 'Flights' },
  { value: 'other',         label: 'Other' },
]

const UNITS = [
  { value: 'person',  label: '/person' },
  { value: 'room',    label: '/room' },
  { value: 'vehicle', label: '/vehicle' },
  { value: 'group',   label: '/group' },
  { value: 'day',     label: '/day' },
  { value: 'night',   label: '/night' },
  { value: 'trip',    label: '/trip' },
]

const CATEGORY_COLORS: Record<string, string> = {
  accommodation: 'bg-blue-50 text-blue-700 border-blue-200',
  activities:    'bg-green-50 text-green-700 border-green-200',
  park_fees:     'bg-amber-50 text-amber-700 border-amber-200',
  transport:     'bg-purple-50 text-purple-700 border-purple-200',
  staff:         'bg-pink-50 text-pink-700 border-pink-200',
  meals:         'bg-orange-50 text-orange-700 border-orange-200',
  flights:       'bg-sky-50 text-sky-700 border-sky-200',
  other:         'bg-gray-100 text-gray-600 border-gray-200',
}

interface PriceLine {
  id: string
  description: string
  cost_category: string
  pricing_unit: string
  quantity: number
  unit_cost_usd: number
  markup_percent_override: number | null
  total_cost_usd: number
  total_selling_usd: number
  is_optional: boolean
  sort_order: number
}

interface LocalLine {
  id: string
  description: string
  costCategory: string
  pricingUnit: string
  quantity: string
  unitCostUsd: string
  markupPercent: string
  isOptional: boolean
  totalCostUsd: number
  totalSellingUsd: number
}

interface EntityList { id: string; name: string }

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calcTotals(qty: string, cost: string, markup: string) {
  const q = parseFloat(qty)
  const c = parseFloat(cost)
  const m = parseFloat(markup)
  if (!isFinite(q) || !isFinite(c) || !isFinite(m)) return null
  const totalCost = q * c
  const totalSelling = totalCost * (1 + m / 100)
  return { totalCost, totalSelling }
}

function toLocal(line: PriceLine, defaultMarkup: number): LocalLine {
  return {
    id: line.id,
    description: line.description,
    costCategory: line.cost_category,
    pricingUnit: line.pricing_unit,
    quantity: String(line.quantity),
    unitCostUsd: String(line.unit_cost_usd),
    markupPercent: String(line.markup_percent_override ?? defaultMarkup),
    isOptional: line.is_optional,
    totalCostUsd: line.total_cost_usd,
    totalSellingUsd: line.total_selling_usd,
  }
}

const cellCls = 'w-full bg-transparent border-0 border-b border-transparent focus:border-[#7A9A4A] focus:outline-none px-1 py-0.5 text-sm text-gray-900 placeholder-gray-300 transition-colors hover:border-gray-300'
const numCls  = cellCls + ' text-right tabular-nums'

function blankForm(category: string, defaultMarkup = 20) {
  return {
    description: '',
    costCategory: category,
    pricingUnit: 'person',
    quantity: '1',
    unitCostUsd: '',
    markupPercent: String(defaultMarkup),
    isOptional: false,
  }
}

export default function PriceLinesEditor({
  quoteId,
  versionId,
  priceLines: initial,
  isLocked,
  defaultMarkup = 20,
  entities,
}: {
  quoteId: string
  versionId: string
  priceLines: PriceLine[]
  isLocked: boolean
  defaultMarkup?: number
  entities?: {
    accommodation: EntityList[]
    vehicle: EntityList[]
    activity: EntityList[]
    staff: EntityList[]
    park_fee: EntityList[]
  }
}) {
  const [lines, setLines] = useState<LocalLine[]>(() =>
    initial.map(l => toLocal(l, defaultMarkup))
  )
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds]   = useState<Set<string>>(new Set())
  const [errorIds, setErrorIds]   = useState<Record<string, string>>({})

  const [addingCategory, setAddingCategory] = useState<string | null>(null)
  const [addForm, setAddForm] = useState(() => blankForm('accommodation', defaultMarkup))
  const [addPending, startAddTransition] = useTransition()
  const [addError, setAddError] = useState('')

  const [showRatePicker, setShowRatePicker] = useState(false)
  const [bulkMarkup, setBulkMarkup] = useState('')
  const [bulkError, setBulkError]   = useState('')
  const [bulkPending, startBulkTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()

  // Track last-saved values to skip no-op saves
  const savedValuesRef = useRef<Record<string, string>>({})

  const totalCost    = lines.reduce((s, l) => s + l.totalCostUsd, 0)
  const totalSelling = lines.reduce((s, l) => s + l.totalSellingUsd, 0)
  const margin = totalSelling > 0 ? ((totalSelling - totalCost) / totalSelling) * 100 : 0

  // ── Local update (immediate, no server call) ──────────────────────────
  function updateLocal(id: string, patch: Partial<LocalLine>) {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l
      const updated = { ...l, ...patch }
      // Recalculate totals live
      const t = calcTotals(updated.quantity, updated.unitCostUsd, updated.markupPercent)
      if (t) {
        updated.totalCostUsd    = t.totalCost
        updated.totalSellingUsd = t.totalSelling
      }
      return updated
    }))
  }

  // ── Auto-save on blur ─────────────────────────────────────────────────
  const autoSave = useCallback(async (line: LocalLine) => {
    const key = line.id
    const snapshot = JSON.stringify({
      description: line.description,
      costCategory: line.costCategory,
      pricingUnit: line.pricingUnit,
      quantity: line.quantity,
      unitCostUsd: line.unitCostUsd,
      markupPercent: line.markupPercent,
      isOptional: line.isOptional,
    })

    // Skip if nothing changed since last save
    if (savedValuesRef.current[key] === snapshot) return

    // Validate minimally
    if (!line.description.trim()) return
    if (!isFinite(parseFloat(line.quantity)) || parseFloat(line.quantity) <= 0) return
    if (!isFinite(parseFloat(line.unitCostUsd)) || parseFloat(line.unitCostUsd) < 0) return
    if (!isFinite(parseFloat(line.markupPercent)) || parseFloat(line.markupPercent) < 0) return

    setSavingIds(prev => new Set(prev).add(key))
    setErrorIds(prev => { const n = { ...prev }; delete n[key]; return n })

    const fd = new FormData()
    fd.set('lineId', line.id)
    fd.set('versionId', versionId)
    fd.set('quoteId', quoteId)
    fd.set('description', line.description)
    fd.set('costCategory', line.costCategory)
    fd.set('pricingUnit', line.pricingUnit)
    fd.set('quantity', line.quantity)
    fd.set('unitCostUsd', line.unitCostUsd)
    fd.set('markupPercent', line.markupPercent)
    fd.set('isOptional', String(line.isOptional))

    try {
      await updatePriceLine(fd)
      savedValuesRef.current[key] = snapshot
      setSavedIds(prev => { const n = new Set(prev); n.add(key); return n })
      setTimeout(() => setSavedIds(prev => { const n = new Set(prev); n.delete(key); return n }), 1500)
    } catch (err) {
      setErrorIds(prev => ({ ...prev, [key]: err instanceof Error ? err.message : 'Save failed' }))
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }, [versionId, quoteId])

  // ── Delete ────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    const fd = new FormData()
    fd.set('lineId', id)
    fd.set('versionId', versionId)
    fd.set('quoteId', quoteId)
    startDeleteTransition(async () => {
      await deletePriceLine(fd)
      setLines(prev => prev.filter(l => l.id !== id))
    })
  }

  // ── Add new line ──────────────────────────────────────────────────────
  function handleAdd() {
    setAddError('')
    const fd = new FormData()
    fd.set('versionId', versionId)
    fd.set('quoteId', quoteId)
    fd.set('description', addForm.description)
    fd.set('costCategory', addForm.costCategory)
    fd.set('pricingUnit', addForm.pricingUnit)
    fd.set('quantity', addForm.quantity)
    fd.set('unitCostUsd', addForm.unitCostUsd)
    fd.set('markupPercent', addForm.markupPercent)
    fd.set('isOptional', String(addForm.isOptional))
    startAddTransition(async () => {
      try {
        await addPriceLine(fd)
        setAddingCategory(null)
        // reload to get new line with server-assigned id
        window.location.reload()
      } catch (err) {
        setAddError(err instanceof Error ? err.message : 'Failed to add line.')
      }
    })
  }

  const addTotals = calcTotals(addForm.quantity, addForm.unitCostUsd, addForm.markupPercent)

  return (
    <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Pricing</h2>
        {lines.length > 0 && (
          <span className="text-xs text-gray-400">{lines.length} line{lines.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Column headers + rows — horizontally scrollable on mobile */}
      <div className="overflow-x-auto">
        <div className="min-w-[620px]">

      {/* Column headers */}
      {lines.length > 0 && (
        <div className="grid px-4 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100"
          style={{ gridTemplateColumns: '120px 1fr 52px 88px 80px 56px 72px 40px' }}>
          <span>Category</span>
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Unit cost</span>
          <span>Unit</span>
          <span className="text-right">Markup</span>
          <span className="text-right">Selling</span>
          <span />
        </div>
      )}

      {/* Existing lines — always editable */}
      <div className="divide-y divide-gray-50">
        {lines.length === 0 && !addingCategory && !showRatePicker && (
          <p className="px-4 py-6 text-center text-sm text-gray-400">
            {isLocked ? 'No price lines.' : 'No price lines yet — add one below.'}
          </p>
        )}

        {lines.map(line => {
          const isSaving = savingIds.has(line.id)
          const isSaved  = savedIds.has(line.id)
          const lineErr  = errorIds[line.id]

          return (
            <div key={line.id}>
              <div
                className="grid px-4 py-2 items-center gap-1 group"
                style={{ gridTemplateColumns: '120px 1fr 52px 88px 80px 56px 72px 40px' }}
              >
                {/* Category */}
                {isLocked ? (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium border ${CATEGORY_COLORS[line.costCategory] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {CATEGORIES.find(c => c.value === line.costCategory)?.label ?? line.costCategory}
                  </span>
                ) : (
                  <select
                    value={line.costCategory}
                    onChange={e => updateLocal(line.id, { costCategory: e.target.value })}
                    onBlur={() => autoSave(line)}
                    className={`text-xs rounded border px-1 py-0.5 font-medium focus:outline-none focus:ring-1 focus:ring-[#7A9A4A] ${CATEGORY_COLORS[line.costCategory] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                )}

                {/* Description */}
                {isLocked ? (
                  <span className="text-sm text-gray-900 px-1 truncate">{line.description}</span>
                ) : (
                  <input
                    value={line.description}
                    onChange={e => updateLocal(line.id, { description: e.target.value })}
                    onBlur={() => autoSave({ ...line, description: line.description })}
                    placeholder="Description…"
                    className={cellCls}
                  />
                )}

                {/* Quantity */}
                {isLocked ? (
                  <span className="text-sm text-right text-gray-600 pr-1 tabular-nums">{line.quantity}</span>
                ) : (
                  <input
                    type="number" min="0.01" step="0.01"
                    value={line.quantity}
                    onChange={e => updateLocal(line.id, { quantity: e.target.value })}
                    onBlur={() => autoSave(line)}
                    className={numCls}
                  />
                )}

                {/* Unit cost */}
                {isLocked ? (
                  <span className="text-sm text-right text-gray-600 pr-1 tabular-nums">${fmt(parseFloat(line.unitCostUsd))}</span>
                ) : (
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs text-gray-400 shrink-0">$</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={line.unitCostUsd}
                      onChange={e => updateLocal(line.id, { unitCostUsd: e.target.value })}
                      onBlur={() => autoSave(line)}
                      placeholder="0.00"
                      className={numCls + ' flex-1'}
                    />
                  </div>
                )}

                {/* Unit */}
                {isLocked ? (
                  <span className="text-xs text-gray-400 px-1">
                    {UNITS.find(u => u.value === line.pricingUnit)?.label ?? line.pricingUnit}
                  </span>
                ) : (
                  <select
                    value={line.pricingUnit}
                    onChange={e => updateLocal(line.id, { pricingUnit: e.target.value })}
                    onBlur={() => autoSave(line)}
                    className="text-xs rounded border border-transparent hover:border-gray-300 focus:border-[#7A9A4A] focus:outline-none px-1 py-0.5 bg-transparent text-gray-600 w-full"
                  >
                    {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                )}

                {/* Markup % */}
                {isLocked ? (
                  <span className="text-sm text-right text-gray-600 pr-1 tabular-nums">{line.markupPercent}%</span>
                ) : (
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number" min="0" step="0.5"
                      value={line.markupPercent}
                      onChange={e => updateLocal(line.id, { markupPercent: e.target.value })}
                      onBlur={() => autoSave(line)}
                      className={numCls + ' flex-1'}
                    />
                    <span className="text-xs text-gray-400 shrink-0">%</span>
                  </div>
                )}

                {/* Selling price */}
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    ${fmt(line.totalSellingUsd)}
                  </span>
                  {isSaving && <span className="block text-[10px] text-gray-400">saving…</span>}
                  {isSaved  && <span className="block text-[10px] text-green-500">✓</span>}
                  {line.isOptional && <span className="block text-[10px] text-gray-400 italic">optional</span>}
                </div>

                {/* Delete */}
                {!isLocked ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(line.id)}
                    disabled={deletePending}
                    className="text-gray-300 hover:text-red-400 text-lg leading-none disabled:opacity-30 justify-self-center"
                    title="Remove line"
                  >
                    ×
                  </button>
                ) : <span />}
              </div>

              {/* Optional toggle + error */}
              {!isLocked && (
                <div className="px-4 pb-1.5 flex items-center gap-3">
                  <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={line.isOptional}
                      onChange={e => {
                        updateLocal(line.id, { isOptional: e.target.checked })
                        setTimeout(() => autoSave({ ...line, isOptional: e.target.checked }), 0)
                      }}
                      className="h-3 w-3 rounded border-gray-300 text-[#7A9A4A]"
                    />
                    Optional add-on
                  </label>
                  {lineErr && <span className="text-[10px] text-red-500">{lineErr}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

        </div>{/* /min-w-[620px] */}
      </div>{/* /overflow-x-auto */}

      {/* ── Add form ───────────────────────────────────────────────────── */}
      {addingCategory && !isLocked && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/60 space-y-2">
          <input
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#7A9A4A] bg-white"
            value={addForm.description}
            onChange={e => setAddForm(v => ({ ...v, description: e.target.value }))}
            placeholder="Description…"
            autoFocus
          />
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <select
              className="rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#7A9A4A]"
              value={addForm.costCategory}
              onChange={e => setAddForm(v => ({ ...v, costCategory: e.target.value }))}
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input
              type="number" min="0.01" step="0.01"
              className="w-16 text-center rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#7A9A4A] bg-white"
              value={addForm.quantity}
              onChange={e => setAddForm(v => ({ ...v, quantity: e.target.value }))}
              title="Quantity"
            />
            <span>×</span>
            <div className="flex items-center gap-0.5">
              <span className="text-gray-400">$</span>
              <input
                type="number" min="0" step="0.01"
                className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#7A9A4A] bg-white"
                value={addForm.unitCostUsd}
                onChange={e => setAddForm(v => ({ ...v, unitCostUsd: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <select
              className="rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#7A9A4A]"
              value={addForm.pricingUnit}
              onChange={e => setAddForm(v => ({ ...v, pricingUnit: e.target.value }))}
            >
              {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-0.5">
              <input
                type="number" min="0" step="0.5"
                className="w-14 text-center rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#7A9A4A] bg-white"
                value={addForm.markupPercent}
                onChange={e => setAddForm(v => ({ ...v, markupPercent: e.target.value }))}
              />
              <span>%</span>
            </div>
            {addTotals && (
              <span className="font-semibold text-gray-900">
                → ${fmt(addTotals.totalSelling)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 pt-0.5">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={addForm.isOptional}
                onChange={e => setAddForm(v => ({ ...v, isOptional: e.target.checked }))}
                className="h-3.5 w-3.5 rounded border-gray-300 text-[#7A9A4A]"
              />
              Optional add-on
            </label>
            <div className="flex items-center gap-2 ml-auto">
              {entities && (
                <button type="button"
                  onClick={() => { setAddingCategory(null); setShowRatePicker(true) }}
                  className="text-xs text-[#7A9A4A] hover:text-[#4C5E2A]">
                  ⚡ Rate card
                </button>
              )}
              <button type="button"
                onClick={() => { setAddingCategory(null); setAddError('') }}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded border border-gray-200">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={addPending || !addForm.description.trim() || !addForm.unitCostUsd}
                className="text-xs font-medium text-white px-3 py-1 rounded disabled:opacity-50"
                style={{ backgroundColor: '#7A9A4A' }}
              >
                {addPending ? '…' : 'Add'}
              </button>
            </div>
          </div>
          {addError && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{addError}</p>}
        </div>
      )}

      {/* Rate card picker */}
      {showRatePicker && !isLocked && entities && (
        <div className="px-4 py-4 border-t border-gray-100">
          <RatePicker
            versionId={versionId}
            quoteId={quoteId}
            defaultMarkup={defaultMarkup}
            entities={entities}
            onAdded={() => { setShowRatePicker(false); window.location.reload() }}
            onCancel={() => setShowRatePicker(false)}
          />
        </div>
      )}

      {/* Category add buttons */}
      {!isLocked && !addingCategory && !showRatePicker && (
        <div className="border-t border-gray-100">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              type="button"
              onClick={() => {
                setAddForm(blankForm(cat.value, defaultMarkup))
                setAddingCategory(cat.value)
                setAddError('')
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-500 border-b border-gray-100 last:border-0 hover:bg-gray-50 hover:text-gray-800 transition-colors"
            >
              + {cat.label}…
            </button>
          ))}
          {entities && (
            <button
              type="button"
              onClick={() => { setShowRatePicker(true); setAddError('') }}
              className="w-full text-left px-4 py-2.5 text-sm text-[#7A9A4A] hover:bg-[#7A9A4A]/5 transition-colors border-t border-gray-100"
            >
              ⚡ From rate card…
            </button>
          )}
        </div>
      )}

      {/* Bulk markup */}
      {!isLocked && lines.length > 1 && !addingCategory && !showRatePicker && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-amber-50/50 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Set all markups to:</span>
          <input
            type="number" min="0" step="0.5"
            className="w-16 text-center rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#7A9A4A]"
            value={bulkMarkup}
            onChange={e => setBulkMarkup(e.target.value)}
            placeholder="%"
          />
          <button
            type="button"
            disabled={bulkPending || !bulkMarkup}
            onClick={() => {
              setBulkError('')
              const pct = parseFloat(bulkMarkup)
              if (!isFinite(pct) || pct < 0) { setBulkError('Enter a valid %'); return }
              const fd = new FormData()
              fd.set('versionId', versionId)
              fd.set('quoteId', quoteId)
              fd.set('markupPercent', bulkMarkup)
              startBulkTransition(async () => {
                try { await bulkSetMarkup(fd); window.location.reload() }
                catch (err) { setBulkError(err instanceof Error ? err.message : 'Failed.') }
              })
            }}
            className="text-xs font-medium text-white px-3 py-1 rounded disabled:opacity-40"
            style={{ backgroundColor: '#C9A84C' }}
          >
            {bulkPending ? '…' : 'Apply to all'}
          </button>
          {bulkError && <span className="text-xs text-red-500">{bulkError}</span>}
        </div>
      )}

      {/* Totals footer */}
      {lines.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-xs text-gray-400">Total cost</p>
            <p className="font-semibold text-gray-900">${fmt(totalCost)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total selling</p>
            <p className="font-semibold text-gray-900">${fmt(totalSelling)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Margin</p>
            <p className={`font-semibold ${margin >= 20 ? 'text-green-700' : margin >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
              {fmt(margin)}%
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
