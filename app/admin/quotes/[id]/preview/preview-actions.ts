'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const SECTIONS = ['cover', 'itinerary', 'inclusions', 'pricing']
const THEMES = ['classic', 'modern', 'safari']

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { admin }
}

export async function savePreviewTheme(formData: FormData) {
  const { admin } = await authGuard()
  const quoteId = (formData.get('quoteId') as string)?.trim()
  const versionId = (formData.get('versionId') as string)?.trim()
  const theme = (formData.get('theme') as string)?.trim()
  if (!versionId || !THEMES.includes(theme)) throw new Error('Invalid theme.')
  const { error } = await admin.from('quote_versions').update({ preview_theme: theme }).eq('id', versionId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/preview`)
}

export async function savePreviewLayout(formData: FormData) {
  const { admin } = await authGuard()
  const quoteId = (formData.get('quoteId') as string)?.trim()
  const versionId = (formData.get('versionId') as string)?.trim()
  const layoutRaw = (formData.get('layout') as string) ?? ''
  const layout = layoutRaw.split(',').map(s => s.trim()).filter(s => SECTIONS.includes(s))
  // Keep any missing sections appended so nothing is dropped.
  const full = [...layout, ...SECTIONS.filter(s => !layout.includes(s))]
  if (!versionId) throw new Error('Missing version.')
  const { error } = await admin.from('quote_versions').update({ preview_layout: full }).eq('id', versionId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/preview`)
}
