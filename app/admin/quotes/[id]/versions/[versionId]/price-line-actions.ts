'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'

const COST_CATEGORIES = ['accommodation', 'activities', 'park_fees', 'transport', 'staff', 'meals', 'flights', 'other'] as const
const PRICING_UNITS = ['person', 'room', 'vehicle', 'group', 'day', 'night', 'trip'] as const

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

async function requireMutableVersion(admin: ReturnType<typeof createAdminClient>, versionId: string, quoteId: string) {
  const { data: version } = await admin
    .from('quote_versions')
    .select('id, status')
    .eq('id', versionId)
    .eq('quote_id', quoteId)
    .single()
  if (!version) throw new Error('Quote version not found.')
  if (!['draft', 'ready'].includes(version.status)) throw new Error('This version is locked.')
}

export async function addPriceLine(formData: FormData) {
  const { admin } = await authGuard()
  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string
  const description = (formData.get('description') as string)?.trim()
  const costCategory = formData.get('costCategory') as string
  const pricingUnit = formData.get('pricingUnit') as string
  const quantity = parseFloat(formData.get('quantity') as string)
  const unitCostUsd = parseFloat(formData.get('unitCostUsd') as string)
  const markupPct = parseFloat(formData.get('markupPercent') as string)
  const isOptional = formData.get('isOptional') === 'true'

  if (!description) throw new Error('Description is required.')
  if (!COST_CATEGORIES.includes(costCategory as typeof COST_CATEGORIES[number])) throw new Error('Invalid category.')
  if (!PRICING_UNITS.includes(pricingUnit as typeof PRICING_UNITS[number])) throw new Error('Invalid pricing unit.')
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than 0.')
  if (!Number.isFinite(unitCostUsd) || unitCostUsd < 0) throw new Error('Unit cost must be 0 or greater.')
  if (!Number.isFinite(markupPct) || markupPct < 0) throw new Error('Markup must be 0 or greater.')

  await requireMutableVersion(admin, versionId, quoteId)

  const totalCostUsd = quantity * unitCostUsd
  const totalSellingUsd = totalCostUsd * (1 + markupPct / 100)

  const { data: existing } = await admin
    .from('quote_price_lines')
    .select('sort_order')
    .eq('quote_version_id', versionId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const { error } = await admin.from('quote_price_lines').insert({
    quote_version_id: versionId,
    description,
    cost_category: costCategory,
    pricing_unit: pricingUnit,
    quantity,
    unit_cost_usd: unitCostUsd,
    source_unit_cost: unitCostUsd,
    markup_percent_override: markupPct,
    total_cost_usd: totalCostUsd,
    total_selling_usd: totalSellingUsd,
    is_optional: isOptional,
    is_client_visible: true,
    sort_order: (existing?.sort_order ?? -1) + 1,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
}

export async function updatePriceLine(formData: FormData) {
  const { admin } = await authGuard()
  const lineId = formData.get('lineId') as string
  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string
  const description = (formData.get('description') as string)?.trim()
  const costCategory = formData.get('costCategory') as string
  const pricingUnit = formData.get('pricingUnit') as string
  const quantity = parseFloat(formData.get('quantity') as string)
  const unitCostUsd = parseFloat(formData.get('unitCostUsd') as string)
  const markupPct = parseFloat(formData.get('markupPercent') as string)
  const isOptional = formData.get('isOptional') === 'true'

  if (!description) throw new Error('Description is required.')
  if (!COST_CATEGORIES.includes(costCategory as typeof COST_CATEGORIES[number])) throw new Error('Invalid category.')
  if (!PRICING_UNITS.includes(pricingUnit as typeof PRICING_UNITS[number])) throw new Error('Invalid pricing unit.')
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than 0.')
  if (!Number.isFinite(unitCostUsd) || unitCostUsd < 0) throw new Error('Unit cost must be 0 or greater.')
  if (!Number.isFinite(markupPct) || markupPct < 0) throw new Error('Markup must be 0 or greater.')

  await requireMutableVersion(admin, versionId, quoteId)

  const totalCostUsd = quantity * unitCostUsd
  const totalSellingUsd = totalCostUsd * (1 + markupPct / 100)

  const { error } = await admin.from('quote_price_lines').update({
    description,
    cost_category: costCategory,
    pricing_unit: pricingUnit,
    quantity,
    unit_cost_usd: unitCostUsd,
    markup_percent_override: markupPct,
    total_cost_usd: totalCostUsd,
    total_selling_usd: totalSellingUsd,
    is_optional: isOptional,
    is_manual_override: true,
  }).eq('id', lineId).eq('quote_version_id', versionId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
}

export async function deletePriceLine(formData: FormData) {
  const { admin } = await authGuard()
  const lineId = formData.get('lineId') as string
  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string

  await requireMutableVersion(admin, versionId, quoteId)

  const { error } = await admin.from('quote_price_lines').delete()
    .eq('id', lineId).eq('quote_version_id', versionId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
}

export async function setVersionStatus(formData: FormData) {
  const { admin } = await authGuard()
  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string
  const newStatus = formData.get('status') as string

  const allowed = ['draft', 'ready', 'sent']
  if (!allowed.includes(newStatus)) throw new Error('Invalid status.')

  const { data: version } = await admin
    .from('quote_versions').select('status').eq('id', versionId).eq('quote_id', quoteId).single()
  if (!version) throw new Error('Version not found.')

  const transitions: Record<string, string[]> = {
    draft: ['ready'],
    ready: ['draft', 'sent'],
    sent: ['ready'],
  }
  if (!transitions[version.status]?.includes(newStatus)) {
    throw new Error(`Cannot move from ${version.status} to ${newStatus}.`)
  }

  const { error } = await admin.from('quote_versions').update({ status: newStatus }).eq('id', versionId)
  if (error) throw new Error(error.message)

  revalidatePath(`/admin/quotes/${quoteId}/versions/${versionId}`)
  revalidatePath(`/admin/quotes/${quoteId}`)
}
