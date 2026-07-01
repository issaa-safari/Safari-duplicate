'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'

export async function saveSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const text = (name: string) => (formData.get(name) as string | null)?.trim() || null
  const id = text('id')
  const companyName = text('companyName')
  const depositPercent = Number(formData.get('depositPercent'))
  const balanceDueDays = Number(formData.get('balanceDueDays'))
  const defaultMarkupPercent = Number(formData.get('defaultMarkupPercent'))

  if (!id) throw new Error('Settings record ID is missing.')
  if (!companyName) throw new Error('Company name is required.')
  if (!Number.isFinite(depositPercent) || depositPercent < 0 || depositPercent > 100) {
    throw new Error('Deposit percentage must be between 0 and 100.')
  }
  if (!Number.isInteger(balanceDueDays) || balanceDueDays < 0) {
    throw new Error('Balance due days must be zero or greater.')
  }
  if (!Number.isFinite(defaultMarkupPercent) || defaultMarkupPercent < 0) {
    throw new Error('Default markup must be zero or greater.')
  }

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  const { error } = await admin
    .from('company_settings')
    .update({
      company_name: companyName,
      brand_name: text('brandName'),
      email: text('email'),
      phone: text('phone'),
      whatsapp: text('whatsapp'),
      website: text('website'),
      address: text('address'),
      country: text('country'),
      currency_primary: text('currencyPrimary'),
      currency_secondary: text('currencySecondary'),
      bank_account_name: text('bankAccountName'),
      bank_account_number: text('bankAccountNumber'),
      bank_name: text('bankName'),
      bank_account_type: text('bankAccountType'),
      deposit_percent: depositPercent,
      balance_due_days: balanceDueDays,
      cancellation_61_plus: text('cancellation61Plus'),
      cancellation_42_60: text('cancellation4260'),
      cancellation_28_41: text('cancellation2841'),
      cancellation_0_27: text('cancellation027'),
      invoice_prefix: text('invoicePrefix'),
      quote_prefix: text('quotePrefix'),
      booking_prefix: text('bookingPrefix'),
      default_markup_percent: defaultMarkupPercent,
      logo_url: text('logoUrl'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  redirect('/admin/settings')
}
