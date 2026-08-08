import { describe, expect, it } from 'vitest'
import {
  allocatePayments,
  buildDraftLines,
  draftLinesTotalUsd,
  invoiceDisplayStatus,
} from './invoice'
import type { InvoiceStatus } from './types'

const inv = (id: string, status: InvoiceStatus) => ({ id, status })
const pay = (amount: number, invoice_id: string | null = null, payment_type = 'partial') =>
  ({ amount_usd: amount, invoice_id, payment_type })

describe('buildDraftLines', () => {
  it('puts the trip on one line and each service on its own', () => {
    const lines = buildDraftLines({
      tripPriceUsd: 4900,
      tripLabel: '7-Day Magical Kenya Safari',
      services: [
        { id: 's1', name_en: 'Visa application', unit_price_usd: 100, quantity: 2 },
        { id: 's2', name_en: 'Medical & travel insurance', unit_price_usd: 45, quantity: 2 },
      ],
    })

    expect(lines).toHaveLength(3)
    expect(lines[0]).toMatchObject({ kind: 'trip', unit_price_usd: 4900, quantity: 1 })
    expect(lines[1]).toMatchObject({ kind: 'service', trip_service_id: 's1', quantity: 2 })
    expect(draftLinesTotalUsd(lines)).toBe(4900 + 200 + 90)
  })

  it('carries the Arabic name through so the document can be issued in either language', () => {
    const [line] = buildDraftLines({
      tripPriceUsd: 100,
      tripLabel: 'Safari',
      tripLabelAr: 'رحلة سفاري',
    })
    expect(line.description_ar).toBe('رحلة سفاري')
  })

  it('omits the trip line when no price has been set, rather than invoicing $0.00 for a safari', () => {
    const lines = buildDraftLines({
      tripPriceUsd: 0,
      tripLabel: 'Custom trip',
      services: [{ id: 's1', name_en: 'Visa application', unit_price_usd: 100, quantity: 1 }],
    })
    expect(lines).toHaveLength(1)
    expect(lines[0].kind).toBe('service')
  })

  it('keeps services in a stable order behind the trip', () => {
    const lines = buildDraftLines({
      tripPriceUsd: 10,
      tripLabel: 'Trip',
      services: [
        { id: 'a', name_en: 'A', unit_price_usd: 1, quantity: 1 },
        { id: 'b', name_en: 'B', unit_price_usd: 1, quantity: 1 },
      ],
    })
    expect(lines.map((l) => l.sort_order)).toEqual([10, 100, 110])
  })

  it('accepts the numeric strings Supabase returns for numeric columns', () => {
    const lines = buildDraftLines({
      tripPriceUsd: 1000,
      tripLabel: 'Trip',
      services: [{ id: 's1', name_en: 'Visa', unit_price_usd: '100.00', quantity: '2.00' }],
    })
    expect(draftLinesTotalUsd(lines)).toBe(1200)
  })
})

describe('allocatePayments', () => {
  it('sends a payment to the invoice it names', () => {
    const a = allocatePayments(
      [inv('i1', 'issued'), inv('i2', 'issued')],
      [pay(500, 'i1'), pay(300, 'i2')]
    )
    expect(a.byInvoice).toEqual({ i1: 500, i2: 300 })
    expect(a.unallocatedUsd).toBe(0)
  })

  it('gives an unnamed payment to the trip’s only live invoice', () => {
    // The ordinary case: a deposit taken at acceptance, before any invoice
    // existed, and every row carried over from before group_76.
    const a = allocatePayments([inv('i1', 'issued')], [pay(1500)])
    expect(a.byInvoice.i1).toBe(1500)
    expect(a.unallocatedUsd).toBe(0)
  })

  it('leaves an unnamed payment unallocated when two invoices could claim it', () => {
    const a = allocatePayments([inv('i1', 'issued'), inv('i2', 'issued')], [pay(1500)])
    expect(a.byInvoice).toEqual({ i1: 0, i2: 0 })
    expect(a.unallocatedUsd).toBe(1500)
  })

  it('does not allocate to a draft, which is not yet a claim on anyone', () => {
    const a = allocatePayments([inv('i1', 'draft')], [pay(1500)])
    expect(a.byInvoice.i1).toBe(0)
    expect(a.unallocatedUsd).toBe(1500)
  })

  it('re-homes a payment stranded on a voided invoice', () => {
    const a = allocatePayments([inv('old', 'void'), inv('new', 'issued')], [pay(1500, 'old')])
    expect(a.byInvoice.new).toBe(1500)
    expect(a.byInvoice.old).toBe(0)
  })

  it('leaves it stranded when there is no single invoice to re-home it to', () => {
    const a = allocatePayments(
      [inv('old', 'void'), inv('a', 'issued'), inv('b', 'issued')],
      [pay(1500, 'old')]
    )
    expect(a.unallocatedUsd).toBe(1500)
  })

  it('subtracts a refund from the invoice it came off', () => {
    const a = allocatePayments([inv('i1', 'issued')], [pay(2000, 'i1'), pay(500, 'i1', 'refund')])
    expect(a.byInvoice.i1).toBe(1500)
  })

  it('reports every invoice, including ones nothing has been paid against', () => {
    const a = allocatePayments([inv('i1', 'issued'), inv('i2', 'issued')], [pay(500, 'i1')])
    expect(a.byInvoice).toEqual({ i1: 500, i2: 0 })
  })
})

describe('invoiceDisplayStatus', () => {
  const base = { totalUsd: 1000, receivedUsd: 0, today: '2026-08-08' }

  it('shows a draft and a void invoice as themselves, whatever the ledger says', () => {
    expect(invoiceDisplayStatus({ ...base, status: 'draft', receivedUsd: 1000 })).toBe('draft')
    expect(invoiceDisplayStatus({ ...base, status: 'void', receivedUsd: 1000 })).toBe('void')
  })

  it('is issued when nothing has arrived and nothing is late', () => {
    expect(invoiceDisplayStatus({ ...base, status: 'issued', dueDate: '2026-09-01' })).toBe('issued')
  })

  it('is part-paid once some money has arrived', () => {
    expect(
      invoiceDisplayStatus({ ...base, status: 'issued', receivedUsd: 300, dueDate: '2026-09-01' })
    ).toBe('part-paid')
  })

  it('is paid when the total is met', () => {
    expect(invoiceDisplayStatus({ ...base, status: 'issued', receivedUsd: 1000 })).toBe('paid')
  })

  it('stays paid when the due date has passed — settled is settled', () => {
    expect(
      invoiceDisplayStatus({ ...base, status: 'issued', receivedUsd: 1000, dueDate: '2026-07-01' })
    ).toBe('paid')
  })

  it('is overdue when the due date has passed and money is still owed', () => {
    expect(
      invoiceDisplayStatus({ ...base, status: 'issued', receivedUsd: 300, dueDate: '2026-07-01' })
    ).toBe('overdue')
  })

  it('is not overdue on the due date itself', () => {
    expect(
      invoiceDisplayStatus({ ...base, status: 'issued', dueDate: '2026-08-08' })
    ).toBe('issued')
  })

  it('tolerates a half-cent short, which is rounding rather than a debt', () => {
    expect(invoiceDisplayStatus({ ...base, status: 'issued', receivedUsd: 999.999 })).toBe('paid')
  })

  it('calls an overpaid invoice paid rather than something louder', () => {
    expect(invoiceDisplayStatus({ ...base, status: 'issued', receivedUsd: 1200 })).toBe('paid')
  })

  it('never calls a zero-total invoice paid', () => {
    // Otherwise an empty draft, issued by accident, would read as settled.
    expect(invoiceDisplayStatus({ ...base, status: 'issued', totalUsd: 0 })).toBe('issued')
  })
})
