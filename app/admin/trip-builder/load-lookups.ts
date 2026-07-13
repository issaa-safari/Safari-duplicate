import type { createAdminClient } from '@/lib/supabase/admin'
import type { AccommodationOption, LookupOption } from './trip-builder-form'
import { FALLBACK_AGE_BANDS, type AgeBandLite } from './band-pricing'

const DEFAULT_USD_TO_KES = 129

export interface BuilderLookups {
  destinations: LookupOption[]
  accommodations: AccommodationOption[]
  vehicles: LookupOption[]
  parks: LookupOption[]
  ageBands: AgeBandLite[]
  usdToKes: number
}

export async function loadBuilderLookups(
  admin: ReturnType<typeof createAdminClient>,
): Promise<BuilderLookups> {
  const [
    { data: destinations },
    { data: accommodations },
    { data: vehicles },
    { data: parks },
    { data: ageBands },
    { data: settings },
  ] = await Promise.all([
    admin.from('destinations').select('id, name').eq('is_active', true).order('name'),
    admin.from('accommodations').select('id, name, destination_id, budget_tier').eq('is_active', true).order('name'),
    admin.from('vehicles').select('id, name').eq('is_active', true).order('name'),
    admin.from('parks').select('id, name').eq('is_active', true).order('name'),
    admin.from('traveller_age_bands').select('code, min_age, max_age, default_pricing_method').eq('is_active', true).order('sort_order'),
    // select('*') so this works before group_33 adds usd_to_kes_rate
    admin.from('company_settings').select('*').limit(1).maybeSingle(),
  ])

  const rawRate = (settings as Record<string, unknown> | null)?.usd_to_kes_rate
  const usdToKes = Number.isFinite(Number(rawRate)) && Number(rawRate) > 0
    ? Number(rawRate)
    : DEFAULT_USD_TO_KES

  return {
    destinations: (destinations ?? []) as LookupOption[],
    accommodations: (accommodations ?? []) as AccommodationOption[],
    vehicles: (vehicles ?? []) as LookupOption[],
    parks: (parks ?? []) as LookupOption[],
    ageBands: ageBands && ageBands.length > 0 ? (ageBands as AgeBandLite[]) : FALLBACK_AGE_BANDS,
    usdToKes,
  }
}
