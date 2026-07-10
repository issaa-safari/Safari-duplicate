import type { createAdminClient } from '@/lib/supabase/admin'
import type { HotelRowInput, TripBuilderState } from './types'

interface VersionRow {
  id: string
  status: string
  version_number: number
  builder_state: TripBuilderState | null
}

const DAY_MS = 86_400_000

function isoAddDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10)
}

/** Map an itinerary day's meals list to the closest rate-card meal plan. */
function mealPlanOf(meals: string[] | null): HotelRowInput['mealPlan'] {
  const set = new Set(meals ?? [])
  if (!set.has('breakfast')) return ''
  if (set.has('lunch') && set.has('dinner')) return 'FB'
  if (set.has('lunch') || set.has('dinner')) return 'HB'
  return 'BB'
}

interface ItineraryDay {
  id: string
  day_number: number
  day_date: string | null
  destination_id: string | null
  meals: string[] | null
}

/**
 * Turn the itinerary's day-by-day accommodation picks into Trip Builder hotel
 * rows: consecutive nights at the same property collapse into one stay with
 * check-in on its first day and check-out the morning after its last day.
 */
export function hotelRowsFromItinerary(
  days: ItineraryDay[],
  accomByDay: Map<string, { entityId: string; destinationId: string | null }>,
  tripStartDate: string,
): Omit<HotelRowInput, 'key'>[] {
  const dateOf = (d: ItineraryDay) =>
    d.day_date ?? (tripStartDate ? isoAddDays(tripStartDate, d.day_number - 1) : '')

  const rows: Omit<HotelRowInput, 'key'>[] = []
  const sorted = [...days].sort((a, b) => a.day_number - b.day_number)
  let open: { entityId: string; row: Omit<HotelRowInput, 'key'>; lastDayNumber: number } | null = null

  for (const day of sorted) {
    const accom = accomByDay.get(day.id)
    if (open && (!accom || accom.entityId !== open.entityId || day.day_number !== open.lastDayNumber + 1)) {
      rows.push(open.row)
      open = null
    }
    if (!accom) continue
    const dayDate = dateOf(day)
    if (open) {
      open.lastDayNumber = day.day_number
      open.row.checkOut = dayDate ? isoAddDays(dayDate, 1) : ''
    } else {
      open = {
        entityId: accom.entityId,
        lastDayNumber: day.day_number,
        row: {
          destinationId: accom.destinationId ?? day.destination_id ?? '',
          budgetTier: '',
          accommodationId: accom.entityId,
          roomCategory: 'sharing',
          mealPlan: mealPlanOf(day.meals),
          rooms: 1,
          checkIn: dayDate,
          checkOut: dayDate ? isoAddDays(dayDate, 1) : '',
        },
      }
    }
  }
  if (open) rows.push(open.row)
  return rows
}

export interface TripBuilderInitialState {
  initialState: TripBuilderState
  hasBuilderState: boolean
  initialVersionId: string | null
}

/**
 * Resolve the Trip Builder's starting state for a quote: reuse a saved
 * builder_state if pricing already exists, otherwise seed hotel rows from
 * the itinerary's accommodation picks plus the quote's client/travellers/dates.
 */
export async function loadTripBuilderInitialState(
  admin: ReturnType<typeof createAdminClient>,
  quoteId: string,
): Promise<TripBuilderInitialState | null> {
  const { data: quote } = await admin
    .from('quotes')
    .select('id, quote_number, status, client_id')
    .eq('id', quoteId)
    .maybeSingle()
  if (!quote) return null

  const { data: versionsData } = await admin
    .from('quote_versions')
    .select('id, status, version_number, builder_state')
    .eq('quote_id', quoteId)
    .order('version_number', { ascending: false })

  const versions = (versionsData ?? []) as VersionRow[]
  // Latest version — that's what a re-save updates (if still mutable).
  const latestVersion = versions[0] ?? null

  let initialState = latestVersion?.builder_state ?? null
  const hasBuilderState = initialState != null

  // Quotes created outside the builder (e.g. the new-quote wizard) have no
  // builder_state — seed the form from the quote's client, dates, travellers
  // AND the itinerary the itinerary builder wrote (destinations +
  // accommodations become pre-filled hotel rows), so the admin doesn't
  // re-enter details they already provided.
  if (!initialState) {
    const [{ data: client }, { data: allVersions }] = await Promise.all([
      quote.client_id
        ? admin.from('clients').select('first_name, last_name, email, phone').eq('id', quote.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from('quote_versions')
        .select('id, title, travel_start_date, travel_end_date, version_number')
        .eq('quote_id', quoteId)
        .order('version_number', { ascending: false }),
    ])
    const latestVersion = (allVersions ?? [])[0] ?? null

    const versionIds = (allVersions ?? []).map((v: any) => v.id)
    const [{ data: travellers }, { data: allDays }] = await Promise.all([
      latestVersion
        ? admin.from('quote_travellers')
            .select('traveller_category, age_on_travel_date')
            .eq('quote_version_id', latestVersion.id)
        : Promise.resolve({ data: null }),
      versionIds.length
        ? admin.from('quote_days')
            .select('id, quote_version_id, day_number, day_date, destination_id, meals')
            .in('quote_version_id', versionIds)
        : Promise.resolve({ data: null }),
    ])

    const adults = (travellers ?? []).filter((t: any) => t.traveller_category === 'adult').length
    const childAges = (travellers ?? [])
      .filter((t: any) => t.traveller_category !== 'adult')
      .map((t: any) => t.age_on_travel_date ?? (t.traveller_category === 'infant' ? 0 : 8))

    // Itinerary source: the newest version that actually has days.
    const daysByVersion = new Map<string, any[]>()
    for (const d of (allDays ?? []) as any[]) {
      const list = daysByVersion.get(d.quote_version_id) ?? []
      list.push(d)
      daysByVersion.set(d.quote_version_id, list)
    }
    const sourceVersion = (allVersions ?? []).find((v: any) => daysByVersion.has(v.id)) ?? null
    const sourceDays: ItineraryDay[] = sourceVersion ? daysByVersion.get(sourceVersion.id)! : []

    // Primary accommodation pick per day (itinerary "alternative" items are skipped).
    const accomByDay = new Map<string, { entityId: string; destinationId: string | null }>()
    if (sourceDays.length > 0) {
      const { data: items } = await admin
        .from('quote_day_items')
        .select('quote_day_id, accommodation_id, content_snapshot, sort_order')
        .eq('item_type', 'accommodation')
        .in('quote_day_id', sourceDays.map(d => d.id))
        .order('sort_order')
      for (const it of (items ?? []) as any[]) {
        if (!it.accommodation_id) continue
        if (it.content_snapshot?.alternative === true) continue
        if (!accomByDay.has(it.quote_day_id)) {
          accomByDay.set(it.quote_day_id, {
            entityId: it.accommodation_id,
            destinationId: it.content_snapshot?.destination_id ?? null,
          })
        }
      }
    }

    const tripStartDate = sourceVersion?.travel_start_date ?? latestVersion?.travel_start_date ?? ''
    const seededRows = hotelRowsFromItinerary(sourceDays, accomByDay, tripStartDate)

    initialState = {
      guest: {
        name: client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() : '',
        email: client?.email ?? '',
        phone: client?.phone ?? '',
        adults: adults > 0 ? adults : 2,
        childAges,
        startDate: latestVersion?.travel_start_date ?? '',
        endDate: latestVersion?.travel_end_date ?? '',
      },
      title: latestVersion?.title ?? '',
      hotelRows: seededRows.map((r, i) => ({ ...r, key: `seed-${i}` })),
      transportRows: [],
      parkRows: [],
      salePrice: '',
    }
  }

  return {
    initialState,
    hasBuilderState,
    initialVersionId: latestVersion?.id ?? null,
  }
}
