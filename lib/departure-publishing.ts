import type { SupabaseClient } from '@supabase/supabase-js'

export type DeparturePublishingRecord = {
  kind: string
  is_active: boolean
  start_date: string
  end_date: string
  max_seats: number
  price_usd: number | null
  price_single_usd: number | null
  status: string
  tours: {
    id?: string
    title_en: string | null
    slug: string | null
    status: string
    is_active: boolean
    show_on_website: boolean
    hero_image_url: string | null
    overview_en: string | null
    tour_days?: Array<{ id: string }> | null
  } | Array<{
    id?: string
    title_en: string | null
    slug: string | null
    status: string
    is_active: boolean
    show_on_website: boolean
    hero_image_url: string | null
    overview_en: string | null
    tour_days?: Array<{ id: string }> | null
  }> | null
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function departurePublishingBlockers(record: DeparturePublishingRecord) {
  const blockers: string[] = []
  const tour = one(record.tours)

  if (record.kind !== 'scheduled_group') blockers.push('Private custom trips cannot be public')
  if (!record.is_active) blockers.push('Departure is archived')
  if (!record.start_date || !record.end_date || record.end_date < record.start_date) blockers.push('Departure dates are invalid')
  if (!record.max_seats || record.max_seats < 1) blockers.push('Departure capacity is missing')
  if (record.price_usd == null && record.price_single_usd == null) blockers.push('Departure pricing is missing')
  if (record.status === 'cancelled') blockers.push('Departure is cancelled')

  if (!tour) {
    blockers.push('Linked public itinerary is missing')
    return blockers
  }
  if (tour.status !== 'active' || !tour.is_active) blockers.push('Linked itinerary is not active')
  if (!tour.show_on_website) blockers.push('Linked itinerary is hidden from the website')
  if (!tour.slug?.trim()) blockers.push('Linked itinerary has no public URL slug')
  if (!tour.title_en?.trim()) blockers.push('Linked itinerary has no English title')
  if (!tour.overview_en?.trim()) blockers.push('Linked itinerary has no overview')
  if (!tour.hero_image_url?.trim()) blockers.push('Linked itinerary has no hero image')
  if ((tour.tour_days ?? []).length === 0) blockers.push('Linked itinerary has no day-by-day programme')

  return blockers
}

export async function loadDeparturePublishingReadiness(admin: SupabaseClient, departureId: string) {
  const { data, error } = await admin
    .from('departures')
    .select(`
      kind, is_active, start_date, end_date, max_seats, price_usd, price_single_usd, status,
      tours (
        id, title_en, slug, status, is_active, show_on_website, hero_image_url, overview_en,
        tour_days ( id )
      )
    `)
    .eq('id', departureId)
    .single()

  if (error || !data) throw new Error('Departure not found.')
  return { record: data as unknown as DeparturePublishingRecord, blockers: departurePublishingBlockers(data as unknown as DeparturePublishingRecord) }
}

