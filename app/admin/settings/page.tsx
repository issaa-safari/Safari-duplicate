import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import SettingsForm from './form'

const DEFAULTS = {
  company_name: 'Safari Adventure Tour',
  contact_email: null,
  phone: null,
  whatsapp: null,
  default_deposit_pct: 30,
  usd_to_kes_rate: 130,
  updated_at: new Date().toISOString(),
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data } = await admin
    .from('company_settings')
    .select('*')
    .eq('id', 1)
    .single()

  const settings = data ?? DEFAULTS

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Company information and booking defaults</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  )
}
