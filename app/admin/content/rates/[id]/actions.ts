'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { COST_CATEGORIES, ENTITY_TYPES, PRICING_UNITS, RESIDENCIES } from '../constants'

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return admin
}

function optionalPositiveInteger(value: FormDataEntryValue | null) {
  if (!value) return null
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1) throw new Error('Group sizes must be positive whole numbers.')
  return number
}

function rateValues(formData: FormData) {
  const pricingUnit = formData.get('pricingUnit') as string
  const residency = (formData.get('residency') as string) || 'all'
  const amount = Number(formData.get('amount'))
  const minGroupSize = optionalPositiveInteger(formData.get('minGroupSize'))
  const maxGroupSize = optionalPositiveInteger(formData.get('maxGroupSize'))
  if (!PRICING_UNITS.includes(pricingUnit as typeof PRICING_UNITS[number])) throw new Error('Invalid pricing unit.')
  if (!RESIDENCIES.includes(residency as typeof RESIDENCIES[number])) throw new Error('Invalid residency.')
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Amount must be zero or greater.')
  if (minGroupSize && maxGroupSize && maxGroupSize < minGroupSize) throw new Error('Maximum group size cannot be below minimum group size.')
  return {
    traveller_category: (formData.get('travellerCategory') as string)?.trim() || null,
    room_category: (formData.get('roomCategory') as string)?.trim() || null,
    residency,
    pricing_unit: pricingUnit,
    amount,
    min_group_size: minGroupSize,
    max_group_size: maxGroupSize,
  }
}

export async function updateRateCard(formData: FormData) {
  const cardId = formData.get('cardId') as string
  const name = (formData.get('name') as string)?.trim()
  const entityType = formData.get('entityType') as string
  const costCategory = formData.get('costCategory') as string
  const validFrom = formData.get('validFrom') as string
  const validTo = formData.get('validTo') as string
  const currency = ((formData.get('currency') as string)?.trim() || 'USD').toUpperCase()
  if (!cardId || !name) throw new Error('Card ID and name are required.')
  if (!ENTITY_TYPES.includes(entityType as typeof ENTITY_TYPES[number])) throw new Error('Invalid entity type.')
  if (!COST_CATEGORIES.includes(costCategory as typeof COST_CATEGORIES[number])) throw new Error('Invalid cost category.')
  if (!validFrom || !validTo || validTo < validFrom) throw new Error('Enter a valid season date range.')
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter code.')

  const admin = await context()

  const supplierId = (formData.get('supplierId') as string) || null
  let supplierName: string | null = null
  if (supplierId) {
    const { data: supplier } = await admin
      .from('suppliers').select('name').eq('id', supplierId).maybeSingle()
    if (!supplier) throw new Error('Selected supplier not found.')
    supplierName = supplier.name
  }

  const { error } = await admin.from('supplier_rate_cards').update({
    name,
    supplier_id: supplierId,
    supplier_name: supplierName,
    entity_type: entityType,
    entity_id: (formData.get('entityId') as string) || null,
    cost_category: costCategory,
    valid_from: validFrom,
    valid_to: validTo,
    currency,
    notes: (formData.get('notes') as string)?.trim() || null,
    is_active: formData.get('isActive') === 'true',
  }).eq('id', cardId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/content/rates/${cardId}`)
  revalidatePath('/admin/content/rates')
}

export async function addSupplierRate(formData: FormData) {
  const cardId = formData.get('cardId') as string
  if (!cardId) throw new Error('Rate card is required.')
  const admin = await context()
  const { error } = await admin.from('supplier_rates').insert({ rate_card_id: cardId, ...rateValues(formData) })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/content/rates/${cardId}`)
}

export async function updateSupplierRate(formData: FormData) {
  const cardId = formData.get('cardId') as string
  const rateId = formData.get('rateId') as string
  if (!cardId || !rateId) throw new Error('Rate card and rate are required.')
  const admin = await context()
  const { error } = await admin.from('supplier_rates').update(rateValues(formData)).eq('id', rateId).eq('rate_card_id', cardId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/content/rates/${cardId}`)
}

export async function deleteSupplierRate(formData: FormData) {
  const cardId = formData.get('cardId') as string
  const rateId = formData.get('rateId') as string
  if (!cardId || !rateId) throw new Error('Rate card and rate are required.')
  const admin = await context()
  const { error } = await admin.from('supplier_rates').delete().eq('id', rateId).eq('rate_card_id', cardId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/content/rates/${cardId}`)
}
