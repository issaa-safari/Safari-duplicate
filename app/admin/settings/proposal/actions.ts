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

export async function saveProposalTemplate(formData: FormData) {
  const { admin } = await authGuard()
  const id = (formData.get('id') as string)?.trim() || null
  const str = (n: string) => (formData.get(n) as string)?.trim() || null

  const payload = {
    title: str('title') ?? 'Default proposal template',
    cover_intro_en: str('coverIntroEn'),
    cover_intro_ar: str('coverIntroAr'),
    email_subject_en: str('emailSubjectEn'),
    email_subject_ar: str('emailSubjectAr'),
    email_message_en: str('emailMessageEn'),
    email_message_ar: str('emailMessageAr'),
    email_signature_en: str('emailSignatureEn'),
    email_signature_ar: str('emailSignatureAr'),
    is_active: true,
  }

  if (id) {
    const { error } = await admin.from('proposal_templates').update(payload).eq('id', id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await admin.from('proposal_templates').insert(payload)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/admin/settings/proposal')
}
