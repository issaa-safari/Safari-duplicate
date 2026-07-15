'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { syncQuoteStatus } from '@/lib/server/quote-status'
import { safeAction } from '@/lib/server/action-result'
import { logActivity } from '@/lib/server/audit'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Your session has expired — please log in again.')
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

// The fine-grained saves below intentionally do NOT call revalidatePath:
// the quote workspace keeps its own client state in sync, and revalidating
// forced a full re-render of the (very query-heavy) quote page on every
// small save, which is what made saving feel slow.

export const saveDates = safeAction(async (formData: FormData) => {
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
})

export const saveLanguage = safeAction(async (formData: FormData) => {
  const { admin } = await authGuard()
  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string
  const language = formData.get('language') as string
  if (!['en', 'ar'].includes(language)) throw new Error('Invalid language.')
  await requireMutableVersion(admin, versionId, quoteId)
  const { error } = await admin.from('quote_versions').update({ language }).eq('id', versionId)
  if (error) throw new Error(error.message)
})

const TRAVELLER_COLUMNS =
  'id, display_name, age_on_travel_date, age_band_id, age_band_snapshot, pricing_fixed_amount_usd, traveller_category, room_category, is_paying, is_complimentary, sort_order'

export const addTraveller = safeAction(async (formData: FormData) => {
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

  const { data: inserted, error } = await admin.from('quote_travellers').insert({
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
  }).select(TRAVELLER_COLUMNS).single()

  if (error) throw new Error(error.message)
  return { error: null, traveller: inserted as Record<string, unknown> }
})

export const deleteTraveller = safeAction(async (formData: FormData) => {
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
})

export const updateTraveller = safeAction(async (formData: FormData) => {
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

  const { data: updated, error } = await admin
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
    .select(TRAVELLER_COLUMNS)
    .single()

  if (error) throw new Error(error.message)
  return { error: null, traveller: updated as Record<string, unknown> }
})

export const setVersionStatus = safeAction(async (formData: FormData) => {
  const { admin, user } = await authGuard()
  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string
  const newStatus = formData.get('status') as string

  const allowed = ['draft', 'ready', 'sent']
  if (!allowed.includes(newStatus)) throw new Error('Invalid status.')

  const { data: version } = await admin
    .from('quote_versions').select('status').eq('id', versionId).eq('quote_id', quoteId).single()
  if (!version) throw new Error('Version not found.')

  const transitions: Record<string, string[]> = {
    ready: ['draft', 'sent'],
    sent: ['ready'],
  }
  if (!transitions[version.status]?.includes(newStatus)) {
    throw new Error(`Cannot move from ${version.status} to ${newStatus}.`)
  }

  // Completeness gate: a version can only be marked Ready (or shared as Sent)
  // once it has at least one itinerary day. Without this a blank version could
  // be published as an empty proposal to the client.
  if (newStatus === 'ready' || newStatus === 'sent') {
    const { count, error: countError } = await admin
      .from('quote_days')
      .select('id', { count: 'exact', head: true })
      .eq('quote_version_id', versionId)
    if (countError) throw new Error(countError.message)
    if (!count || count < 1) {
      throw new Error('Add at least one itinerary day before marking this quote Ready.')
    }
  }

  const { error } = await admin.from('quote_versions').update({ status: newStatus }).eq('id', versionId)
  if (error) throw new Error(error.message)
  await syncQuoteStatus(admin, quoteId)
  await logActivity(admin, {
    entityType: 'quote',
    entityId: quoteId,
    action: 'version_status_changed',
    summary: `Quote version moved from ${version.status} to ${newStatus}`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { versionId, from: version.status, to: newStatus },
  })

  // Status drives which versions the Preview/Send panel can share, so this
  // one does refresh the page data.
  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
  revalidatePath(`/admin/quotes/${quoteId}`)
})
