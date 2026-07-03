'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'
import { COST_CATEGORIES, ENTITY_TYPES } from '../constants'

export async function createRateCard(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const name = (formData.get('name') as string)?.trim()
  const supplierId = (formData.get('supplierId') as string) || null
  const entityType = formData.get('entityType') as string
  const entityId = (formData.get('entityId') as string) || null
  const costCategory = formData.get('costCategory') as string
  const validFrom = formData.get('validFrom') as string
  const validTo = formData.get('validTo') as string
  const currency = ((formData.get('currency') as string)?.trim() || 'USD').toUpperCase()
  const notes = (formData.get('notes') as string)?.trim() || null
  const isActive = formData.get('isActive') === 'true'

  if (!name) throw new Error('Name is required.')
  if (!ENTITY_TYPES.includes(entityType as typeof ENTITY_TYPES[number])) throw new Error('Invalid entity type.')
  if (!COST_CATEGORIES.includes(costCategory as typeof COST_CATEGORIES[number])) throw new Error('Invalid cost category.')
  if (!validFrom || !validTo || validTo < validFrom) throw new Error('Enter a valid season date range.')
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter code.')

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)

  // supplier_name mirrors the linked supplier for older list views.
  let supplierName: string | null = null
  if (supplierId) {
    const { data: supplier } = await admin
      .from('suppliers').select('name').eq('id', supplierId).maybeSingle()
    if (!supplier) throw new Error('Selected supplier not found.')
    supplierName = supplier.name
  }

  const { data, error } = await admin.from('supplier_rate_cards').insert({
    name,
    supplier_id: supplierId,
    supplier_name: supplierName,
    entity_type: entityType,
    entity_id: entityId,
    cost_category: costCategory,
    valid_from: validFrom,
    valid_to: validTo,
    currency,
    notes,
    is_active: isActive,
  }).select('id').single()

  if (error) throw new Error(error.message)
  redirect(`/admin/content/rates/${data.id}`)
}
