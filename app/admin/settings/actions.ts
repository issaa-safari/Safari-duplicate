'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function saveSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const companyName = (formData.get('companyName') as string)?.trim()
  const contactEmail = (formData.get('contactEmail') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()
  const whatsapp = (formData.get('whatsapp') as string)?.trim()
  const defaultDepositPct = parseInt(formData.get('defaultDepositPct') as string) || 30
  const usdToKesRate = parseFloat(formData.get('usdToKesRate') as string) || 130

  if (!companyName) throw new Error('Company name is required.')
  if (defaultDepositPct < 1 || defaultDepositPct > 100) throw new Error('Deposit % must be between 1 and 100.')
  if (usdToKesRate <= 0) throw new Error('Exchange rate must be greater than 0.')

  const admin = createAdminClient()
  const { error } = await admin
    .from('company_settings')
    .upsert({
      id: 1,
      company_name: companyName,
      contact_email: contactEmail || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      default_deposit_pct: defaultDepositPct,
      usd_to_kes_rate: usdToKesRate,
      updated_at: new Date().toISOString(),
    })

  if (error) throw new Error(error.message)

  redirect('/admin/settings')
}
