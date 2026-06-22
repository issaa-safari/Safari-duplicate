'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  return user
}

export async function saveDates(formData: FormData) {
  await authGuard()

  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string
  const startDate = (formData.get('travelStartDate') as string) || null
  const endDate = (formData.get('travelEndDate') as string) || null

  if (!versionId || !quoteId) throw new Error('Missing version or quote ID.')

  const admin = createAdminClient()
  const { error } = await admin
    .from('quote_versions')
    .update({ travel_start_date: startDate, travel_end_date: endDate })
    .eq('id', versionId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
}

export async function addTraveller(formData: FormData) {
  const user = await authGuard()

  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string
  const ageBandId = formData.get('ageBandId') as string
  const travellerCategory = formData.get('travellerCategory') as string
  const roomCategory = (formData.get('roomCategory') as string) || 'sharing'
  const displayName = (formData.get('displayName') as string)?.trim() || null
  const ageRaw = formData.get('age') as string
  const age = ageRaw !== '' && ageRaw != null ? parseInt(ageRaw) : null
  const isPaying = formData.get('isPaying') !== 'false'
  const isComplimentary = formData.get('isComplimentary') === 'true'
  const pricingMethod = formData.get('pricingMethod') as string
  const pricingPercentRaw = formData.get('pricingPercent') as string
  const pricingPercent = pricingPercentRaw !== '' ? parseFloat(pricingPercentRaw) : null

  if (!ageBandId) throw new Error('Age band is required.')
  if (!travellerCategory) throw new Error('Traveller category is required.')

  const admin = createAdminClient()

  const { data: band } = await admin
    .from('traveller_age_bands')
    .select('*')
    .eq('id', ageBandId)
    .single()

  // Snapshot captures the band at point of creation, with any per-traveller overrides
  const ageBandSnapshot = {
    ...(band ?? {}),
    default_pricing_method: pricingMethod || band?.default_pricing_method,
    default_percentage: pricingPercent ?? band?.default_percentage,
  }

  const { count } = await admin
    .from('quote_travellers')
    .select('*', { count: 'exact', head: true })
    .eq('quote_version_id', versionId)

  const { error } = await admin.from('quote_travellers').insert({
    quote_version_id: versionId,
    display_name: displayName,
    age_on_travel_date: age,
    age_band_id: ageBandId,
    age_band_snapshot: ageBandSnapshot,
    traveller_category: travellerCategory,
    room_category: roomCategory,
    is_paying: isPaying,
    is_complimentary: isComplimentary,
    sort_order: count ?? 0,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
}

export async function deleteTraveller(formData: FormData) {
  await authGuard()

  const travellerId = formData.get('travellerId') as string
  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string

  const admin = createAdminClient()
  const { error } = await admin
    .from('quote_travellers')
    .delete()
    .eq('id', travellerId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
}

export async function updateTraveller(formData: FormData) {
  await authGuard()

  const travellerId = formData.get('travellerId') as string
  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string
  const ageBandId = formData.get('ageBandId') as string
  const travellerCategory = formData.get('travellerCategory') as string
  const roomCategory = (formData.get('roomCategory') as string) || 'sharing'
  const displayName = (formData.get('displayName') as string)?.trim() || null
  const ageRaw = formData.get('age') as string
  const age = ageRaw !== '' && ageRaw != null ? parseInt(ageRaw) : null
  const isPaying = formData.get('isPaying') !== 'false'
  const isComplimentary = formData.get('isComplimentary') === 'true'
  const pricingMethod = formData.get('pricingMethod') as string
  const pricingPercentRaw = formData.get('pricingPercent') as string
  const pricingPercent = pricingPercentRaw !== '' ? parseFloat(pricingPercentRaw) : null

  const admin = createAdminClient()

  const { data: band } = await admin
    .from('traveller_age_bands')
    .select('*')
    .eq('id', ageBandId)
    .single()

  const ageBandSnapshot = {
    ...(band ?? {}),
    default_pricing_method: pricingMethod || band?.default_pricing_method,
    default_percentage: pricingPercent ?? band?.default_percentage,
  }

  const { error } = await admin
    .from('quote_travellers')
    .update({
      display_name: displayName,
      age_on_travel_date: age,
      age_band_id: ageBandId,
      age_band_snapshot: ageBandSnapshot,
      traveller_category: travellerCategory,
      room_category: roomCategory,
      is_paying: isPaying,
      is_complimentary: isComplimentary,
    })
    .eq('id', travellerId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
}
