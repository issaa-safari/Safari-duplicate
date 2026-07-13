'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { assertAdminAccess } from '@/lib/auth/admin-access'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { admin }
}

export async function cloneVersion(formData: FormData) {
  const { admin } = await authGuard()
  const versionId = formData.get('versionId') as string
  const quoteId = formData.get('quoteId') as string

  // Load source version
  const { data: src } = await admin.from('quote_versions')
    .select('*').eq('id', versionId).eq('quote_id', quoteId).single()
  if (!src) throw new Error('Version not found.')

  // Get next version number
  const { data: latest } = await admin.from('quote_versions')
    .select('version_number').eq('quote_id', quoteId)
    .order('version_number', { ascending: false }).limit(1).single()
  const nextNum = (latest?.version_number ?? 0) + 1

  // Create new version as draft
  const { data: newVersion, error: vErr } = await admin.from('quote_versions').insert({
    quote_id: quoteId,
    version_number: nextNum,
    status: 'draft',
    title: src.title ? `${src.title} (copy)` : null,
    travel_start_date: src.travel_start_date,
    travel_end_date: src.travel_end_date,
    valid_until: src.valid_until,
    default_markup_percent: src.default_markup_percent,
    total_cost_usd: src.total_cost_usd,
    total_selling_usd: src.total_selling_usd,
    sharing_price_per_person_usd: src.sharing_price_per_person_usd,
    single_price_per_person_usd: src.single_price_per_person_usd,
    single_supplement_usd: src.single_supplement_usd,
  }).select('id').single()
  if (vErr || !newVersion) throw new Error(vErr?.message ?? 'Failed to create version.')

  const newId = newVersion.id

  // Clone price lines
  const { data: lines } = await admin.from('quote_price_lines')
    .select('*').eq('quote_version_id', versionId)
  if (lines?.length) {
    await admin.from('quote_price_lines').insert(
      lines.map(({ id: _, quote_version_id: __, ...rest }: any) => ({
        ...rest, quote_version_id: newId,
      }))
    )
  }

  // Clone travellers
  const { data: travellers } = await admin.from('quote_travellers')
    .select('*').eq('quote_version_id', versionId)
  if (travellers?.length) {
    await admin.from('quote_travellers').insert(
      travellers.map(({ id: _, quote_version_id: __, ...rest }: any) => ({
        ...rest, quote_version_id: newId,
      }))
    )
  }

  // Clone days + day items
  const { data: days } = await admin.from('quote_days')
    .select('*').eq('quote_version_id', versionId).order('sort_order')
  if (days?.length) {
    for (const { id: dayId, quote_version_id: __, ...dayRest } of days as any[]) {
      const { data: newDay, error: dayErr } = await admin.from('quote_days')
        .insert({ ...dayRest, quote_version_id: newId }).select('id').single()
      // A copy that silently loses its itinerary is worse than a failed copy.
      if (dayErr || !newDay) throw new Error(`Failed to copy itinerary day: ${dayErr?.message ?? 'unknown error'}`)
      const { data: items } = await admin.from('quote_day_items')
        .select('*').eq('quote_day_id', dayId)
      if (items?.length) {
        const { error: itemErr } = await admin.from('quote_day_items').insert(
          items.map(({ id: _, quote_day_id: __, ...iRest }: any) => ({
            ...iRest, quote_day_id: newDay.id,
          }))
        )
        if (itemErr) throw new Error(`Failed to copy day items: ${itemErr.message}`)
      }
    }
  }

  redirect(`/admin/quotes/${quoteId}?step=itinerary&version=${newId}`)
}
