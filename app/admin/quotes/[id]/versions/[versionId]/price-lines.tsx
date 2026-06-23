'use client'

import { useState, useTransition } from 'react'
import { addPriceLine, updatePriceLine, deletePriceLine } from './price-line-actions'
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
  { value: 'person',  label: 'person' },
  { value: 'room',    label: 'room' },
  { value: 'vehicle', label: 'vehicle' },
  { value: 'group',   label: 'group' },
  { value: 'day',     label: 'day' },
  { value: 'night',   label: 'night' },
  { value: 'trip',    label: 'trip' },
]

const CATEGORY_COLORS: Record<string, string> = {
  accommodation: 'bg-blue-50 text-blue-700',
  activities:    'bg-green-50 text-green-700',
  park_fees:     'bg-amber-50 text-amber-700',
  transport:     'bg-purple-50 text-purple-700',
  staff:         'bg-pink-50 text-pink-700',
  meals:         'bg-orange-50 text-orange-700',
  flights:       'bg-sky-50 text-sky-700',
  other:         'bg-gray-100 text-gray-600',
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

function calcSelling(unitCost: string, qty: string, markup: string) {
  const c = parseFloat(unitCost)
  const q = parseFloat(qty)
  const m = parseFloat(markup)
  if (!isFinite(c) || !isFinite(q) || !isFinite(m)) return null
  return q * c * (1 + m / 100)
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const inputCls = 'rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#7A9A4A] bg-white'

function InlineForm({
  initial,
  onSave,
  onCancel,
  onRateCard,
  pending,
  error,
}: {
  initial: ReturnType<typeof blankForm>
  onSave: (f: ReturnType<typeof blankForm>) => void
  onCancel: () => void
  onRateCard?: () => void
  pending: boolean
  error: string
}) {
  const [f, setF] = useState(initial)
  const selling = calcSelling(f.unitCostUsd, f.quantity, f.markupPercent)
  const totalCost = parseFloat(f.quantity) * parseFloat(f.unitCostUsd)
  const canSave = !!f.description.trim() && !!f.unitCostUsd && parseFloat(f.unitCostUsd) >= 0

  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-2">
      {/* Row 1: description */}
      <input
        className={inputCls + ' w-full'}
        value={f.description}
        onChange={e => setF(v => ({ ...v, description: e.target.value }))}
        placeholder="Description…"
        autoFocus
      />

      {/* Row 2: qty × cost, unit, markup */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <input
          type="number" min="0.01" step="0.01"
          className={inputCls + ' w-16 text-center'}
          value={f.quantity}
          onChange={e => setF(v => ({ ...v, quantity: e.target.value }))}
          title="Quantity"
        />
        <span>×</span>
        <input
          type="number" min="0" step="0.01"
          className={inputCls + ' w-24'}
          value={f.unitCostUsd}
          onChange={e => setF(v => ({ ...v, unitCostUsd: e.target.value }))}
          placeholder="Unit cost"
        />
        <select
          className={inputCls}
          value={f.pricingUnit}
          onChange={e => setF(v => ({ ...v, pricingUnit: e.target.value }))}
        >
          {UNITS.map(u => <option key={u.value} value={u.value}>/{u.label}</option>)}
        </select>
        <span className="text-gray-300">|</span>
        <input
          type="number" min="0" step="0.5"
          className={inputCls + ' w-16 text-center'}
          value={f.markupPercent}
          onChange={e => setF(v => ({ ...v, markupPercent: e.target.value }))}
          title="Markup %"
        />
        <span>% markup</span>
        {selling !== null && (
          <span className="text-gray-900 font-semibold ml-1">
            → ${fmt(selling)}
            {isFinite(totalCost) && totalCost > 0 && (
              <span className="font-normal text-gray-400 text-xs ml-1">(cost ${fmt(totalCost)})</span>
            )}
          </span>
        )}
      </div>

      {/* Row 3: optional + actions */}
      <div className="flex items-center gap-3 pt-0.5">
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={f.isOptional}
            onChange={e => setF(v => ({ ...v, isOptional: e.target.checked }))}
            className="h-3.5 w-3.5 rounded border-gray-300 text-[#7A9A4A]"
          />
          Optional add-on
        </label>

        <div className="flex items-center gap-2 ml-auto">
          {onRateCard && (
            <button type="button" onClick={onRateCard}
              className="text-xs text-[#7A9A4A] hover:text-[#4C5E2A]">
              ⚡ Rate card
            </button>
          )}
          <button type="button" onClick={onCancel}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded border border-gray-200">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(f)}
            disabled={pending || !canSave}
            className="text-xs font-medium text-white px-3 py-1 rounded disabled:opacity-50"
            style={{ backgroundColor: '#7A9A4A' }}
          >
            {pending ? '…' : 'Add'}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>}
    </div>
  )
}

function EditForm({
  initial,
  onSave,
  onCancel,
  pending,
  error,
}: {
  initial: ReturnType<typeof blankForm>
  onSave: (f: ReturnType<typeof blankForm>) => void
  onCancel: () => void
  pending: boolean
  error: string
}) {
  const [f, setF] = useState(initial)
  const selling = calcSelling(f.unitCostUsd, f.quantity, f.markupPercent)
  const totalCost = parseFloat(f.quantity) * parseFloat(f.unitCostUsd)
  const canSave = !!f.description.trim() && !!f.unitCostUsd && parseFloat(f.unitCostUsd) >= 0

  return (
    <div className="mt-2 space-y-2 bg-gray-50 rounded-md border border-gray-200 p-3">
      <input
        className={inputCls + ' w-full'}
        value={f.description}
        onChange={e => setF(v => ({ ...v, description: e.target.value }))}
        placeholder="Description…"
        autoFocus
      />
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <select className={inputCls} value={f.costCategory}
          onChange={e => setF(v => ({ ...v, costCategory: e.target.value }))}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input type="number" min="0.01" step="0.01"
          className={inputCls + ' w-16 text-center'}
          value={f.quantity}
          onChange={e => setF(v => ({ ...v, quantity: e.target.value }))}
          title="Quantity"
        />
        <span>×</span>
        <input type="number" min="0" step="0.01"
          className={inputCls + ' w-24'}
          value={f.unitCostUsd}
          onChange={e => setF(v => ({ ...v, unitCostUsd: e.target.value }))}
          placeholder="Unit cost"
        />
        <select className={inputCls} value={f.pricingUnit}
          onChange={e => setF(v => ({ ...v, pricingUnit: e.target.value }))}>
          {UNITS.map(u => <option key={u.value} value={u.value}>/{u.label}</option>)}
        </select>
        <input type="number" min="0" step="0.5"
          className={inputCls + ' w-16 text-center'}
          value={f.markupPercent}
          onChange={e => setF(v => ({ ...v, markupPercent: e.target.value }))}
          title="Markup %"
        />
        <span>%</span>
        {selling !== null && (
          <span className="text-gray-900 font-semibold">
            → ${fmt(selling)}
            {isFinite(totalCost) && totalCost > 0 && (
              <span className="font-normal text-gray-400 text-xs ml-1">(cost ${fmt(totalCost)})</span>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 pt-0.5">
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input type="checkbox" checked={f.isOptional}
            onChange={e => setF(v => ({ ...v, isOptional: e.target.checked }))}
            className="h-3.5 w-3.5 rounded border-gray-300 text-[#7A9A4A]"
          />
          Optional add-on
        </label>
        <div className="flex items-center gap-2 ml-auto">
          <button type="button" onClick={onCancel}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded border border-gray-200">
            Cancel
          </button>
          <button type="button" onClick={() => onSave(f)}
            disabled={pending || !canSave}
            className="text-xs font-medium text-white px-3 py-1 rounded disabled:opacity-50"
            style={{ backgroundColor: '#7A9A4A' }}>
            {pending ? '…' : 'Save'}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{error}</p>}
    </div>
  )
}

interface EntityList { id: string; name: string }

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
  const [lines, setLines] = useState(initial)
  const [addingCategory, setAddingCategory] = useState<string | null>(null)
  const [showRatePicker, setShowRatePicker] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addError, setAddError] = useState('')
  const [editError, setEditError] = useState('')
  const [pending, startTransition] = useTransition()

  const totalCost    = lines.reduce((s, l) => s + l.total_cost_usd, 0)
  const totalSelling = lines.reduce((s, l) => s + l.total_selling_usd, 0)
  const margin = totalSelling > 0 ? ((totalSelling - totalCost) / totalSelling) * 100 : 0

  function buildFd(f: ReturnType<typeof blankForm>) {
    const fd = new FormData()
    fd.set('versionId', versionId)
    fd.set('quoteId', quoteId)
    fd.set('description', f.description)
    fd.set('costCategory', f.costCategory)
    fd.set('pricingUnit', f.pricingUnit)
    fd.set('quantity', f.quantity)
    fd.set('unitCostUsd', f.unitCostUsd)
    fd.set('markupPercent', f.markupPercent)
    fd.set('isOptional', String(f.isOptional))
    return fd
  }

  function handleAdd(f: ReturnType<typeof blankForm>) {
    setAddError('')
    startTransition(async () => {
      try {
        await addPriceLine(buildFd(f))
        setAddingCategory(null)
      } catch (err) {
        setAddError(err instanceof Error ? err.message : 'Failed to add line.')
      }
    })
  }

  function handleUpdate(lineId: string, f: ReturnType<typeof blankForm>) {
    setEditError('')
    const fd = buildFd(f)
    fd.set('lineId', lineId)
    startTransition(async () => {
      try {
        await updatePriceLine(fd)
        setEditingId(null)
      } catch (err) {
        setEditError(err instanceof Error ? err.message : 'Failed to update line.')
      }
    })
  }

  function handleDelete(lineId: string) {
    const fd = new FormData()
    fd.set('lineId', lineId)
    fd.set('versionId', versionId)
    fd.set('quoteId', quoteId)
    startTransition(async () => {
      await deletePriceLine(fd)
      setLines(ls => ls.filter(l => l.id !== lineId))
    })
  }

  function editFormFor(line: PriceLine): ReturnType<typeof blankForm> {
    return {
      description: line.description,
      costCategory: line.cost_category,
      pricingUnit: line.pricing_unit,
      quantity: String(line.quantity),
      unitCostUsd: String(line.unit_cost_usd),
      markupPercent: String(line.markup_percent_override ?? defaultMarkup),
      isOptional: line.is_optional,
    }
  }

  function startAdding(category: string) {
    setAddingCategory(category)
    setShowRatePicker(false)
    setAddError('')
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Pricing</h2>
        {lines.length > 0 && (
          <span className="text-xs text-gray-400">{lines.length} line{lines.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Existing lines */}
      <div className="divide-y divide-gray-50">
        {lines.length === 0 && !addingCategory && !showRatePicker && (
          <p className="px-4 py-6 text-center text-sm text-gray-400">
            {isLocked ? 'No price lines.' : 'No price lines yet — add one below.'}
          </p>
        )}

        {lines.map(line => (
          <div key={line.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[line.cost_category] ?? 'bg-gray-100 text-gray-600'}`}>
                {CATEGORIES.find(c => c.value === line.cost_category)?.label ?? line.cost_category}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 font-medium leading-tight">{line.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {line.quantity} × ${fmt(line.unit_cost_usd)}/{UNITS.find(u => u.value === line.pricing_unit)?.label ?? line.pricing_unit}
                  {line.markup_percent_override != null && ` · ${line.markup_percent_override}% markup`}
                  {line.is_optional && ' · optional'}
                </p>
                {editingId === line.id && (
                  <EditForm
                    initial={editFormFor(line)}
                    onSave={f => handleUpdate(line.id, f)}
                    onCancel={() => { setEditingId(null); setEditError('') }}
                    pending={pending}
                    error={editError}
                  />
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900">${fmt(line.total_selling_usd)}</p>
                <p className="text-xs text-gray-400">cost ${fmt(line.total_cost_usd)}</p>
                {!isLocked && editingId !== line.id && (
                  <div className="flex gap-2 mt-1 justify-end">
                    <button type="button"
                      onClick={() => { setEditingId(line.id); setEditError('') }}
                      className="text-xs text-gray-400 hover:text-gray-700">
                      Edit
                    </button>
                    <button type="button"
                      onClick={() => handleDelete(line.id)}
                      disabled={pending}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40">
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inline add form */}
      {addingCategory && !isLocked && (
        <InlineForm
          initial={blankForm(addingCategory, defaultMarkup)}
          onSave={handleAdd}
          onCancel={() => { setAddingCategory(null); setAddError('') }}
          onRateCard={entities ? () => { setAddingCategory(null); setShowRatePicker(true) } : undefined}
          pending={pending}
          error={addError}
        />
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

      {/* Category add buttons — itinerary-style */}
      {!isLocked && !addingCategory && !showRatePicker && (
        <div className="border-t border-gray-100">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              type="button"
              onClick={() => startAdding(cat.value)}
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
