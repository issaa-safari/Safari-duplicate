'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'

export async function createStaffMember(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const name = (formData.get('name') as string)?.trim()
  const role = (formData.get('role') as string) || 'guide'
  const phone = (formData.get('phone') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const notes = (formData.get('notes') as string)?.trim()
  const isActive = formData.get('isActive') === 'true'

  if (!name) throw new Error('Name is required.')

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  const { error } = await admin
    .from('tour_staff')
    .insert({
      name,
      role,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      is_active: isActive,
    })

  if (error) throw new Error(error.message)

  redirect('/admin/content/staff')
}
