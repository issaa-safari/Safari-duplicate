'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertAdminAccess } from '@/lib/auth/admin-access'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

async function requireMutableVersion(admin: SupabaseClient, versionId: string, quoteId: string) {
  const { data: version, error } = await admin
    .from('quote_versions')
    .select('id, status')
    .eq('id', versionId)
    .eq('quote_id', quoteId)
    .single()

  if (error || !version) throw new Error('Quote version not found.')
  if (!['draft', 'ready'].includes(version.status)) {
    throw new Error('This quote version is locked and cannot be changed.')
  }
}

function validateTravellerInput(
  age: number | null,
  roomCategory: string,
  pricingMethod: string,
  pricingValue: number | null
) {
  if (age !== null && (!Number.isInteger(age) || age < 0)) throw new Error('Age must be a positive whole number.')
  if (!['sharing', 'single', 'triple', 'extra_bed', 'no_bed'].includes(roomCategory)) {
    throw new Error('Invalid room category.')
  }
  if (!['percentage', 'fixed', 'free'].includes(pricingMethod)) throw new Error('Invalid pricing method.')
  if (pricingMethod === 'percentage' && (pricingValue === null || !Number.isFinite(pricingValue) || pricingValue < 0 || pricingValue > 200)) {
    throw new Error('Percentage must be between 0 and 200.')
  }
  if (pricingMethod === 'fixed' && (pricingValue === null || !Number.isFinite(pricingValue) || pricingValue < 0)) {
    throw new Error('Fixed price must be zero or greater.')
  }
}

export async function saveDates(formData: FormData) {
  const { admin } = await authGuard()

  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string
  const startDate = (formData.get('travelStartDate') as string) || null
  const endDate = (formData.get('travelEndDate') as string) || null

  if (!versionId || !quoteId) throw new Error('Missing version or quote ID.')
  if (startDate && endDate && endDate < startDate) {
    throw new Error('End date cannot be before start date.')
  }

  await requireMutableVersion(admin, versionId, quoteId)
  const { error } = await admin
    .from('quote_versions')
    .update({ travel_start_date: startDate, travel_end_date: endDate })
    .eq('id', versionId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
}

export async function saveLanguage(formData: FormData) {
  const { admin } = await authGuard()
  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string
  const language = formData.get('language') as string
  if (!['en', 'ar'].includes(language)) throw new Error('Invalid language.')
  await requireMutableVersion(admin, versionId, quoteId)
  const { error } = await admin.from('quote_versions').update({ language }).eq('id', versionId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
}

export async function addTraveller(formData: FormData) {
  const { admin } = await authGuard()

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
  const pricingValue = pricingPercentRaw !== '' ? parseFloat(pricingPercentRaw) : null

  if (!ageBandId) throw new Error('Age band is required.')
  if (!travellerCategory) throw new Error('Traveller category is required.')
  validateTravellerInput(age, roomCategory, pricingMethod, pricingValue)

  await requireMutableVersion(admin, versionId, quoteId)

  const { data: band } = await admin
    .from('traveller_age_bands')
    .select('*')
    .eq('id', ageBandId)
    .single()

  if (!band) throw new Error('Age band not found.')
  if (age !== null && (age < band.min_age || (band.max_age !== null && age > band.max_age))) {
    throw new Error(`Age does not match the ${band.name} age band.`)
  }

  // Snapshot captures the band at point of creation, with any per-traveller overrides
  const ageBandSnapshot = {
    ...(band ?? {}),
    default_pricing_method: pricingMethod || band?.default_pricing_method,
    default_percentage: pricingMethod === 'percentage'
      ? (pricingValue ?? band?.default_percentage)
      : null,
    default_fixed_amount_usd: pricingMethod === 'fixed'
      ? (pricingValue ?? band?.default_fixed_amount_usd)
      : null,
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
    pricing_fixed_amount_usd: pricingMethod === 'fixed' ? pricingValue : null,
    traveller_category: band.code,
    room_category: roomCategory,
    is_paying: isComplimentary ? false : isPaying,
    is_complimentary: isComplimentary,
    sort_order: count ?? 0,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
}

export async function deleteTraveller(formData: FormData) {
  const { admin } = await authGuard()

  const travellerId = formData.get('travellerId') as string
  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string

  await requireMutableVersion(admin, versionId, quoteId)
  const { error } = await admin
    .from('quote_travellers')
    .delete()
    .eq('id', travellerId)
    .eq('quote_version_id', versionId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
}

export async function updateTraveller(formData: FormData) {
  const { admin } = await authGuard()

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
  const pricingValue = pricingPercentRaw !== '' ? parseFloat(pricingPercentRaw) : null
  validateTravellerInput(age, roomCategory, pricingMethod, pricingValue)

  await requireMutableVersion(admin, versionId, quoteId)

  const { data: band } = await admin
    .from('traveller_age_bands')
    .select('*')
    .eq('id', ageBandId)
    .single()

  if (!band) throw new Error('Age band not found.')
  if (age !== null && (age < band.min_age || (band.max_age !== null && age > band.max_age))) {
    throw new Error(`Age does not match the ${band.name} age band.`)
  }

  const ageBandSnapshot = {
    ...(band ?? {}),
    default_pricing_method: pricingMethod || band?.default_pricing_method,
    default_percentage: pricingMethod === 'percentage'
      ? (pricingValue ?? band?.default_percentage)
      : null,
    default_fixed_amount_usd: pricingMethod === 'fixed'
      ? (pricingValue ?? band?.default_fixed_amount_usd)
      : null,
  }

  const { error } = await admin
    .from('quote_travellers')
    .update({
      display_name: displayName,
      age_on_travel_date: age,
      age_band_id: ageBandId,
      age_band_snapshot: ageBandSnapshot,
      pricing_fixed_amount_usd: pricingMethod === 'fixed' ? pricingValue : null,
      traveller_category: band.code,
      room_category: roomCategory,
      is_paying: isComplimentary ? false : isPaying,
      is_complimentary: isComplimentary,
    })
    .eq('id', travellerId)
    .eq('quote_version_id', versionId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
}

export async function savePricing(formData: FormData) {
  const { admin } = await authGuard()

  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string
  const costBaseStr = (formData.get('costBase') as string) || ''
  const markupPercentStr = (formData.get('markupPercent') as string) || ''

  if (!versionId || !quoteId) throw new Error('Missing version or quote ID.')

  const costBase = costBaseStr !== '' ? parseFloat(costBaseStr) : null
  const markupPercent = markupPercentStr !== '' ? parseFloat(markupPercentStr) : 0

  if (costBase !== null && (!Number.isFinite(costBase) || costBase < 0)) {
    throw new Error('Cost base must be zero or greater.')
  }
  if (!Number.isFinite(markupPercent) || markupPercent < 0 || markupPercent > 500) {
    throw new Error('Markup percent must be between 0 and 500.')
  }

  await requireMutableVersion(admin, versionId, quoteId)

  const { error } = await admin
    .from('quote_versions')
    .update({
      cost_base_usd: costBase,
      default_markup_percent: markupPercent,
    })
    .eq('id', versionId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
}
