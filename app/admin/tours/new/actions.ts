'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'

export async function createTour(formData: FormData) {
  // Auth gate — session client only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const titleEn = (formData.get('titleEn') as string)?.trim()
  const type = formData.get('type') as string
  const durationDays = parseInt(formData.get('durationDays') as string) || 1
  const durationNights = Math.max(0, durationDays - 1)

  if (!titleEn) throw new Error('Title is required.')

  // slug from the title — lowercase, hyphenated, stripped of odd chars
  const baseSlug = titleEn
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  // All DB work through the admin client — no cookies, bypasses RLS, logout-safe
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)

  // Ensure the slug is unique (append -2, -3… if taken)
  let slug = baseSlug
  let n = 1
  while (true) {
    const { data: clash } = await admin
      .from('tours')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!clash) break
    n += 1
    slug = `${baseSlug}-${n}`
  }

  const { data: newTour, error } = await admin
    .from('tours')
    .insert({
      title_en: titleEn,
      type,
      slug,
      status: 'draft',
      duration_days: durationDays,
      duration_nights: durationNights,
      deposit_percent: 30,
      max_group_size: 12,
      show_on_website: true,
      featured: false,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  redirect(`/admin/tours/${newTour.id}`)
}