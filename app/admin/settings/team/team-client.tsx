'use client'

import { useActionState } from 'react'
import { addTeamMember, setTeamMemberRole, setTeamMemberActive } from './actions'

export type Member = {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
}

export default function TeamClient({ members, myEmail }: { members: Member[]; myEmail: string }) {
  const [addState, addAction, addPending] = useActionState(addTeamMember, null)

  return (
    <>
      {/* Add member */}
      <form action={addAction} className="rounded-xl border border-border bg-surface p-5 mb-6">
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
            <button type="submit" disabled={addPending}
              className="rounded-md px-4 py-2 text-sm font-medium text-white bg-olive hover:bg-olive-dk disabled:opacity-60">
              {addPending ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
        {addState?.error && <p className="text-xs text-destructive mt-3">{addState.error}</p>}
        <p className="text-xs text-muted-foreground mt-3">
          Roles are recorded on the account. Access today is all-or-nothing (any active member is a full admin);
          finer role-based restrictions can build on this field later.
        </p>
      </form>

      {/* Members */}
      <div className="rounded-xl border border-border bg-surface divide-y divide-border">
        {members.map((m) => (
          <MemberRow key={m.id} member={m} isSelf={m.email === myEmail} />
        ))}
        {members.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No team members yet.</div>
        )}
      </div>
    </>
  )
}

function MemberRow({ member: m, isSelf }: { member: Member; isSelf: boolean }) {
  const [roleState, roleAction, rolePending] = useActionState(setTeamMemberRole, null)
  const [activeState, activeAction, activePending] = useActionState(setTeamMemberActive, null)
  const rowError = roleState?.error || activeState?.error

  return (
    <div className={`px-5 py-4 ${m.is_active ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{m.full_name || m.email}</span>
            {isSelf && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">you</span>}
            {!m.is_active && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">inactive</span>}
          </div>
          {m.full_name && <p className="text-xs text-muted-foreground">{m.email}</p>}
        </div>

        {m.role === 'owner' ? (
          // Owner is a protected role that this editor can't set, so show it as
          // a static badge — a select limited to admin/editor would otherwise
          // render as "Admin" and silently demote the owner on Save.
          <span className="text-xs px-2.5 py-1.5 rounded border border-border text-muted-foreground">Owner</span>
        ) : (
          <form action={roleAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={m.id} />
            <select name="role" defaultValue={m.role}
              className="rounded-md border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50">
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
            </select>
            <button type="submit" disabled={rolePending}
              className="text-xs px-2.5 py-1.5 rounded border border-border hover:border-primary-strong text-muted-foreground hover:text-foreground disabled:opacity-60">
              {rolePending ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}

        <form action={activeAction}>
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="active" value={m.is_active ? 'false' : 'true'} />
          <button type="submit"
            disabled={(isSelf && m.is_active) || activePending}
            title={isSelf && m.is_active ? 'You cannot deactivate your own account' : undefined}
            className="text-xs px-2.5 py-1.5 rounded border border-border hover:border-primary-strong text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed">
            {m.is_active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      {rowError && <p className="text-xs text-destructive mt-2">{rowError}</p>}
    </div>
  )
}
