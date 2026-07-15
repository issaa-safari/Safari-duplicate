import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <p className="text-sm text-destructive">Could not load settings: {error?.message}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Company information, banking, and booking defaults</p>
      </div>
      <div className="mb-4 flex flex-wrap gap-4">
        <Link href="/admin/settings/default-tasks"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-text hover:text-brand-ink">
          Manage Default Tasks →
        </Link>
        <Link href="/admin/settings/team"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-text hover:text-brand-ink">
          Manage Team →
        </Link>
      </div>
      <SettingsForm settings={settings} />
    </div>
  )
}
