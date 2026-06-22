import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import SettingsForm from './form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: settings, error } = await admin
    .from('company_settings')
    .select('*')
    .limit(1)
    .single()

  if (error || !settings) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-sm text-red-600">Could not load settings: {error?.message}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Company information, banking, and booking defaults</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  )
}
