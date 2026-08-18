'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { createBlankInvoice, createDraftInvoice, getInvoice } from '@/lib/server/invoices'
import { findOrCreateClientByEmail } from '@/lib/server/clients'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

/**
 * Postgres does the enforcing here — an issued invoice's lines reject writes,
 * its header rejects financial edits, and the transitions are checked by
 * trigger. These actions surface those errors rather than restating the rules,
 * so the SQL editor and the UI cannot disagree about what is allowed. The
 * triggers raise sentences already written for a person ("Invoice SAT-I-0004 is
 * issued and can no longer be edited"), so the message is passed straight
 * through; only the constraint names, which are not, get a translation.
 */
const CONSTRAINT_MESSAGE: Record<string, string> = {
  invoices_trip_ref_chk: 'An invoice needs a quote, a booking, a client, or at least a client name.',
  invoices_issued_shape_chk: 'An issued invoice needs a number and an issue date.',
  invoices_status_chk: 'Unknown invoice status.',
}

function friendly(message: string): string {
  for (const [name, text] of Object.entries(CONSTRAINT_MESSAGE)) {
    if (message.includes(name)) return text
  }
  return message
}

function revalidateInvoice(id: string, quoteId?: string | null, bookingId?: string | null) {
  revalidatePath('/admin/finance/invoices')
  revalidatePath(`/admin/finance/invoices/${id}`)
  revalidatePath('/admin/finance/receipts')
  if (quoteId) revalidatePath(`/admin/quotes/${quoteId}`)
  if (bookingId) revalidatePath(`/admin/bookings/${bookingId}`)
}

/** Raise a draft for a trip, pre-filled from its price and add-on services. */
export async function generateInvoice(formData: FormData) {
  const { user, admin } = await authGuard()

  const quoteId = (formData.get('quoteId') as string) || null
  const bookingId = (formData.get('bookingId') as string) || null
  if (!quoteId && !bookingId) throw new Error('An invoice must belong to a quote or a booking.')

  const id = await createDraftInvoice(admin, { quoteId, bookingId }, user.id)
  revalidateInvoice(id, quoteId, bookingId)
  redirect(`/admin/finance/invoices/${id}`)
}

/**
 * Raise a one-off invoice with no trip behind it — pick an existing client,
 * create one inline from a name and email, or just type a name with no client
 * record at all. Whichever, it starts as an empty draft edited the same way a
 * generated one is (group_83).
 */
export async function createInvoiceFreehand(formData: FormData) {
  const { user, admin } = await authGuard()

  const existingClientId = ((formData.get('existingClientId') as string) || '').trim() || null
  const clientName = ((formData.get('clientName') as string) || '').trim()
  const clientEmail = ((formData.get('clientEmail') as string) || '').trim() || null
  const clientAddress = ((formData.get('clientAddress') as string) || '').trim() || null

  let clientId = existingClientId
  if (!clientId && clientEmail) {
    const [firstName, ...rest] = clientName.split(' ')
    clientId = await findOrCreateClientByEmail(admin, {
      email: clientEmail,
      first_name: firstName || null,
      last_name: rest.join(' ') || null,
      source: 'admin',
    })
  }

  const id = await createBlankInvoice(
    admin,
    { clientId, clientName, clientEmail, clientAddress },
    user.id
  )
  revalidateInvoice(id, null, null)
  redirect(`/admin/finance/invoices/${id}`)
}

/** Edit the header of a draft: who it is addressed to, its dates, its wording. */
export async function updateInvoice(formData: FormData) {
  const { admin } = await authGuard()
  const id = formData.get('id') as string
  if (!id) throw new Error('Missing invoice.')

  const text = (key: string) => {
    const value = (formData.get(key) as string | null)?.trim()
    return value ? value : null
  }

  const { error } = await admin
    .from('invoices')
    .update({
      client_name: text('clientName'),
      client_email: text('clientEmail'),
      client_address: text('clientAddress'),
      due_date: text('dueDate'),
      notes: text('notes'),
      terms: text('terms'),
    })
    .eq('id', id)

  if (error) throw new Error(friendly(error.message))
  revalidateInvoice(id)
}

export async function addInvoiceLine(formData: FormData) {
  const { admin } = await authGuard()
  const invoiceId = formData.get('invoiceId') as string
  const description = (formData.get('description') as string)?.trim()
  const quantity = parseFloat(formData.get('quantity') as string)
  const unitPrice = parseFloat(formData.get('unitPrice') as string)

  if (!invoiceId || !description) throw new Error('A line needs a description.')
  if (isNaN(quantity) || quantity === 0) throw new Error('Quantity must not be zero.')
  if (isNaN(unitPrice)) throw new Error('Enter a unit price.')

  const { error } = await admin.from('invoice_lines').insert({
    invoice_id: invoiceId,
    description_en: description,
    description_ar: ((formData.get('descriptionAr') as string) || '').trim() || null,
    quantity,
    unit_price_usd: unitPrice,
    // A negative line is a discount however it was entered.
    kind: unitPrice < 0 ? 'discount' : 'other',
    sort_order: parseInt((formData.get('sortOrder') as string) || '500', 10) || 500,
  })

  if (error) throw new Error(friendly(error.message))
  revalidateInvoice(invoiceId)
}

export async function deleteInvoiceLine(formData: FormData) {
  const { admin } = await authGuard()
  const id = formData.get('id') as string
  const invoiceId = formData.get('invoiceId') as string
  if (!id) throw new Error('Missing line.')

  const { error } = await admin.from('invoice_lines').delete().eq('id', id)
  if (error) throw new Error(friendly(error.message))
  revalidateInvoice(invoiceId)
}

/**
 * Issue it. The number, issue date and due date are all filled in by Postgres,
 * so an invoice issued from here and one issued from a script come out alike.
 */
export async function issueInvoice(formData: FormData) {
  const { admin } = await authGuard()
  const id = formData.get('id') as string
  if (!id) throw new Error('Missing invoice.')

  const existing = await getInvoice(admin, id)
  if (!existing) throw new Error('Invoice not found.')
  if (existing.lines.length === 0) {
    throw new Error('An invoice needs at least one line before it can be issued.')
  }

  const { error } = await admin.from('invoices').update({ status: 'issued' }).eq('id', id)
  if (error) throw new Error(friendly(error.message))

  revalidateInvoice(id, existing.invoice.quote_id, existing.invoice.booking_id)
}

/** Void it. The number stays spoken for; the reason goes on the record. */
export async function voidInvoice(formData: FormData) {
  const { admin } = await authGuard()
  const id = formData.get('id') as string
  const reason = ((formData.get('reason') as string) || '').trim()
  if (!id) throw new Error('Missing invoice.')
  if (!reason) throw new Error('Say why it is being voided — it stays on the record.')

  const existing = await getInvoice(admin, id)
  if (!existing) throw new Error('Invoice not found.')

  const { error } = await admin
    .from('invoices')
    .update({ status: 'void', void_reason: reason })
    .eq('id', id)

  if (error) throw new Error(friendly(error.message))
  revalidateInvoice(id, existing.invoice.quote_id, existing.invoice.booking_id)
}

/** Discard a draft. Postgres refuses this for anything that was ever issued. */
export async function deleteDraftInvoice(formData: FormData) {
  const { admin } = await authGuard()
  const id = formData.get('id') as string
  if (!id) throw new Error('Missing invoice.')

  const existing = await getInvoice(admin, id)
  const { error } = await admin.from('invoices').delete().eq('id', id)
  if (error) throw new Error(friendly(error.message))

  revalidateInvoice(id, existing?.invoice.quote_id, existing?.invoice.booking_id)
  redirect('/admin/finance/invoices')
}
