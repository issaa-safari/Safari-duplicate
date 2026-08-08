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
  return admin
}

function readForm(formData: FormData) {
  const nameEn = (formData.get('nameEn') as string)?.trim()
  if (!nameEn) throw new Error('An English name is required.')

  const price = parseFloat((formData.get('defaultPriceUsd') as string) ?? '')
  const sortOrder = parseInt((formData.get('sortOrder') as string) ?? '', 10)
  const pricingUnit = (formData.get('pricingUnit') as string) === 'booking' ? 'booking' : 'person'

  return {
    name_en: nameEn,
    name_ar: (formData.get('nameAr') as string)?.trim() || null,
    description_en: (formData.get('descriptionEn') as string)?.trim() || null,
    description_ar: (formData.get('descriptionAr') as string)?.trim() || null,
    default_price_usd: !isNaN(price) && price >= 0 ? price : 0,
    pricing_unit: pricingUnit,
    is_active: formData.get('isActive') === 'true',
    sort_order: !isNaN(sortOrder) ? sortOrder : 0,
  }
}

export async function createService(formData: FormData) {
  const admin = await authGuard()
  const { error } = await admin.from('services').insert(readForm(formData))
  // The catalogue is unique on name, so a duplicate is a user mistake rather
  // than a fault — say so in those terms.
  if (error) {
    throw new Error(
      error.code === '23505' ? 'A service with that name already exists.' : error.message
    )
  }
  revalidatePath('/admin/content/services')
  redirect('/admin/content/services')
}

export async function updateService(formData: FormData) {
  const admin = await authGuard()
  const id = formData.get('id') as string
  const { error } = await admin.from('services').update(readForm(formData)).eq('id', id)
  if (error) {
    throw new Error(
      error.code === '23505' ? 'A service with that name already exists.' : error.message
    )
  }
  revalidatePath('/admin/content/services')
  redirect('/admin/content/services')
}

/**
 * Retire a service rather than deleting it. A service any trip has already
 * bought cannot be deleted at all — the foreign key is `on delete restrict`, so
 * that a client's charges can never be silently erased.
 */
export async function retireService(formData: FormData) {
  const admin = await authGuard()
  const id = formData.get('id') as string
  const { error } = await admin.from('services').update({ is_active: false }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/content/services')
  redirect('/admin/content/services')
}
