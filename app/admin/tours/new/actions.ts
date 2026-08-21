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
  const sourceTourId = (formData.get('sourceTourId') as string)?.trim() || null

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

  // Cloning a saved itinerary: pull its full content (overview, highlights,
  // included/excluded, gallery, pricing defaults, …) except the identity and
  // lifecycle columns, and the fields the quick-create form already controls.
  let clonedFields: Record<string, unknown> = {}
  if (sourceTourId) {
    const { data: src, error: srcErr } = await admin
      .from('tours')
      .select('*')
      .eq('id', sourceTourId)
      .single()
    if (srcErr || !src) throw new Error('The saved itinerary to clone from was not found.')

    const {
      id: _srcId, slug: _srcSlug, title_en: _srcTitleEn, type: _srcType,
      duration_days: _srcDurationDays, duration_nights: _srcDurationNights,
      status: _srcStatus, created_at: _srcCreatedAt, updated_at: _srcUpdatedAt,
      ...rest
    } = src as Record<string, unknown>
    clonedFields = rest
  } else {
    clonedFields = {
      deposit_percent: 30,
      max_group_size: 12,
      show_on_website: true,
      featured: false,
    }
  }

  const { data: newTour, error } = await admin
    .from('tours')
    .insert({
      ...clonedFields,
      title_en: titleEn,
      type,
      slug,
      status: 'draft',
      duration_days: durationDays,
      duration_nights: durationNights,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  // Clone the source's itinerary days onto the new tour so the whole
  // day-by-day plan comes along, ready to edit and save as a new itinerary.
  if (sourceTourId) {
    const { data: days, error: daysReadErr } = await admin
      .from('tour_days')
      .select('*')
      .eq('tour_id', sourceTourId)
      .order('day_number', { ascending: true })
    if (daysReadErr) throw new Error(`Itinerary created, but reading days to copy failed: ${daysReadErr.message}`)

    if (days?.length) {
      const clonedDays = (days as Record<string, unknown>[]).map(
        ({ id: _dayId, tour_id: _tourId, created_at: _dCreatedAt, updated_at: _dUpdatedAt, ...rest }) => ({
          ...rest,
          tour_id: newTour.id,
        })
      )
      const { error: daysErr } = await admin.from('tour_days').insert(clonedDays)
      if (daysErr) throw new Error(`Itinerary created, but copying days failed: ${daysErr.message}`)
    }
  }

  redirect(`/admin/tours/${newTour.id}`)
}