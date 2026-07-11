'use client'

import { useState } from 'react'
import Link from 'next/link'
import { addSupplierRate, deleteSupplierRate, updateRateCard, updateSupplierRate } from './actions'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { COST_CATEGORIES, ENTITY_TYPES, PRICING_UNITS, RESIDENCIES, label } from '../constants'

type Entity = { id: string; name: string }
type AgeBand = { code: string; name: string }
type Card = {
  id: string; name: string; supplier_name: string | null; supplier_id?: string | null; entity_type: string; entity_id: string | null;
  cost_category: string; valid_from: string; valid_to: string; currency: string; notes: string | null; is_active: boolean
}
type Rate = {
  id: string; traveller_category: string | null; room_category: string | null; residency: string;
  pricing_unit: string; amount: number; min_group_size: number | null; max_group_size: number | null
}

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'
const smallInputCls = 'w-full rounded-md border border-border px-2 py-1.5 text-xs text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'
const linkedTypes = new Set(['accommodation', 'activity', 'vehicle', 'staff', 'destination', 'park_fee'])
const roomCategories = ['sharing', 'single', 'triple', 'extra_bed', 'no_bed']

function RateFields({ rate, ageBands }: { rate?: Rate; ageBands: AgeBand[] }) {
  return <>
    <select name="travellerCategory" aria-label="Traveller category" defaultValue={rate?.traveller_category ?? ''} className={smallInputCls}><option value="">All travellers</option>{ageBands.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}</select>
    <select name="roomCategory" aria-label="Room category" defaultValue={rate?.room_category ?? ''} className={smallInputCls}><option value="">All rooms</option>{roomCategories.map(value => <option key={value} value={value}>{label(value)}</option>)}</select>
    <select name="residency" aria-label="Residency" defaultValue={rate?.residency ?? 'all'} className={smallInputCls}>{RESIDENCIES.map(value => <option key={value} value={value}>{label(value)}</option>)}</select>
    <select name="pricingUnit" aria-label="Pricing unit" defaultValue={rate?.pricing_unit ?? 'person'} className={smallInputCls}>{PRICING_UNITS.map(value => <option key={value} value={value}>Per {label(value)}</option>)}</select>
    <input type="number" name="amount" aria-label="Amount" min={0} step="0.01" required defaultValue={rate?.amount ?? ''} placeholder="Amount" className={smallInputCls} />
    <input type="number" name="minGroupSize" aria-label="Minimum group size" min={1} defaultValue={rate?.min_group_size ?? ''} placeholder="Min group" className={smallInputCls} />
    <input type="number" name="maxGroupSize" aria-label="Maximum group size" min={1} defaultValue={rate?.max_group_size ?? ''} placeholder="Max group" className={smallInputCls} />
  </>
}

export default function RateCardEditor({ card, rates, ageBands, entities, suppliers }: { card: Card; rates: Rate[]; ageBands: AgeBand[]; entities: Record<string, Entity[]>; suppliers: Entity[] }) {
  const [entityType, setEntityType] = useState(card.entity_type)
  const [isActive, setIsActive] = useState(card.is_active)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function run(action: (data: FormData) => Promise<void>, data: FormData, success: string) {
    setPending(true); setError(''); setMessage('')
    try { await action(data); setMessage(success) }
    catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.') }
    finally { setPending(false) }
  }

  function cardSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); data.set('isActive', String(isActive)); run(updateRateCard, data, 'Rate card saved.')
  }

  function rateSubmit(event: React.FormEvent<HTMLFormElement>, rateId?: string) {
    event.preventDefault(); const data = new FormData(event.currentTarget); data.set('cardId', card.id)
    if (rateId) { data.set('rateId', rateId); run(updateSupplierRate, data, 'Rate updated.') }
    else run(addSupplierRate, data, 'Rate added.')
  }

  function removeRate(rateId: string) {
    const data = new FormData(); data.set('cardId', card.id); data.set('rateId', rateId); run(deleteSupplierRate, data, 'Rate deleted.')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4"><Link href="/admin/content/rates" className="text-sm text-muted-foreground hover:text-foreground">← Supplier Rates</Link><h1 className="text-xl font-semibold text-foreground">{card.name}</h1></div>

      <form onSubmit={cardSubmit} className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
        <input type="hidden" name="cardId" value={card.id} />
        <h2 className="text-sm font-semibold text-foreground">Rate Card Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Name</label><input id="name" name="name" required defaultValue={card.name} className={inputCls} /></div>
          <div>
            <label htmlFor="supplierId" className="block text-sm font-medium text-foreground mb-1">Supplier</label>
            <select id="supplierId" name="supplierId" defaultValue={card.supplier_id ?? ''} className={inputCls}>
              <option value="">— no supplier —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {!card.supplier_id && card.supplier_name && <p className="text-xs text-amber-600 mt-1">Legacy supplier text: “{card.supplier_name}” — pick a real supplier to include this card in Payables.</p>}
          </div>
          <div><label htmlFor="entityType" className="block text-sm font-medium text-foreground mb-1">Entity Type</label><select id="entityType" name="entityType" value={entityType} onChange={e => setEntityType(e.target.value)} className={inputCls}>{ENTITY_TYPES.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></div>
          <div><label htmlFor="costCategory" className="block text-sm font-medium text-foreground mb-1">Cost Category</label><select id="costCategory" name="costCategory" defaultValue={card.cost_category} className={inputCls}>{COST_CATEGORIES.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></div>
          {linkedTypes.has(entityType) && <div><label htmlFor="entityId" className="block text-sm font-medium text-foreground mb-1">Linked Content</label><select id="entityId" name="entityId" defaultValue={entityType === card.entity_type ? card.entity_id ?? '' : ''} className={inputCls}><option value="">No linked item</option>{(entities[entityType] ?? []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
          <div><label htmlFor="currency" className="block text-sm font-medium text-foreground mb-1">Currency</label><input id="currency" name="currency" defaultValue={card.currency} maxLength={3} required className={inputCls} /></div>
          <div><label htmlFor="validFrom" className="block text-sm font-medium text-foreground mb-1">Valid From</label><input id="validFrom" type="date" name="validFrom" defaultValue={card.valid_from} required className={inputCls} /></div>
          <div><label htmlFor="validTo" className="block text-sm font-medium text-foreground mb-1">Valid To</label><input id="validTo" type="date" name="validTo" defaultValue={card.valid_to} required className={inputCls} /></div>
        </div>
        <div><label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1">Notes</label><textarea id="notes" name="notes" defaultValue={card.notes ?? ''} rows={2} className={inputCls} /></div>
        <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="accent-[var(--olive)]" />Active</label><Button type="submit" size="sm" loading={pending} loadingText="Saving…">Save Card</Button></div>
      </form>

      <section className="space-y-3">
        <div><h2 className="text-sm font-semibold text-foreground">Rates</h2><p className="text-xs text-muted-foreground">Use blank traveller or room categories when the rate applies to all.</p></div>
        {rates.map(rate => <form key={rate.id} onSubmit={event => rateSubmit(event, rate.id)} className="rounded-xl border border-border bg-surface shadow-sm p-4"><div className="grid grid-cols-2 md:grid-cols-7 gap-2"><RateFields rate={rate} ageBands={ageBands} /></div><div className="flex justify-end gap-2 mt-3"><Button type="button" variant="danger-text" size="sm" onClick={() => removeRate(rate.id)} disabled={pending}>Delete</Button><Button type="submit" size="sm" loading={pending} loadingText="Saving…">Save Rate</Button></div></form>)}
        <form onSubmit={event => rateSubmit(event)} className="bg-[var(--olive)]/5 rounded-lg border border-primary-strong/30 p-4"><p className="text-sm font-medium text-foreground mb-3">Add Rate</p><div className="grid grid-cols-2 md:grid-cols-7 gap-2"><RateFields ageBands={ageBands} /></div><div className="flex justify-end mt-3"><Button type="submit" loading={pending} loadingText="Adding…">+ Add Rate</Button></div></form>
      </section>

      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
    </div>
  )
}
