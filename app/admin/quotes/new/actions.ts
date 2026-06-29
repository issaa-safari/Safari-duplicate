'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { assertAdminAccess } from '@/lib/auth/admin-access'

export async function createQuote(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const mode = formData.get('mode') as string
  const clientId = formData.get('clientId') as string
  const requestId = (formData.get('requestId') as string) || null
  const tourId = (formData.get('tourId') as string) || null
  const departureId = (formData.get('departureId') as string) || null
  const title = (formData.get('title') as string)?.trim() || null

  if (!mode || !['custom', 'fixed_departure'].includes(mode)) {
    throw new Error('Please select a quote mode.')
  }
  if (!clientId) throw new Error('Please select a client.')
  if (mode === 'fixed_departure' && !departureId) {
    throw new Error('Please select a departure for fixed-departure quotes.')
  }

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)

  // Read client's preferred language before creating the quote
  const { data: clientData } = await admin
    .from('clients')
    .select('language')
    .eq('id', clientId)
    .single()
  const clientLanguage = clientData?.language === 'ar' ? 'ar' : 'en'

  const { data: newQuoteId, error } = await admin.rpc('create_quote_with_version', {
    p_client_id: clientId,
    p_request_id: requestId,
    p_mode: mode,
    p_tour_id: tourId,
    p_departure_id: departureId,
    p_title: title,
    p_created_by: user.id,
  })

  if (error) throw new Error(error.message)
  if (!newQuoteId) throw new Error('Quote was not created.')

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

      const bandByCode: Record<string, any> = {}
      for (const b of bands ?? []) bandByCode[b.code] = b

      const snapshot = (b: any) => ({
        id: b.id, name: b.name, code: b.code, min_age: b.min_age, max_age: b.max_age,
        default_pricing_method: b.default_pricing_method,
        default_percentage: b.default_pricing_method === 'percentage' ? b.default_percentage : null,
        default_fixed_amount_usd: b.default_pricing_method === 'fixed' ? b.default_fixed_amount_usd : null,
      })

      // Map the request composition to age bands:
      //   adults -> adult, older children -> child (3–15), younger children -> infant (0–2)
      const groups = [
        { code: 'adult',  count: requestData.travelers_adults ?? 0,           label: 'Adult' },
        { code: 'child',  count: requestData.travelers_children_older ?? 0,   label: 'Child' },
        { code: 'infant', count: requestData.travelers_children_younger ?? 0, label: 'Infant' },
      ]

      const travellers: any[] = []
      let sort = 0
      for (const g of groups) {
        const band = bandByCode[g.code]
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

  // redirect() outside try/catch — Next.js throws NEXT_REDIRECT internally
  // and it must not be caught
  redirect(`/admin/quotes/${newQuoteId}`)
}
