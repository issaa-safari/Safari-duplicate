import type { SupabaseClient } from '@supabase/supabase-js'

export async function getAdminProfile(admin: SupabaseClient, email?: string | null) {
  if (!email) return null

  const { data, error } = await admin
    .from('admin_users')
    .select('full_name, role')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return data
}

export async function assertAdminAccess(admin: SupabaseClient, email?: string | null) {
  const profile = await getAdminProfile(admin, email)
  if (!profile) throw new Error('You are not authorized to access the admin system.')
  return profile
}
