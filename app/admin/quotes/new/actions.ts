'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { safeAction } from '@/lib/server/action-result'
import type { Tables, TablesInsert } from '@/lib/database.types'

type AgeBand = Pick<Tables<'traveller_age_bands'>,
  'id' | 'name' | 'code' | 'min_age' | 'max_age' | 'default_pricing_method' |
  'default_percentage' | 'default_fixed_amount_usd'>

export const createQuote = safeAction(async (formData: FormData) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: null, redirectTo: '/admin/login' }

  const mode = formData.get('mode') as string
  const clientId = formData.get('clientId') as string
  const requestId = (formData.get('requestId') as string) || null
  const tourId = (formData.get('tourId') as string) || null
  const departureId = (formData.get('departureId') as string) || null
  const templateId = (formData.get('templateId') as string) || null
  const title = (formData.get('title') as string)?.trim() || null

  if (!mode || !['template', 'custom', 'fixed_departure'].includes(mode)) {
    throw new Error('Please select a quote mode.')
  }
  if (!clientId) throw new Error('Please select a client.')
  if (mode === 'template' && !templateId) {
    throw new Error('Please select a proposal template.')
  }
  if (mode === 'fixed_departure' && !departureId) {
    throw new Error('Please select a departure for fixed-departure quotes.')
  }

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  const { data: owner } = await admin
    .from('admin_users')
    .select('id')
    .eq('email', user.email ?? '')
    .eq('is_active', true)
    .single()

  // Read client's preferred language before creating the quote
  const { data: clientData } = await admin
    .from('clients')
    .select('language')
    .eq('id', clientId)
    .single()
  const clientLanguage = clientData?.language === 'ar' ? 'ar' : 'en'

  const creation = mode === 'template'
    ? await admin.rpc('copy_proposal_template_atomic', {
        p_source_quote_id: templateId!,
        p_client_id: clientId,
        p_request_id: requestId,
        p_created_by: user.id,
        p_owner_id: owner?.id ?? null,
      })
    : await admin.rpc('create_quote_with_workflow_atomic', {
        p_client_id: clientId,
        p_request_id: requestId,
        p_mode: mode,
        p_tour_id: tourId,
        p_departure_id: departureId,
        p_title: title,
        p_created_by: user.id,
        p_owner_id: owner?.id ?? null,
      })
  const { data: newQuoteId, error } = creation

  if (error) throw new Error(error.message)
  if (!newQuoteId) throw new Error('Quote was not created.')

  if (title) {
    await admin.from('quote_versions').update({ title }).eq('quote_id', newQuoteId)
  }

  // Auto-set quote version language from the client's profile
  if (clientLanguage !== 'en') {
    await admin
      .from('quote_versions')
      .update({ language: clientLanguage })
      .eq('quote_id', newQuoteId)
  }

  // Get the first version created
  const { data: firstVersion } = await admin
    .from('quote_versions')
    .select('id')
    .eq('quote_id', newQuoteId)
    .order('version_number', { ascending: true })
    .limit(1)
    .single()

  // Auto-populate travellers from the linked request's composition
  // (adults / older children / younger children) using the matching age bands.
  if (requestId && firstVersion) {
    const { data: requestData } = await admin
      .from('requests')
      .select('travelers_adults, travelers_children_older, travelers_children_younger')
      .eq('id', requestId)
      .single()

    if (requestData) {
      const { data: bands } = await admin
        .from('traveller_age_bands')
        .select('id, name, code, min_age, max_age, default_pricing_method, default_percentage, default_fixed_amount_usd')
        .in('code', ['adult', 'child', 'infant'])

      const bandByCode = new Map<string, AgeBand>()
      for (const band of bands ?? []) bandByCode.set(band.code, band)

      const snapshot = (b: AgeBand) => ({
        id: b.id, name: b.name, code: b.code, min_age: b.min_age, max_age: b.max_age,
        default_pricing_method: b.default_pricing_method,
        default_percentage: b.default_pricing_method === 'percentage' ? b.default_percentage : null,
        default_fixed_amount_usd: b.default_pricing_method === 'fixed' ? b.default_fixed_amount_usd : null,
      })

      // Map the request composition to age bands:
      //   adults -> adult, older children -> child (4â€“12), younger children -> infant (0â€“3)
      const groups = [
        { code: 'adult',  count: requestData.travelers_adults ?? 0,           label: 'Adult' },
        { code: 'child',  count: requestData.travelers_children_older ?? 0,   label: 'Child' },
        { code: 'infant', count: requestData.travelers_children_younger ?? 0, label: 'Infant' },
      ]

      const travellers: TablesInsert<'quote_travellers'>[] = []
      let sort = 0
      for (const g of groups) {
        const band = bandByCode.get(g.code)
        if (!band || g.count < 1) continue
        const isFree = band.default_pricing_method === 'free'
        for (let i = 0; i < g.count; i++) {
          travellers.push({
            quote_version_id: firstVersion.id,
            display_name: `${g.label} ${i + 1}`,
            age_on_travel_date: null,
            age_band_id: band.id,
            age_band_snapshot: snapshot(band),
            traveller_category: band.code,
            room_category: 'sharing',
            is_paying: !isFree,
            is_complimentary: false,
            sort_order: sort++,
          })
        }
      }

      if (travellers.length > 0) {
        await admin.from('quote_travellers').insert(travellers)
      }
    }
  }

  // Funnel: request â†’ quote â†’ itinerary â†’ pricing â†’ review â†’ send, all steps
  // on the unified quote workspace. Custom safaris open on the Itinerary tab.
  return {
    error: null,
    redirectTo: (mode === 'custom' || mode === 'template') && firstVersion
      ? `/admin/quotes/${newQuoteId}?step=itinerary&version=${firstVersion.id}`
      : `/admin/quotes/${newQuoteId}`,
  }
})

