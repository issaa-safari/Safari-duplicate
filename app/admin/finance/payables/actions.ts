'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

export async function recordSupplierPayment(formData: FormData) {
  const { user, admin } = await authGuard()

  const supplierId = formData.get('supplierId') as string
  const quoteId = (formData.get('quoteId') as string) || null
  const amount = parseFloat(formData.get('amount') as string)
  const method = (formData.get('method') as string) || null
  const reference = (formData.get('reference') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null
  const paidAt = (formData.get('paidAt') as string) || new Date().toISOString().slice(0, 10)

  if (!supplierId) throw new Error('Supplier is required.')
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be greater than 0.')
  if (method && !['bank_transfer', 'card', 'cash', 'mpesa', 'cheque', 'other'].includes(method)) {
    throw new Error('Invalid payment method.')
  }

  const { data: supplier } = await admin
    .from('suppliers').select('id').eq('id', supplierId).maybeSingle()
  if (!supplier) throw new Error('Supplier not found.')

  const { error } = await admin.from('supplier_payments').insert({
    supplier_id: supplierId,
    quote_id: quoteId,
    amount_usd: amount,
    method,
    reference,
    notes,
    paid_at: paidAt,
    created_by: user.id,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/admin/finance/payables')
}
