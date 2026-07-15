'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { logActivity } from '@/lib/server/audit'

const ROLES = ['admin', 'editor'] as const

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

function normaliseEmail(raw: unknown) {
  return String(raw ?? '').trim().toLowerCase()
}

export async function addTeamMember(formData: FormData) {
  const { user, admin } = await authGuard()
  const email = normaliseEmail(formData.get('email'))
  const fullName = String(formData.get('fullName') ?? '').trim() || null
  const role = String(formData.get('role') ?? 'admin')

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid email address.')
  if (!ROLES.includes(role as (typeof ROLES)[number])) throw new Error('Invalid role.')

  const { data: existing } = await admin.from('admin_users').select('id').eq('email', email).maybeSingle()
  if (existing) throw new Error('That email is already a team member.')

  const { error } = await admin.from('admin_users').insert({
    email,
    full_name: fullName,
    role,
    is_active: true,
  })
  if (error) throw new Error(error.message)

  await logActivity(admin, {
    entityType: 'admin_user',
    action: 'team_member_added',
    summary: `Added ${email} to the team (${role})`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { email, role },
  })
  revalidatePath('/admin/settings/team')
}

export async function setTeamMemberRole(formData: FormData) {
  const { user, admin } = await authGuard()
  const id = String(formData.get('id') ?? '')
  const role = String(formData.get('role') ?? '')
  if (!ROLES.includes(role as (typeof ROLES)[number])) throw new Error('Invalid role.')

  const { error } = await admin.from('admin_users').update({ role }).eq('id', id)
  if (error) throw new Error(error.message)

  await logActivity(admin, {
    entityType: 'admin_user',
    entityId: id,
    action: 'team_role_changed',
    summary: `Changed a team member's role to ${role}`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { role },
  })
  revalidatePath('/admin/settings/team')
}

export async function setTeamMemberActive(formData: FormData) {
  const { user, admin } = await authGuard()
  const id = String(formData.get('id') ?? '')
  const active = formData.get('active') === 'true'

  const { data: target } = await admin.from('admin_users').select('email, is_active').eq('id', id).maybeSingle()
  if (!target) throw new Error('Team member not found.')

  // Don't let someone lock themselves out.
  if (!active && target.email === (user.email ?? '').toLowerCase()) {
    throw new Error('You cannot deactivate your own account.')
  }
  // Never leave zero active admins.
  if (!active) {
    const { count } = await admin
      .from('admin_users')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
    if ((count ?? 0) <= 1) throw new Error('At least one active team member is required.')
  }

  const { error } = await admin.from('admin_users').update({ is_active: active }).eq('id', id)
  if (error) throw new Error(error.message)

  await logActivity(admin, {
    entityType: 'admin_user',
    entityId: id,
    action: active ? 'team_member_activated' : 'team_member_deactivated',
    summary: `${active ? 'Reactivated' : 'Deactivated'} ${target.email}`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { email: target.email },
  })
  revalidatePath('/admin/settings/team')
}
