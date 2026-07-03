'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'

const CATEGORIES = ['salaries', 'rent', 'fuel', 'marketing', 'office', 'maintenance', 'other']
const METHODS = ['bank_transfer', 'card', 'cash', 'mpesa', 'cheque', 'other']

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

export async function addExpense(formData: FormData) {
  const { user, admin } = await authGuard()

  const description = (formData.get('description') as string)?.trim()
  const category = formData.get('category') as string
  const amount = parseFloat(formData.get('amount') as string)
  const method = (formData.get('method') as string) || null
  const reference = (formData.get('reference') as string)?.trim() || null
  const expenseDate = (formData.get('expenseDate') as string) || new Date().toISOString().slice(0, 10)

  if (!description) throw new Error('Description is required.')
  if (!CATEGORIES.includes(category)) throw new Error('Invalid category.')
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be greater than 0.')
  if (method && !METHODS.includes(method)) throw new Error('Invalid method.')

  const { error } = await admin.from('expenses').insert({
    description,
    category,
    amount_usd: amount,
    method,
    reference,
    expense_date: expenseDate,
    created_by: user.id,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/admin/finance/expenses')
  revalidatePath('/admin/finance/pnl')
}

export async function deleteExpense(formData: FormData) {
  const { admin } = await authGuard()
  const expenseId = formData.get('expenseId') as string
  if (!expenseId) throw new Error('Expense is required.')

  const { error } = await admin.from('expenses').delete().eq('id', expenseId)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/finance/expenses')
  revalidatePath('/admin/finance/pnl')
}
