import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TeamClient, { type Member } from './team-client'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data } = await admin
    .from('admin_users')
    .select('id, email, full_name, role, is_active, created_at')
    .order('created_at', { ascending: true })

  const members = (data ?? []) as Member[]
  const myEmail = (user.email ?? '').toLowerCase()

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/admin/settings" className="text-sm text-muted-foreground hover:text-foreground">← Settings</Link>
      </div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Team</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage who can access the admin system. A person gets access when their email is added here and they
        sign in with it. Deactivate to revoke access without deleting the record.
      </p>

      <TeamClient members={members} myEmail={myEmail} />
    </div>
  )
}
