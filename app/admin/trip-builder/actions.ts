'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { findOrCreateClientByEmail } from '@/lib/server/clients'
import { calculateLineTotals } from '@/lib/pricing'
import {
  buildFxToUsd,
  nightsBetween,
  priceAccommodationStay,
  pricePark,
  priceVehicleHire,
  RateGapError,
  vehicleDaysInclusive,
  type AgeBandPricing,
  type FxToUsd,
  type PricedSegment,
  type RateCardRow,
} from '@/lib/rate-resolution'
import type {
  HotelRowInput,
  ParkRowInput,
  ResolveRowRequest,
  ResolveRowResult,
  ResolvedSegmentView,
  SaveTripInput,
  SaveTripResult,
  TrackKey,
  TransportRowInput,
  TripBuilderState,
} from './types'

const DEFAULT_USD_TO_KES = 129

type Admin = ReturnType<typeof createAdminClient>

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

async function getUsdToKes(admin: Admin): Promise<number> {
  // select('*') so this works before group_33 adds usd_to_kes_rate.
  const { data } = await admin.from('company_settings').select('*').limit(1).maybeSingle()
  const raw = (data as Record<string, unknown> | null)?.usd_to_kes_rate
  const rate = Number(raw)
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_USD_TO_KES
}

const CARD_SELECT =
  'id, name, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active, ' +
  'supplier_rates(id, traveller_category, room_category, residency, pricing_unit, amount, min_group_size, max_group_size, metadata, sort_order)'

async function fetchCards(
  admin: Admin,
  entityType: string,
  entityId: string,
  fromDate: string,
  toDate: string,
): Promise<RateCardRow[]> {
  const { data, error } = await admin
    .from('supplier_rate_cards')
    .select(CARD_SELECT)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .lte('valid_from', toDate)
    .gte('valid_to', fromDate)
  if (error) throw new Error(`Rate lookup failed: ${error.message}`)
  return (data ?? []) as unknown as RateCardRow[]
}

/**
 * Meal plans live in supplier_rates.metadata.meal_plan (optional). When the row
 * picked a plan, prefer rates tagged with it; rates without a meal tag stay
 * eligible so untagged cards keep working.
 */
function filterByMealPlan(cards: RateCardRow[], mealPlan: string): RateCardRow[] {
  if (!mealPlan) return cards
  return cards.map(card => {
    const rates = card.supplier_rates ?? []
    const tagged = rates.filter(r => {
      const meta = (r as { metadata?: Record<string, unknown> }).metadata
      return meta && typeof meta === 'object' && meta.meal_plan === mealPlan
    })
    return { ...card, supplier_rates: tagged.length > 0 ? tagged : rates.filter(r => {
      const meta = (r as { metadata?: Record<string, unknown> }).metadata
      return !meta || typeof meta !== 'object' || meta.meal_plan === undefined || meta.meal_plan === mealPlan
    }) }
  })
}

interface BandRow {
  id: string
  name: string
  code: string
  min_age: number
  max_age: number | null
  default_pricing_method: 'fixed' | 'percentage' | 'free'
  default_percentage: number | null
  default_fixed_amount_usd: number | null
}

async function fetchAgeBands(admin: Admin): Promise<BandRow[]> {
  const { data, error } = await admin
    .from('traveller_age_bands')
    .select('id, name, code, min_age, max_age, default_pricing_method, default_percentage, default_fixed_amount_usd')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw new Error(`Age band lookup failed: ${error.message}`)
  return (data ?? []) as BandRow[]
}

function bandPricing(band: BandRow): AgeBandPricing {
  return {
    code: band.code,
    pricingMethod: band.default_pricing_method,
    percentage: band.default_percentage !== null ? Number(band.default_percentage) : null,
    fixedAmountUsd: band.default_fixed_amount_usd !== null ? Number(band.default_fixed_amount_usd) : null,
  }
}

function bandSnapshot(band: BandRow) {
  return {
    id: band.id, name: band.name, code: band.code,
    min_age: band.min_age, max_age: band.max_age,
    default_pricing_method: band.default_pricing_method,
    default_percentage: band.default_pricing_method === 'percentage' ? band.default_percentage : null,
    default_fixed_amount_usd: band.default_pricing_method === 'fixed' ? band.default_fixed_amount_usd : null,
  }
}

function bandForAge(bands: BandRow[], age: number): BandRow | null {
  return bands.find(b => age >= b.min_age && (b.max_age === null || age <= b.max_age)) ?? null
}

function segmentViews(segments: PricedSegment[]): ResolvedSegmentView[] {
  return segments.map(s => ({
    label: s.resolved.seasonName ?? `${s.startDate} → ${s.endDate}`,
    units: s.units,
    unitCostUsd: s.resolved.unitCostUsd,
    totalCostUsd: Math.round(s.units * s.resolved.unitCostUsd * 100) / 100,
    sourceCurrency: s.resolved.sourceCurrency,
    sourceUnitCost: s.resolved.sourceUnitCost,
  }))
}

async function entityName(admin: Admin, table: string, id: string): Promise<string> {
  const { data } = await admin.from(table).select('name').eq('id', id).maybeSingle()
  return (data as { name?: string } | null)?.name ?? 'Unknown'
}

/**
 * Resolve one builder row's price from rate cards, by the SERVICE date.
 * Returns a rate-gap result (never a silent 0) when no rate covers the row.
 */
export async function resolveTripRate(req: ResolveRowRequest): Promise<ResolveRowResult> {
  const { admin } = await authGuard()
  const fx = buildFxToUsd(await getUsdToKes(admin))

  try {
    if (req.kind === 'hotel') {
      const label = await entityName(admin, 'accommodations', req.accommodationId)
      const cards = filterByMealPlan(
        await fetchCards(admin, 'accommodation', req.accommodationId, req.checkIn, req.checkOut),
        req.mealPlan,
      )
      const segments = priceAccommodationStay(
        {
          accommodationId: req.accommodationId,
          accommodationLabel: label,
          checkIn: req.checkIn,
          checkOut: req.checkOut,
          roomCategory: req.roomCategory || undefined,
          unitsPerNight: Math.max(1, req.rooms),
        },
        cards, fx,
      )
      return okResult(segments)
    }

    if (req.kind === 'transport') {
      const label = await entityName(admin, 'vehicles', req.vehicleId)
      const cards = await fetchCards(admin, 'vehicle', req.vehicleId, req.startDate, req.endDate)
      const segments = priceVehicleHire(
        {
          vehicleId: req.vehicleId,
          vehicleLabel: label,
          startDate: req.startDate,
          endDate: req.endDate,
          vehicleCount: Math.max(1, req.vehicleCount),
        },
        cards, fx,
      )
      return okResult(segments)
    }

    const label = await entityName(admin, 'parks', req.parkId)
    const cards = await fetchCards(admin, 'park_fee', req.parkId, req.entryDate, req.entryDate)
    let ageBand: AgeBandPricing | undefined
    if (req.travellerCategory === 'child') {
      const bands = await fetchAgeBands(admin)
      const child = bands.find(b => b.code === 'child')
      if (child) ageBand = bandPricing(child)
    }
    const entry = pricePark(
      {
        parkId: req.parkId,
        parkLabel: label,
        entryDate: req.entryDate,
        travellerCategory: req.travellerCategory,
        residency: req.residency,
        tickets: Math.max(1, req.tickets),
        ageBand,
      },
      cards, fx,
    )
    const totalCostUsd = Math.round(entry.units * entry.resolved.unitCostUsd * 100) / 100
    return {
      ok: true,
      units: entry.units,
      unitCostUsd: entry.resolved.unitCostUsd,
      totalCostUsd,
      segments: [{
        label: entry.resolved.seasonName ?? entry.entryDate,
        units: entry.units,
        unitCostUsd: entry.resolved.unitCostUsd,
        totalCostUsd,
        sourceCurrency: entry.resolved.sourceCurrency,
        sourceUnitCost: entry.resolved.sourceUnitCost,
      }],
    }
  } catch (err) {
    if (err instanceof RateGapError) return { ok: false, message: err.message }
    return { ok: false, message: err instanceof Error ? err.message : 'Rate lookup failed.' }
  }
}

function okResult(segments: PricedSegment[]): ResolveRowResult {
  const views = segmentViews(segments)
  const units = views.reduce((s, v) => s + v.units, 0)
  const totalCostUsd = Math.round(views.reduce((s, v) => s + v.totalCostUsd, 0) * 100) / 100
  return { ok: true, units, unitCostUsd: views[0]?.unitCostUsd ?? 0, totalCostUsd, segments: views }
}

// ── saveTrip ─────────────────────────────────────────────────────────────────

interface LineDraft {
  dayNumber: number | null
  costCategory: string
  description: string
  rateCardId: string | null
  supplierRateId: string | null
  pricingUnit: string
  travellerCategory: string | null
  roomCategory: string | null
  quantity: number
  sourceCurrency: string
  sourceUnitCost: number
  exchangeRateToUsd: number
  unitCostUsd: number
  sortOrder: number
}

interface ItemDraft {
  dayNumber: number
  itemType: string
  entityId: string
  titleSnapshot: string
  roomCategory: string | null
  sortOrder: number
}

const DAY_MS = 86_400_000

function isoDiffDays(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS)
}

function isoAddDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10)
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function assertWithinTrip(date: string, state: TripBuilderState, what: string) {
  if (date < state.guest.startDate || date > state.guest.endDate) {
    throw new Error(`${what} (${date}) is outside the trip dates.`)
  }
}

const MEAL_LABELS: Record<string, string> = {
  BB: 'bed & breakfast', HB: 'half board', FB: 'full board', AI: 'all inclusive',
}

/**
 * Save the whole trip: both track versions in one transaction via the
 * save_trip RPC. Every rate is re-resolved server-side by its service date;
 * client-side prices are never trusted. Rate gaps abort the save.
 */
export async function saveTrip(input: SaveTripInput): Promise<SaveTripResult> {
  const { user, admin } = await authGuard()
  const state = input.state
  const guest = state.guest

  try {
    // ── Validate guest details ──
    if (!guest.name.trim()) throw new Error('Guest name is required.')
    if (!isIsoDate(guest.startDate) || !isIsoDate(guest.endDate)) {
      throw new Error('Trip start and end dates are required.')
    }
    if (guest.endDate < guest.startDate) throw new Error('Trip end must not be before trip start.')
    if (!Number.isInteger(guest.adults) || guest.adults < 1) {
      throw new Error('At least one adult is required.')
    }
    for (const age of guest.childAges) {
      if (!Number.isInteger(age) || age < 0 || age > 17) {
        throw new Error('Child ages must be between 0 and 17.')
      }
    }

    const usdToKes = await getUsdToKes(admin)
    const fx = buildFxToUsd(usdToKes)
    const bands = await fetchAgeBands(admin)
    const gaps: string[] = []

    // ── Shared lines (transport + park fees) — identical on both tracks ──
    const sharedLines: LineDraft[] = []
    const sharedItems: ItemDraft[] = []
    let sort = 0

    for (const row of state.transportRows) {
      if (!row.vehicleId) continue
      if (!isIsoDate(row.startDate) || !isIsoDate(row.endDate)) {
        throw new Error('Every transport row needs start and end dates.')
      }
      assertWithinTrip(row.startDate, state, 'A transport start date')
      assertWithinTrip(row.endDate, state, 'A transport end date')
      const label = await entityName(admin, 'vehicles', row.vehicleId)
      const cards = await fetchCards(admin, 'vehicle', row.vehicleId, row.startDate, row.endDate)
      let segments: PricedSegment[]
      try {
        segments = priceVehicleHire(
          {
            vehicleId: row.vehicleId, vehicleLabel: label,
            startDate: row.startDate, endDate: row.endDate,
            vehicleCount: Math.max(1, row.vehicleCount),
          },
          cards, fx,
        )
      } catch (err) {
        if (err instanceof RateGapError) { gaps.push(err.message); continue }
        throw err
      }
      const days = vehicleDaysInclusive(row.startDate, row.endDate)
      for (const seg of segments) {
        sharedLines.push({
          dayNumber: isoDiffDays(guest.startDate, seg.startDate) + 1,
          costCategory: 'transport',
          description: `${label} — ${seg.units} day${seg.units === 1 ? '' : 's'}`
            + (segments.length > 1 && seg.resolved.seasonName ? ` (${seg.resolved.seasonName})` : ''),
          rateCardId: seg.resolved.rateCardId,
          supplierRateId: seg.resolved.supplierRateId,
          pricingUnit: seg.resolved.pricingUnit,
          travellerCategory: null,
          roomCategory: null,
          quantity: seg.units,
          sourceCurrency: seg.resolved.sourceCurrency,
          sourceUnitCost: seg.resolved.sourceUnitCost,
          exchangeRateToUsd: seg.resolved.exchangeRateToUsd,
          unitCostUsd: seg.resolved.unitCostUsd,
          sortOrder: sort++,
        })
      }
      sharedItems.push({
        dayNumber: isoDiffDays(guest.startDate, row.startDate) + 1,
        itemType: 'vehicle',
        entityId: row.vehicleId,
        titleSnapshot: `${label} (${days} day${days === 1 ? '' : 's'})`,
        roomCategory: null,
        sortOrder: sharedItems.length,
      })
    }

    for (const row of state.parkRows) {
      if (!row.parkId) continue
      if (!isIsoDate(row.entryDate)) throw new Error('Every park row needs an entry date.')
      assertWithinTrip(row.entryDate, state, 'A park entry date')
      const label = await entityName(admin, 'parks', row.parkId)
      const cards = await fetchCards(admin, 'park_fee', row.parkId, row.entryDate, row.entryDate)
      const childBand = bands.find(b => b.code === 'child')
      try {
        const entry = pricePark(
          {
            parkId: row.parkId, parkLabel: label, entryDate: row.entryDate,
            travellerCategory: row.travellerCategory, residency: row.residency,
            tickets: Math.max(1, row.tickets),
            ageBand: row.travellerCategory === 'child' && childBand ? bandPricing(childBand) : undefined,
          },
          cards, fx,
        )
        sharedLines.push({
          dayNumber: isoDiffDays(guest.startDate, row.entryDate) + 1,
          costCategory: 'park_fees',
          description: `${label} — ${row.travellerCategory} entry (${row.residency.replace('_', '-')}) × ${entry.units}`,
          rateCardId: entry.resolved.rateCardId,
          supplierRateId: entry.resolved.supplierRateId,
          pricingUnit: entry.resolved.pricingUnit,
          travellerCategory: row.travellerCategory,
          roomCategory: null,
          quantity: entry.units,
          sourceCurrency: entry.resolved.sourceCurrency,
          sourceUnitCost: entry.resolved.sourceUnitCost,
          exchangeRateToUsd: entry.resolved.exchangeRateToUsd,
          unitCostUsd: entry.resolved.unitCostUsd,
          sortOrder: sort++,
        })
      } catch (err) {
        if (err instanceof RateGapError) { gaps.push(err.message); continue }
        throw err
      }
    }

    // ── Per-track accommodation lines ──
    const trackLines: Record<TrackKey, LineDraft[]> = { standard: [], premium: [] }
    const trackItems: Record<TrackKey, ItemDraft[]> = { standard: [], premium: [] }

    for (const track of ['standard', 'premium'] as TrackKey[]) {
      let trackSort = 0
      for (const row of state.hotelRows[track]) {
        if (!row.accommodationId) continue
        if (!isIsoDate(row.checkIn) || !isIsoDate(row.checkOut)) {
          throw new Error('Every hotel row needs check-in and check-out dates.')
        }
        assertWithinTrip(row.checkIn, state, 'A hotel check-in')
        assertWithinTrip(row.checkOut, state, 'A hotel check-out')
        const label = await entityName(admin, 'accommodations', row.accommodationId)
        const cards = filterByMealPlan(
          await fetchCards(admin, 'accommodation', row.accommodationId, row.checkIn, row.checkOut),
          row.mealPlan,
        )
        let segments: PricedSegment[]
        try {
          segments = priceAccommodationStay(
            {
              accommodationId: row.accommodationId, accommodationLabel: label,
              checkIn: row.checkIn, checkOut: row.checkOut,
              roomCategory: row.roomCategory || undefined,
              unitsPerNight: Math.max(1, row.rooms),
            },
            cards, fx,
          )
        } catch (err) {
          if (err instanceof RateGapError) { gaps.push(err.message); continue }
          throw err
        }
        const nights = nightsBetween(row.checkIn, row.checkOut)
        const mealLabel = row.mealPlan ? `, ${MEAL_LABELS[row.mealPlan] ?? row.mealPlan}` : ''
        for (const seg of segments) {
          const segNights = Math.round(seg.units / Math.max(1, row.rooms))
          trackLines[track].push({
            dayNumber: isoDiffDays(guest.startDate, seg.startDate) + 1,
            costCategory: 'accommodation',
            description: `${label} — ${segNights} night${segNights === 1 ? '' : 's'} ${row.roomCategory || 'sharing'}${mealLabel}`
              + (segments.length > 1 && seg.resolved.seasonName ? ` (${seg.resolved.seasonName})` : ''),
            rateCardId: seg.resolved.rateCardId,
            supplierRateId: seg.resolved.supplierRateId,
            pricingUnit: seg.resolved.pricingUnit,
            travellerCategory: null,
            roomCategory: row.roomCategory || null,
            quantity: seg.units,
            sourceCurrency: seg.resolved.sourceCurrency,
            sourceUnitCost: seg.resolved.sourceUnitCost,
            exchangeRateToUsd: seg.resolved.exchangeRateToUsd,
            unitCostUsd: seg.resolved.unitCostUsd,
            sortOrder: trackSort++,
          })
        }
        trackItems[track].push({
          dayNumber: isoDiffDays(guest.startDate, row.checkIn) + 1,
          itemType: 'accommodation',
          entityId: row.accommodationId,
          titleSnapshot: `${label} (${nights} night${nights === 1 ? '' : 's'}${mealLabel})`,
          roomCategory: row.roomCategory || null,
          sortOrder: trackItems[track].length,
        })
      }
    }

    if (gaps.length > 0) {
      return { ok: false, message: 'Missing rates block this save.', gaps: [...new Set(gaps)] }
    }

    // ── Travellers (one per adult/child, band by age) ──
    const adultBand = bands.find(b => b.code === 'adult')
    const travellers: Record<string, unknown>[] = []
    let tSort = 0
    for (let i = 0; i < guest.adults; i++) {
      travellers.push({
        displayName: i === 0 ? guest.name.trim() : `Adult ${i + 1}`,
        ageOnTravelDate: null,
        ageBandId: adultBand?.id ?? null,
        ageBandSnapshot: adultBand ? bandSnapshot(adultBand) : {},
        travellerCategory: 'adult',
        roomCategory: 'sharing',
        isPaying: true,
        sortOrder: tSort++,
      })
    }
    guest.childAges.forEach((age, i) => {
      const band = bandForAge(bands, age)
      const isFree = band?.default_pricing_method === 'free'
      travellers.push({
        displayName: `Child ${i + 1}`,
        ageOnTravelDate: age,
        ageBandId: band?.id ?? null,
        ageBandSnapshot: band ? bandSnapshot(band) : {},
        travellerCategory: band?.code ?? 'child',
        roomCategory: 'sharing',
        isPaying: !isFree,
        sortOrder: tSort++,
      })
    })

    // ── Days: one per trip date ──
    const tripDays = isoDiffDays(guest.startDate, guest.endDate) + 1
    const daysByTrack = (items: ItemDraft[]) =>
      Array.from({ length: tripDays }, (_, i) => ({
        dayNumber: i + 1,
        dayDate: isoAddDays(guest.startDate, i),
        title: null as string | null,
        items: items
          .concat(sharedItems)
          .filter(it => it.dayNumber === i + 1)
          .map(({ itemType, entityId, titleSnapshot, roomCategory, sortOrder }) => ({
            itemType, entityId, titleSnapshot, roomCategory, sortOrder,
          })),
      }))

    // ── Resolve client ──
    let clientId: string | null = null
    if (input.quoteId) {
      const { data: quote } = await admin
        .from('quotes').select('client_id').eq('id', input.quoteId).maybeSingle()
      clientId = (quote as { client_id?: string } | null)?.client_id ?? null
    }
    if (!clientId) {
      const nameParts = guest.name.trim().split(/\s+/)
      const firstName = nameParts[0] ?? ''
      const lastName = nameParts.slice(1).join(' ')
      if (guest.email.trim()) {
        clientId = await findOrCreateClientByEmail(admin, {
          email: guest.email,
          first_name: firstName,
          last_name: lastName,
          phone: guest.phone || null,
        })
      } else {
        const { data: created, error } = await admin
          .from('clients')
          .insert({ first_name: firstName, last_name: lastName, phone: guest.phone || null })
          .select('id')
          .single()
        if (error || !created) throw new Error(`Client creation failed: ${error?.message ?? 'no row'}`)
        clientId = created.id
      }
    }

    // ── Version targets: reuse mutable drafts, otherwise create new versions ──
    const versionIds: Partial<Record<TrackKey, string | null>> = { ...input.versionIds }
    let compareGroup: string | null = null
    for (const track of ['standard', 'premium'] as TrackKey[]) {
      const vid = versionIds[track]
      if (!vid) { versionIds[track] = null; continue }
      const { data: version } = await admin
        .from('quote_versions')
        .select('id, status, compare_group')
        .eq('id', vid)
        .maybeSingle()
      const v = version as { id: string; status: string; compare_group: string | null } | null
      if (!v || !['draft', 'ready'].includes(v.status)) {
        // Locked/sent versions are immutable — a re-save creates a new version.
        versionIds[track] = null
      } else {
        compareGroup = compareGroup ?? v.compare_group
      }
    }

    // ── Track payloads with sale-price-derived markup ──
    const round2 = (n: number) => Math.round(n * 100) / 100
    const tracksPayload = (['standard', 'premium'] as TrackKey[]).map(track => {
      const lines = [...trackLines[track], ...sharedLines]
      const cost = round2(lines.reduce((s, l) => s + l.quantity * l.unitCostUsd, 0))
      const sale = Number(state.salePrices[track])
      const hasSale = Number.isFinite(sale) && sale > 0
      const markupPct = hasSale && cost > 0 ? (sale / cost - 1) * 100 : 0
      return {
        trackLabel: track,
        versionId: versionIds[track] ?? null,
        defaultMarkupPercent: round2(Math.max(0, markupPct)),
        travellers,
        days: daysByTrack(trackItems[track]),
        priceLines: lines.map(l => {
          const { totalCostUsd, totalSellingUsd } = calculateLineTotals(l.quantity, l.unitCostUsd, markupPct)
          return {
            ...l,
            totalCostUsd: round2(totalCostUsd),
            totalSellingUsd: round2(totalSellingUsd),
          }
        }),
      }
    })

    const payload = {
      quoteId: input.quoteId ?? null,
      clientId,
      compareGroup,
      title: state.title.trim() || `${guest.name.trim()} — ${guest.startDate}`,
      travelStartDate: guest.startDate,
      travelEndDate: guest.endDate,
      createdBy: user.id,
      exchangeRatesSnapshot: {
        usd_to_kes: usdToKes,
        snapshot_at: new Date().toISOString(),
      },
      builderState: state,
      tracks: tracksPayload,
    }

    const { data: result, error: rpcError } = await admin.rpc('save_trip', { p_payload: payload })
    if (rpcError) throw new Error(rpcError.message)
    const saved = result as {
      quoteId: string
      standardVersionId: string
      premiumVersionId: string
    } | null
    if (!saved?.quoteId) throw new Error('Save failed — no quote returned.')

    const { data: quoteRow } = await admin
      .from('quotes').select('quote_number').eq('id', saved.quoteId).maybeSingle()

    revalidatePath('/admin/quotes')
    revalidatePath(`/admin/quotes/${saved.quoteId}`)

    const totals = Object.fromEntries(
      tracksPayload.map(t => [t.trackLabel, {
        costUsd: round2(t.priceLines.reduce((s, l) => s + l.totalCostUsd, 0)),
        sellingUsd: round2(t.priceLines.reduce((s, l) => s + l.totalSellingUsd, 0)),
      }]),
    ) as Record<TrackKey, { costUsd: number; sellingUsd: number }>

    return {
      ok: true,
      quoteId: saved.quoteId,
      quoteNumber: (quoteRow as { quote_number?: string } | null)?.quote_number ?? null,
      versionIds: {
        standard: saved.standardVersionId,
        premium: saved.premiumVersionId,
      },
      totals,
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Save failed.' }
  }
}
