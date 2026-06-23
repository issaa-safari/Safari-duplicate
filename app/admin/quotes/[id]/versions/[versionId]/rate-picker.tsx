'use client'

import { useState, useTransition } from 'react'
import { lookupRates, addPriceLine } from './price-line-actions'

const ENTITY_OPTIONS = [
  { value: 'accommodation', label: 'Accommodation', category: 'accommodation' },
  { value: 'vehicle',       label: 'Transport / Vehicle', category: 'transport' },
  { value: 'activity',      label: 'Activity', category: 'activities' },
  { value: 'park_fee',      label: 'Park / Reserve Fee', category: 'park_fees' },
  { value: 'staff',         label: 'Staff / Guide', category: 'staff' },
]

const UNIT_LABELS: Record<string, string> = {
  person: 'per person', room: 'per room', vehicle: 'per vehicle',
  group: 'per group', day: 'per day', night: 'per night', trip: 'per trip',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface EntityList { id: string; name: string }

export default function RatePicker({
  versionId,
  quoteId,
  defaultMarkup,
  entities,
  onAdded,
  onCancel,
}: {
  versionId: string
  quoteId: string
  defaultMarkup: number
  entities: {
    accommodation: EntityList[]
    vehicle: EntityList[]
    activity: EntityList[]
    staff: EntityList[]
    park_fee: EntityList[]
  }
  onAdded: () => void
  onCancel: () => void
}) {
  const [entityType, setEntityType] = useState('accommodation')
  const [entityId, setEntityId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [cards, setCards] = useState<any[]>([])
  const [selectedRate, setSelectedRate] = useState<any | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [markup, setMarkup] = useState(String(defaultMarkup))
  const [description, setDescription] = useState('')
  const [isOptional, setIsOptional] = useState(false)
  const [noRates, setNoRates] = useState(false)
  const [error, setError] = useState('')
  const [lookupPending, startLookup] = useTransition()
  const [addPending, startAdd] = useTransition()

  const entityOption = ENTITY_OPTIONS.find(e => e.value === entityType)!
  const entityList: EntityList[] = (entities as any)[entityType] ?? []

  function handleLookup() {
    if (!entityId || !date) return
    setCards([])
    setSelectedRate(null)
    setNoRates(false)
    setError('')
    const fd = new FormData()
    fd.set('entityType', entityType)
    fd.set('entityId', entityId)
    fd.set('date', date)
    startLookup(async () => {
      try {
        const { cards: found } = await lookupRates(fd)
        if (!found.length) { setNoRates(true); return }
        setCards(found)
        // Auto-select if single card with single rate
        if (found.length === 1 && found[0].supplier_rates?.length === 1) {
          setSelectedRate({ card: found[0], rate: found[0].supplier_rates[0] })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to look up rates.')
      }
    })
  }

  const unitCost = selectedRate ? Number(selectedRate.rate.amount) : 0
  const qty = parseFloat(quantity)
  const mkp = parseFloat(markup)
  const totalCost = isFinite(qty) && isFinite(unitCost) ? qty * unitCost : null
  const totalSelling = totalCost !== null && isFinite(mkp) ? totalCost * (1 + mkp / 100) : null

  function handleAdd() {
    if (!selectedRate || !description.trim() || !totalCost) return
    setError('')
    const fd = new FormData()
    fd.set('versionId', versionId)
    fd.set('quoteId', quoteId)
    fd.set('description', description)
    fd.set('costCategory', entityOption.category)
    fd.set('pricingUnit', selectedRate.rate.pricing_unit)
    fd.set('quantity', quantity)
    fd.set('unitCostUsd', String(unitCost))
    fd.set('markupPercent', markup)
    fd.set('isOptional', String(isOptional))
    startAdd(async () => {
      try {
        await addPriceLine(fd)
        onAdded()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add line.')
      }
    })
  }

  function handleTypeChange(type: string) {
    setEntityType(type)
    setEntityId('')
    setCards([])
    setSelectedRate(null)
    setNoRates(false)
    setDescription('')
  }

  function handleEntityChange(id: string) {
    setEntityId(id)
    setCards([])
    setSelectedRate(null)
    setNoRates(false)
    const name = entityList.find(e => e.id === id)?.name ?? ''
    setDescription(name)
  }

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]'
  const labelCls = 'block text-xs text-gray-500 mb-1'

  return (
    <div className="bg-[#7A9A4A]/5 rounded-lg border border-[#7A9A4A]/20 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Add from rate card</p>
        <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Step 1: Entity type + entity + date */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={entityType} onChange={e => handleTypeChange(e.target.value)}>
            {ENTITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>
            {entityOption.label}
            {entityList.length === 0 && <span className="text-amber-500 ml-1">(none in content)</span>}
          </label>
          <select
            className={inputCls}
            value={entityId}
            onChange={e => handleEntityChange(e.target.value)}
            disabled={entityList.length === 0}
          >
            <option value="">— select —</option>
            {entityList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Season date</label>
          <div className="flex gap-2">
            <input
              type="date"
              className={inputCls}
              value={date}
              onChange={e => { setDate(e.target.value); setCards([]); setSelectedRate(null) }}
            />
            <button
              type="button"
              onClick={handleLookup}
              disabled={!entityId || !date || lookupPending}
              className="shrink-0 px-3 py-2 rounded-md text-sm font-medium text-white disabled:opacity-40"
              style={{ backgroundColor: '#7A9A4A' }}
            >
              {lookupPending ? '…' : 'Find'}
            </button>
          </div>
        </div>
      </div>

      {noRates && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded px-3 py-2">
          No active rate card found for this supplier on {date}. Add one in Content → Supplier Rates.
        </p>
      )}

      {/* Step 2: Rate selection */}
      {cards.length > 0 && (
        <div className="space-y-2">
          <label className={labelCls}>Select rate</label>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
            {cards.map((card: any) =>
              (card.supplier_rates ?? []).map((rate: any) => {
                const isSelected = selectedRate?.card.id === card.id && selectedRate?.rate.id === rate.id
                return (
                  <button
                    key={`${card.id}-${rate.id}`}
                    type="button"
                    onClick={() => setSelectedRate({ card, rate })}
                    className={`text-left rounded-md border px-3 py-2 text-sm transition ${
                      isSelected
                        ? 'border-[#7A9A4A] bg-[#7A9A4A]/5 text-[#4C5E2A]'
                        : 'border-gray-200 hover:border-[#7A9A4A]/40 text-gray-700'
                    }`}
                  >
                    <span className="font-medium">{card.name}</span>
                    {rate.room_category && <span className="text-gray-500 ml-1">· {rate.room_category}</span>}
                    {rate.residency && rate.residency !== 'all' && (
                      <span className="text-gray-400 ml-1">({rate.residency})</span>
                    )}
                    <span className="float-right font-semibold">
                      {card.currency} {fmt(Number(rate.amount))} {UNIT_LABELS[rate.pricing_unit] ?? rate.pricing_unit}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Step 3: Quantity + description + markup */}
      {selectedRate && (
        <div className="space-y-3 pt-1 border-t border-[#7A9A4A]/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>
                Quantity ({UNIT_LABELS[selectedRate.rate.pricing_unit] ?? selectedRate.rate.pricing_unit})
              </label>
              <input
                type="number" min="0.01" step="0.01"
                className={inputCls}
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Markup %</label>
              <input
                type="number" min="0" step="0.5"
                className={inputCls}
                value={markup}
                onChange={e => setMarkup(e.target.value)}
              />
            </div>
            <div className="flex flex-col justify-end pb-1">
              {totalSelling !== null && (
                <div className="text-sm">
                  <span className="text-gray-400 text-xs">Selling: </span>
                  <span className="font-semibold text-gray-900">${fmt(totalSelling)}</span>
                  {totalCost !== null && (
                    <span className="text-xs text-gray-400 ml-1">(cost ${fmt(totalCost)})</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className={labelCls}>Line description *</label>
            <input
              className={inputCls}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. 3 nights Serengeti camp — sharing"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox" checked={isOptional}
              onChange={e => setIsOptional(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#7A9A4A]"
            />
            Optional item (add-on)
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

      {selectedRate && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleAdd}
            disabled={addPending || !description.trim() || !totalSelling}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#7A9A4A' }}
          >
            {addPending ? 'Adding…' : 'Add Line'}
          </button>
          <button type="button" onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
