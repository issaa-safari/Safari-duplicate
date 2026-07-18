'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { geoColumnsFromForm } from '@/lib/geo'
import { redirect } from 'next/navigation'

export async function updateAccommodation(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const name = (formData.get('name') as string)?.trim()
  const destinationId = (formData.get('destinationId') as string) || null
  const type = (formData.get('type') as string) || 'hotel'
  const budgetTier = (formData.get('budgetTier') as string) || 'luxury'
  const rating = parseInt(formData.get('rating') as string) || 4
  const descriptionEn = (formData.get('descriptionEn') as string)?.trim()
  const descriptionAr = (formData.get('descriptionAr') as string)?.trim()
  const coverImageUrl = (formData.get('coverImageUrl') as string)?.trim()
  const isActive = formData.get('isActive') === 'true'

  // Gallery photos arrive as a JSON array of already-uploaded URLs.
  let galleryUrls: string[] = []
  try {
    const parsed = JSON.parse((formData.get('galleryUrls') as string) || '[]')
    if (Array.isArray(parsed)) galleryUrls = parsed.filter((u): u is string => typeof u === 'string' && !!u)
  } catch {
    // malformed input → keep an empty gallery rather than failing the save
  }

  if (!name) throw new Error('Name is required.')

  const hasContent = !!(descriptionEn || coverImageUrl)

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  const { error } = await admin
    .from('accommodations')
    .update({
      name,
      destination_id: destinationId || null,
      type,
      budget_tier: budgetTier,
      rating,
      description_en: descriptionEn || null,
      description_ar: descriptionAr || null,
      cover_image_url: coverImageUrl || null,
      gallery_urls: galleryUrls,
      is_active: isActive,
      has_content: hasContent,
      ...geoColumnsFromForm(formData),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  redirect('/admin/content/accommodations')
}
