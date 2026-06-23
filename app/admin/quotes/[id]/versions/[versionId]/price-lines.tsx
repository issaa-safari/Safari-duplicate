'use client'

import { useState, useTransition } from 'react'
import { addPriceLine, updatePriceLine, deletePriceLine } from './price-line-actions'

const CATEGORIES = [
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'activities', label: 'Activities' },
  { value: 'park_fees', label: 'Park Fees' },
  { value: 'transport', label: 'Transport' },
  { value: 'staff', label: 'Staff' },
  { value: 'meals', label: 'Meals' },
  { value: 'flights', label: 'Flights' },
  { value: 'other', label: 'Other' },
]

const UNITS = [
  { value: 'person', label: 'Per Person' },
  { value: 'room', label: 'Per Room' },
  { value: 'vehicle', label: 'Per Vehicle' },
  { value: 'group', label: 'Per Group' },
  { value: 'day', label: 'Per Day' },
  { value: 'night', label: 'Per Night' },
  { value: 'trip', label: 'Per Trip' },
]

const CATEGORY_COLORS: Record<string, string> = {
  accommodation: 'bg-blue-50 text-blue-700',
  activities: 'bg-green-50 text-green-700',
  park_fees: 'bg-amber-50 text-amber-700',
  transport: 'bg-purple-50 text-purple-700',
  staff: 'bg-pink-50 text-pink-700',
  meals: 'bg-orange-50 text-orange-700',
  flights: 'bg-sky-50 text-sky-700',
  other: 'bg-gray-100 text-gray-600',
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

function blankForm(defaultMarkup = 20) {
  return {
    description: '',
    costCategory: 'accommodation',
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

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]'
const labelCls = 'block text-xs text-gray-500 mb-1'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function LineForm({
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

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className={labelCls}>Description *</label>
          <input
            className={inputCls}
            value={f.description}
            onChange={e => setF(v => ({ ...v, description: e.target.value }))}
            placeholder="e.g. 3 nights Serengeti tented camp — sharing"
          />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={f.costCategory} onChange={e => setF(v => ({ ...v, costCategory: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Pricing unit</label>
          <select className={inputCls} value={f.pricingUnit} onChange={e => setF(v => ({ ...v, pricingUnit: e.target.value }))}>
            {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Quantity</label>
          <input
            type="number" min="0.01" step="0.01" className={inputCls}
            value={f.quantity}
            onChange={e => setF(v => ({ ...v, quantity: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelCls}>Unit cost (USD)</label>
          <input
            type="number" min="0" step="0.01" className={inputCls}
            value={f.unitCostUsd}
            onChange={e => setF(v => ({ ...v, unitCostUsd: e.target.value }))}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelCls}>Markup %</label>
          <input
            type="number" min="0" step="0.5" className={inputCls}
            value={f.markupPercent}
            onChange={e => setF(v => ({ ...v, markupPercent: e.target.value }))}
          />
        </div>
        <div className="flex items-end pb-1">
          {selling !== null ? (
            <div className="text-sm">
              <span className="text-gray-400 text-xs">Selling total: </span>
              <span className="font-semibold text-gray-900">${fmt(selling)}</span>
              {isFinite(totalCost) && totalCost > 0 && (
                <span className="text-xs text-gray-400 ml-2">
                  (cost ${fmt(totalCost)})
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-400">Enter cost to see total</div>
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={f.isOptional}
          onChange={e => setF(v => ({ ...v, isOptional: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 text-[#7A9A4A] focus:ring-[#7A9A4A]"
        />
        Optional item (shown to client as add-on)
      </label>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSave(f)}
          disabled={pending || !f.description.trim() || !f.unitCostUsd}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#7A9A4A' }}
        >
          {pending ? 'Saving…' : 'Save Line'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function PriceLinesEditor({
  quoteId,
  versionId,
  priceLines: initial,
  isLocked,
  defaultMarkup = 20,
}: {
  quoteId: string
  versionId: string
  priceLines: PriceLine[]
  isLocked: boolean
  defaultMarkup?: number
}) {
  const [lines, setLines] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addError, setAddError] = useState('')
  const [editError, setEditError] = useState('')
  const [pending, startTransition] = useTransition()

  const totalCost = lines.reduce((s, l) => s + l.total_cost_usd, 0)
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
        setShowAdd(false)
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

  return (
    <section className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Pricing</h2>
          {lines.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{lines.length} line{lines.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        {!isLocked && !showAdd && (
          <button
            type="button"
            onClick={() => { setShowAdd(true); setAddError('') }}
            className="text-sm font-medium text-[#7A9A4A] hover:text-[#4C5E2A]"
          >
            + Add Line
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {lines.length === 0 && !showAdd && (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            No price lines yet.{!isLocked && ' Click "Add Line" to start building the quote cost.'}
          </div>
        )}

        {lines.map(line => (
          <div key={line.id} className="px-6 py-4">
            {editingId === line.id ? (
              <LineForm
                initial={editFormFor(line)}
                onSave={f => handleUpdate(line.id, f)}
                onCancel={() => { setEditingId(null); setEditError('') }}
                pending={pending}
                error={editError}
              />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[line.cost_category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {CATEGORIES.find(c => c.value === line.cost_category)?.label ?? line.cost_category}
                    </span>
                    {line.is_optional && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Optional</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 font-medium">{line.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {line.quantity} × ${fmt(line.unit_cost_usd)} ({UNITS.find(u => u.value === line.pricing_unit)?.label ?? line.pricing_unit})
                    {line.markup_percent_override != null && ` · ${line.markup_percent_override}% markup`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">${fmt(line.total_selling_usd)}</p>
                  <p className="text-xs text-gray-400">cost ${fmt(line.total_cost_usd)}</p>
                  {!isLocked && (
                    <div className="flex gap-2 mt-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => { setEditingId(line.id); setEditError('') }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-0.5 rounded border border-gray-200 hover:border-gray-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(line.id)}
                        disabled={pending}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded border border-red-100 hover:border-red-300 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {showAdd && !isLocked && (
          <div className="px-6 py-5">
            <p className="text-sm font-medium text-gray-700 mb-3">New price line</p>
            <LineForm
              initial={blankForm(defaultMarkup)}
              onSave={handleAdd}
              onCancel={() => { setShowAdd(false); setAddError('') }}
              pending={pending}
              error={addError}
            />
          </div>
        )}
      </div>

      {lines.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-lg">
          <div className="flex flex-wrap gap-6 text-sm">
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
        </div>
      )}
    </section>
  )
}
