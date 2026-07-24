'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { admin }
}

export async function saveAgreementTemplate(formData: FormData) {
  const { admin } = await authGuard()
  const id = (formData.get('id') as string)?.trim() || null
  const title = (formData.get('title') as string)?.trim()
  const body = (formData.get('body') as string)?.trim()
  const versionLabel = (formData.get('versionLabel') as string)?.trim() || null
  const language = (formData.get('language') as string) === 'ar' ? 'ar' : 'en'

  if (!title) throw new Error('Title is required.')
  if (!body) throw new Error('Agreement body is required.')

  if (id) {
    const { error } = await admin.from('agreement_templates')
      .update({ title, body, version_label: versionLabel, language, is_active: true })
      .eq('id', id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await admin.from('agreement_templates')
      .insert({ title, body, version_label: versionLabel, language, is_active: true })
    if (error) throw new Error(error.message)
  }
  revalidatePath('/admin/agreements')
}
