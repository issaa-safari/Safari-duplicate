import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addTeamMember, setTeamMemberRole, setTeamMemberActive } from './actions'

type Member = {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
}

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

      {/* Add member */}
      <form action={addTeamMember} className="rounded-xl border border-border bg-surface p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Add a team member</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="block text-xs text-muted-foreground mb-1">Email</span>
            <input type="email" name="email" required placeholder="name@example.com"
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
          </label>
          <label className="block">
            <span className="block text-xs text-muted-foreground mb-1">Name (optional)</span>
            <input type="text" name="fullName"
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
          </label>
          <div className="flex gap-2">
            <select name="role" defaultValue="admin"
              className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50">
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
            </select>
            <button type="submit" className="rounded-md px-4 py-2 text-sm font-medium text-white bg-olive hover:bg-olive-dk">Add</button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Roles are recorded on the account. Access today is all-or-nothing (any active member is a full admin);
          finer role-based restrictions can build on this field later.
        </p>
      </form>

      {/* Members */}
      <div className="rounded-xl border border-border bg-surface divide-y divide-border">
        {members.map((m) => {
          const isSelf = m.email === myEmail
          return (
            <div key={m.id} className={`flex flex-wrap items-center gap-3 px-5 py-4 ${m.is_active ? '' : 'opacity-60'}`}>
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{m.full_name || m.email}</span>
                  {isSelf && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">you</span>}
                  {!m.is_active && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">inactive</span>}
                </div>
                {m.full_name && <p className="text-xs text-muted-foreground">{m.email}</p>}
              </div>

              <form action={setTeamMemberRole} className="flex items-center gap-2">
                <input type="hidden" name="id" value={m.id} />
                <select name="role" defaultValue={m.role}
                  className="rounded-md border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50">
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                </select>
                <button type="submit" className="text-xs px-2.5 py-1.5 rounded border border-border hover:border-primary-strong text-muted-foreground hover:text-foreground">Save</button>
              </form>

              <form action={setTeamMemberActive}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="active" value={m.is_active ? 'false' : 'true'} />
                <button type="submit"
                  disabled={isSelf && m.is_active}
                  title={isSelf && m.is_active ? 'You cannot deactivate your own account' : undefined}
                  className="text-xs px-2.5 py-1.5 rounded border border-border hover:border-primary-strong text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed">
                  {m.is_active ? 'Deactivate' : 'Reactivate'}
                </button>
              </form>
            </div>
          )
        })}
        {members.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No team members yet.</div>
        )}
      </div>
    </div>
  )
}
