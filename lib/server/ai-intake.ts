// Conversational intake → draft quote.
//
// The AI (Claude, via the Cowork plugin's MCP connector) conducts the interview
// and hands the assembled trip here. This module is pure PERSISTENCE + name→ID
// matching — it never talks to a model and never prices anything. It creates a
// client + request + a DRAFT quote/version and writes the itinerary the operator
// then opens and prices in the app.
//
// Reuses existing RPCs so it stays consistent with the hand-built flow:
//   • create_quote_with_version (group_17) — client-linked draft quote + version 1
//   • save_quote_itinerary       (group_61) — quote_days + items (with day spans)
//   • findOrCreateClientByEmail  (lib/server/clients.ts)

import type { SupabaseClient } from '@supabase/supabase-js'
import { findOrCreateClientByEmail } from './clients'

export interface IntakeDay {
  destination: string
  accommodation?: string
  activities?: string[]
  /** Meal codes: 'B' | 'L' | 'D'. */
  meals?: string[]
  notes?: string
  /** Nights at this stop (default 1). >1 becomes a multi-night day span. */
  nights?: number
}

export interface IntakePayload {
  guest: {
    name: string
    email?: string
    phone?: string
    whatsapp?: string
    country?: string
    /** 'en' | 'ar' | 'fr' | 'de' | 'es' | 'zh' or a plain language name. */
    language?: string
    notes?: string
  }
  adults: number
  childAges: number[]
  startDate?: string
  endDate?: string
  title?: string
  /** Free-text budget/style note kept for the operator. */
  budgetNote?: string
  tripType?: string
  roomType?: string
  /** Whole-trip nights (falls back to the sum of per-stop nights). */
  nights?: number
  heardAboutUs?: string
  priority?: string
  residency?: string
  days: IntakeDay[]
}

export type CreateDraftResult =
  | {
      ok: true
      quoteId: string
      quoteNumber: string | null
      url: string
      requestRef: string | null
      unmatched: string[]
    }
  | { ok: false; message: string }

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

interface DestRow { id: string; name: string }
interface AccRow { id: string; name: string; destination_id: string | null }
interface ActRow { id: string; name: string }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000
const norm = (s: string) => s.trim().toLowerCase()

function isoOrNull(s: string | undefined): string | null {
  return s && ISO_DATE.test(s) ? s : null
}

function isoAddDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10)
}

const LANG_MAP: Record<string, string> = {
  english: 'en', en: 'en', arabic: 'ar', ar: 'ar', french: 'fr', fr: 'fr',
  german: 'de', de: 'de', spanish: 'es', es: 'es', chinese: 'zh', zh: 'zh',
}
function normLang(s?: string): string | null {
  if (!s) return null
  return LANG_MAP[s.trim().toLowerCase()] ?? null
}

const ROOM_TYPE_MAP: Record<string, string> = {
  sharing: 'sharing', twin: 'sharing', 'sharing/twin': 'sharing', 'twin/sharing': 'sharing',
  single: 'single', triple: 'triple', 'extra bed': 'extra_bed', extra_bed: 'extra_bed',
  'no bed': 'no_bed', no_bed: 'no_bed',
}
function normRoomType(s?: string): string | null {
  if (!s?.trim()) return null
  return ROOM_TYPE_MAP[s.trim().toLowerCase()] ?? s.trim()
}

function bandForAge(bands: BandRow[], age: number): BandRow | null {
  return bands.find(b => age >= b.min_age && (b.max_age === null || age <= b.max_age)) ?? null
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

function nightsOf(d: IntakeDay): number {
  const n = Math.floor(Number(d.nights))
  return Number.isFinite(n) && n >= 1 ? n : 1
}

/**
 * Create a client + request + draft quote from an assembled interview, and
 * write its itinerary. Draft-only: nothing is priced, nothing is sent.
 */
export async function createSafariDraft(
  admin: SupabaseClient,
  payload: IntakePayload,
): Promise<CreateDraftResult> {
  try {
    const name = (payload.guest?.name ?? '').trim()
    if (!name) return { ok: false, message: 'A guest name is required.' }
    if (!Array.isArray(payload.days) || payload.days.length === 0) {
      return { ok: false, message: 'At least one itinerary day is required.' }
    }
    const adults = Number.isInteger(payload.adults) && payload.adults > 0 ? payload.adults : 1
    const childAges = (Array.isArray(payload.childAges) ? payload.childAges : [])
      .map(a => Math.floor(Number(a)))
      .filter(a => Number.isFinite(a) && a >= 0 && a <= 17)
    const startDate = isoOrNull(payload.startDate)
    const lang = normLang(payload.guest.language)
    const whatsapp = payload.guest.whatsapp?.trim() || null
    const country = payload.guest.country?.trim() || null
    const clientNotes = payload.guest.notes?.trim() || null

    // Total nights from the stops; derive an end date if none was given.
    const totalNights = payload.days.reduce((s, d) => s + nightsOf(d), 0)
    const tripNights = Number.isFinite(Number(payload.nights)) && Number(payload.nights) > 0
      ? Math.floor(Number(payload.nights))
      : totalNights
    const endDate = isoOrNull(payload.endDate)
      ?? (startDate && totalNights > 0 ? isoAddDays(startDate, totalNights) : null)

    // ── Client (find-or-create by email; otherwise a name-only record) ──
    const nameParts = name.split(/\s+/)
    const firstName = nameParts[0] ?? ''
    const lastName = nameParts.slice(1).join(' ')
    let clientId: string
    if (payload.guest.email?.trim()) {
      clientId = await findOrCreateClientByEmail(admin, {
        email: payload.guest.email,
        first_name: firstName,
        last_name: lastName,
        phone: payload.guest.phone || null,
      })
      // Fill any blank profile fields the interview supplied (don't clobber).
      const { data: existing } = await admin
        .from('clients')
        .select('whatsapp, country, preferred_language, notes')
        .eq('id', clientId).maybeSingle()
      const cur = (existing ?? {}) as Record<string, unknown>
      const patch: Record<string, unknown> = {}
      if (!cur.whatsapp && whatsapp) patch.whatsapp = whatsapp
      if (!cur.country && country) patch.country = country
      if (!cur.notes && clientNotes) patch.notes = clientNotes
      if (lang && (!cur.preferred_language || cur.preferred_language === 'en')) {
        patch.preferred_language = lang
        patch.language = lang
      }
      if (Object.keys(patch).length > 0) await admin.from('clients').update(patch).eq('id', clientId)
    } else {
      const { data: created, error } = await admin
        .from('clients')
        .insert({
          first_name: firstName,
          last_name: lastName,
          phone: payload.guest.phone || null,
          whatsapp,
          country,
          notes: clientNotes,
          source: 'ai_intake',
          ...(lang ? { preferred_language: lang, language: lang } : {}),
        })
        .select('id')
        .single()
      if (error || !created) return { ok: false, message: `Client creation failed: ${error?.message ?? 'no row'}` }
      clientId = created.id
    }

    // ── Request (records the enquiry in the CRM) ──
    const clientQuestion = [
      payload.budgetNote?.trim(),
      payload.residency?.trim() ? `Residency: ${payload.residency.trim()}` : '',
      payload.days.map(d => d.notes?.trim()).filter(Boolean).join(' | '),
    ].filter(Boolean).join(' — ') || null

    const { data: request } = await admin
      .from('requests')
      .insert({
        client_id: clientId,
        stage: 'new',
        source: 'ai_intake',
        travelers_adults: adults,
        travelers_children_older: childAges.filter(a => a >= 4).length,
        travelers_children_younger: childAges.filter(a => a < 4).length,
        group_size: adults + childAges.length,
        preferred_start_date: startDate,
        trip_length_nights: tripNights > 0 ? tripNights : null,
        requested_tour_type: payload.tripType?.trim() || null,
        preferred_room_type: normRoomType(payload.roomType),
        heard_about_us: payload.heardAboutUs?.trim() || null,
        priority: payload.priority?.trim() || null,
        client_question: clientQuestion,
      })
      .select('id, reference')
      .single()
    const requestId = (request as { id?: string } | null)?.id ?? null
    const requestRef = (request as { reference?: string } | null)?.reference ?? null

    // ── Quote + version (reuse the same creator the app uses) ──
    const title = (payload.title ?? '').trim() || `${name}${startDate ? ` — ${startDate}` : ''}`
    const { data: quoteId, error: quoteErr } = await admin.rpc('create_quote_with_version', {
      p_client_id: clientId,
      p_request_id: requestId,
      p_mode: 'custom',
      p_tour_id: null,
      p_departure_id: null,
      p_title: title,
      p_created_by: null,
    })
    if (quoteErr || !quoteId) return { ok: false, message: `Quote creation failed: ${quoteErr?.message ?? 'no id'}` }

    const [{ data: version }, { data: quote }] = await Promise.all([
      admin.from('quote_versions').select('id').eq('quote_id', quoteId as string).order('version_number', { ascending: false }).limit(1).maybeSingle(),
      admin.from('quotes').select('quote_number').eq('id', quoteId as string).maybeSingle(),
    ])
    const versionId = (version as { id?: string } | null)?.id
    if (!versionId) return { ok: false, message: 'Quote version was not created.' }

    await admin.from('quote_versions')
      .update({ title, travel_start_date: startDate, travel_end_date: endDate, language: lang ?? 'en' })
      .eq('id', versionId)

    // ── Travellers (roster for the pricing step + proposal) ──
    const { data: bandsData } = await admin
      .from('traveller_age_bands')
      .select('id, name, code, min_age, max_age, default_pricing_method, default_percentage, default_fixed_amount_usd')
      .eq('is_active', true)
      .order('sort_order')
    const bands = (bandsData ?? []) as BandRow[]
    const adultBand = bands.find(b => b.code === 'adult')
    const roomCat = normRoomType(payload.roomType) ?? 'sharing'
    const travellers: Record<string, unknown>[] = []
    let sort = 0
    for (let i = 0; i < adults; i++) {
      travellers.push({
        quote_version_id: versionId,
        display_name: i === 0 ? name : `Adult ${i + 1}`,
        age_band_id: adultBand?.id ?? null,
        age_band_snapshot: adultBand ? bandSnapshot(adultBand) : {},
        traveller_category: 'adult',
        room_category: roomCat,
        is_paying: true,
        sort_order: sort++,
      })
    }
    childAges.forEach((age, i) => {
      const band = bandForAge(bands, age)
      const isFree = band?.default_pricing_method === 'free'
      travellers.push({
        quote_version_id: versionId,
        display_name: `Child ${i + 1}`,
        age_on_travel_date: age,
        age_band_id: band?.id ?? null,
        age_band_snapshot: band ? bandSnapshot(band) : {},
        traveller_category: band?.code ?? 'child',
        room_category: roomCat,
        is_paying: !isFree,
        sort_order: sort++,
      })
    })
    if (travellers.length > 0) await admin.from('quote_travellers').insert(travellers)

    // ── Content-library lookups for name→ID matching ──
    const [{ data: destsData }, { data: accsData }, { data: actsData }] = await Promise.all([
      admin.from('destinations').select('id, name').eq('is_active', true),
      admin.from('accommodations').select('id, name, destination_id').eq('is_active', true),
      admin.from('activities').select('id, name').eq('is_active', true),
    ])
    const destByName = new Map<string, DestRow>()
    for (const d of (destsData ?? []) as DestRow[]) destByName.set(norm(d.name), d)
    const accsByName = new Map<string, AccRow[]>()
    for (const a of (accsData ?? []) as AccRow[]) {
      const list = accsByName.get(norm(a.name)) ?? []
      list.push(a); accsByName.set(norm(a.name), list)
    }
    const actByName = new Map<string, ActRow>()
    for (const a of (actsData ?? []) as ActRow[]) actByName.set(norm(a.name), a)

    // ── Build the itinerary day payload; multi-night stops become day spans ──
    const unmatched: string[] = []
    let dayNumber = 1
    const days = payload.days.map((d) => {
      const nights = nightsOf(d)
      const startDay = dayNumber
      const endDay = nights > 1 ? dayNumber + nights - 1 : null
      dayNumber += nights

      const dest = d.destination ? destByName.get(norm(d.destination)) : undefined
      if (d.destination && !dest) unmatched.push(`destination "${d.destination}"`)

      const items: Record<string, unknown>[] = []
      if (d.accommodation?.trim()) {
        const candidates = accsByName.get(norm(d.accommodation)) ?? []
        const acc = candidates.find(c => dest && c.destination_id === dest.id) ?? candidates[0]
        if (!acc) unmatched.push(`accommodation "${d.accommodation}"`)
        items.push({
          itemType: 'accommodation',
          entityId: acc?.id ?? '',
          titleSnapshot: d.accommodation.trim(),
          contentSnapshot: { source: 'ai_intake', destination_id: dest?.id ?? null },
        })
      }
      for (const raw of d.activities ?? []) {
        const label = String(raw).trim()
        if (!label) continue
        const act = actByName.get(norm(label))
        if (!act) unmatched.push(`activity "${label}"`)
        items.push({
          itemType: 'activity',
          entityId: act?.id ?? '',
          titleSnapshot: label,
          contentSnapshot: { source: 'ai_intake' },
        })
      }

      return {
        dayNumber: startDay,
        dayNumberEnd: endDay,
        destinationId: dest?.id ?? '',
        destinationSnapshot: dest ? { id: dest.id, name: dest.name } : { name: d.destination ?? '' },
        meals: (d.meals ?? []).map(m => String(m).toUpperCase()).filter(m => m === 'B' || m === 'L' || m === 'D'),
        descriptionEn: d.notes?.trim() ?? '',
        items,
      }
    })

    const { error: itinErr } = await admin.rpc('save_quote_itinerary', { p_version_id: versionId, p_days: days })
    if (itinErr) return { ok: false, message: `Saving the itinerary failed: ${itinErr.message}` }

    return {
      ok: true,
      quoteId: quoteId as string,
      quoteNumber: (quote as { quote_number?: string } | null)?.quote_number ?? null,
      url: `/admin/quotes/${quoteId}?step=itinerary`,
      requestRef,
      unmatched: [...new Set(unmatched)],
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Draft creation failed.' }
  }
}
