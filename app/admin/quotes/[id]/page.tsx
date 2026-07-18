import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import StatusBadge from '@/components/admin/status-badge'
import CloneVersionButton from './clone-version-button'
import TemplateToggleButton from './template-toggle-button'
import QuoteWorkspace from './quote-workspace'
import { loadBuilderLookups } from '../../trip-builder/load-lookups'
import { loadTripBuilderInitialState } from '../../trip-builder/load-initial-state'

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ step?: string; version?: string }>
}) {
  const { id } = await params
  const { step: stepParam, version: versionParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  // Separate queries to avoid PostgREST FK ambiguity
  const { data: quote } = await admin
    .from('quotes')
    .select('id, quote_number, status, mode, created_at, client_id, request_id, tour_id, departure_id, is_template')
    .eq('id', id)
    .single()

  if (!quote) notFound()

  const [
    { data: clientRow },
    { data: requestRow },
    { data: tourRow },
    { data: departureRow },
    { data: versionRows },
    { data: deliveryRows },
  ] = await Promise.all([
    admin.from('clients').select('first_name, last_name, email, phone, country').eq('id', quote.client_id).single(),
    quote.request_id
      ? admin.from('requests').select('id, reference, preferred_start_date').eq('id', quote.request_id).single()
      : Promise.resolve({ data: null }),
    quote.tour_id
      ? admin.from('tours').select('title_en, duration_days').eq('id', quote.tour_id).single()
      : Promise.resolve({ data: null }),
    quote.departure_id
      ? admin.from('departures').select('start_date, end_date').eq('id', quote.departure_id).single()
      : Promise.resolve({ data: null }),
    admin.from('quote_versions')
      .select('id, version_number, status, title, travel_start_date, travel_end_date, valid_until, default_markup_percent, sharing_price_per_person_usd, single_price_per_person_usd, single_supplement_usd, total_cost_usd, total_selling_usd, gross_margin_percent, locked_at, sent_at, created_at, language')
      .eq('quote_id', id)
      .order('version_number', { ascending: false }),
    admin.from('quote_deliveries')
      .select('id, quote_version_id, channel, access_token, expires_at, sent_at, first_viewed_at, last_viewed_at, view_count, revoked_at, created_at')
      .eq('quote_id', id)
      .order('created_at', { ascending: false }),
  ])

  const client = clientRow ?? null
  const versions: any[] = versionRows ?? [] // already ordered desc
  const latestVersion = versions[0]
  const deliveries: any[] = deliveryRows ?? []

  // Which versions need itinerary data loaded: the latest version, plus any
  // version explicitly requested via ?version= (e.g. a redirect from the old
  // per-version route).
  const versionsNeedingItinerary = latestVersion ? [latestVersion] : []
  const requestedVersion = versionParam
    ? versions.find((v: any) => v.id === versionParam)
    : null
  if (requestedVersion && !versionsNeedingItinerary.some((v: any) => v.id === requestedVersion.id)) {
    versionsNeedingItinerary.push(requestedVersion)
  }
  const versionIds = versionsNeedingItinerary.map((v: any) => v.id)

  const [
    { data: quoteDaysAll },
    { data: destinations },
    { data: accommodations },
    { data: activities },
    { data: vehiclesData },
    { data: staffData },
    { data: ageBandsData },
    { data: tourDaysData },
    tripBuilderLookups,
    tripBuilderInit,
  ] = await Promise.all([
    versionIds.length
      ? admin.from('quote_days')
          .select('id, day_number, day_number_end, day_date, title, description_en, client_notes, title_ar, description_ar, client_notes_ar, destination_id, destination_snapshot, meals, photos, distance_km, sort_order, quote_version_id')
          .in('quote_version_id', versionIds).order('sort_order')
      : Promise.resolve({ data: [] as any[] }),
    admin.from('destinations').select('id, name, country').eq('is_active', true).order('name'),
    admin.from('accommodations').select('id, name, destination_id, description_en').eq('is_active', true).order('name'),
    admin.from('activities').select('id, name, destination_id, description_en').eq('is_active', true).order('name'),
    admin.from('vehicles').select('id, name, type, seats').order('name'),
    admin.from('tour_staff').select('id, name, role').order('name'),
    admin.from('traveller_age_bands')
      .select('id, name, code, min_age, max_age, default_pricing_method, default_percentage, default_fixed_amount_usd, sort_order')
      .eq('is_active', true).order('sort_order'),
    quote.tour_id
      ? admin.from('tour_days')
          .select('day_number, day_number_end, title_en, title_ar, description_en, destination_id, accommodation_id, activity_ids, meal_breakfast, meal_lunch, meal_dinner')
          .eq('tour_id', quote.tour_id).order('day_number')
      : Promise.resolve({ data: [] as any[] }),
    loadBuilderLookups(admin),
    loadTripBuilderInitialState(admin, id),
  ])

  const dayIds = (quoteDaysAll ?? []).map((d: any) => d.id)
  const [{ data: dayItemsAll }, { data: travellersAll }] = await Promise.all([
    dayIds.length
      ? admin.from('quote_day_items')
          .select('id, quote_day_id, item_type, accommodation_id, activity_id, vehicle_id, staff_id, title_snapshot, content_snapshot, sort_order')
          .in('quote_day_id', dayIds).order('sort_order')
      : Promise.resolve({ data: [] as any[] }),
    versionIds.length
      ? admin.from('quote_travellers')
          .select('id, display_name, age_on_travel_date, age_band_id, age_band_snapshot, pricing_fixed_amount_usd, traveller_category, room_category, is_paying, is_complimentary, sort_order, quote_version_id')
          .in('quote_version_id', versionIds).order('sort_order')
      : Promise.resolve({ data: [] as any[] }),
  ])

  const itineraryByVersion: Record<string, any> = {}
  for (const v of versionsNeedingItinerary) {
    const vDays = (quoteDaysAll ?? []).filter((d: any) => d.quote_version_id === v.id)
    const vDayIds = new Set(vDays.map((d: any) => d.id))
    itineraryByVersion[v.id] = {
      quoteDays: vDays,
      dayItems: (dayItemsAll ?? []).filter((it: any) => vDayIds.has(it.quote_day_id)),
      travellers: (travellersAll ?? []).filter((t: any) => t.quote_version_id === v.id),
      isLocked: !['draft', 'ready'].includes(v.status),
    }
  }

  const quoteRequest = {
    start_date: (requestRow as any)?.preferred_start_date ?? null,
    duration_days: (tourRow as any)?.duration_days ?? null,
  }

  const clientName = client ? `${client.first_name} ${client.last_name}`.trim() : 'Quote'

  const VALID_STEPS = ['itinerary', 'pricing', 'preview', 'send']
  const initialStep = (VALID_STEPS.includes(stepParam ?? '') ? stepParam : 'itinerary') as
    'itinerary' | 'pricing' | 'preview' | 'send'
  const initialVersionId =
    (versionParam && versions.some((v: any) => v.id === versionParam) ? versionParam : latestVersion?.id) ?? ''

  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = `${proto}://${host}`

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/admin/quotes" className="text-sm text-muted-foreground hover:text-foreground">
              ← Quotes
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-mono text-muted-foreground">{quote.quote_number}</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {latestVersion?.title || clientName}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge status={quote.status} />
            <span className="text-xs text-muted-foreground capitalize">
              {quote.mode === 'fixed_departure' ? 'Fixed Departure' : 'Custom Safari'}
            </span>
          </div>
        </div>
        <TemplateToggleButton quoteId={id} isTemplate={!!quote.is_template} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left — client + context */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Client</h2>
            {client ? (
              <>
                <Link href={`/admin/clients/${quote.client_id}`}
                  className="font-medium text-foreground hover:text-brand-ink">
                  {client.first_name} {client.last_name}
                </Link>
                <p className="text-sm text-muted-foreground mt-0.5">{client.email}</p>
                {client.country && <p className="text-xs text-muted-foreground mt-0.5">🌍 {client.country}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  {client.phone && (
                    <a href={`tel:${client.phone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: 'var(--admin-bg)', color: 'var(--olive-dk)', border: '1px solid var(--olive-lt)' }}>
                      📞 Call
                    </a>
                  )}
                  {client.phone && (
                    <a href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}>
                      💬 WhatsApp
                    </a>
                  )}
                  <a href={`mailto:${client.email}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                    ✉ Email
                  </a>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {requestRow && (
            <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Linked Request</h2>
              <Link
                href={`/admin/requests/${(requestRow as any).id}`}
                className="text-sm text-brand-text hover:underline font-mono">
                {(requestRow as any).reference}
              </Link>
            </div>
          )}

          {tourRow && (
            <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tour Template</h2>
              <p className="text-sm text-foreground">{(tourRow as any).title_en}</p>
            </div>
          )}

          {/* Versions history */}
          <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border/70 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Versions</h2>
              <span className="text-xs text-muted-foreground">{versions.length}</span>
            </div>
            {versions.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No versions yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {versions.map((v: any) => (
                  <div key={v.id} className="px-5 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/quotes/${quote.id}?step=itinerary&version=${v.id}`}
                        className="text-brand-text hover:underline font-medium text-sm">
                        v{v.version_number}
                      </Link>
                      <div className="mt-0.5"><StatusBadge status={v.status} /></div>
                    </div>
                    <CloneVersionButton quoteId={id} versionId={v.id} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — the unified workspace */}
        <div className="lg:col-span-3">
          {versions.length === 0 || !latestVersion ? (
            <div className="rounded-xl border border-border bg-surface shadow-sm p-10 text-center text-sm text-muted-foreground">
              This quote has no version yet.
            </div>
          ) : (
            <QuoteWorkspace
              quoteId={id}
              initialStep={initialStep}
              versions={versions}
              initialVersionId={initialVersionId}
              destinations={destinations ?? []}
              accommodations={accommodations ?? []}
              activities={activities ?? []}
              vehicles={vehiclesData ?? []}
              staff={staffData ?? []}
              ageBands={ageBandsData ?? []}
              tourDays={tourDaysData ?? []}
              quoteRequest={quoteRequest}
              itineraryByVersion={itineraryByVersion}
              tripBuilderLookups={tripBuilderLookups}
              tripBuilderInitialState={tripBuilderInit?.initialState ?? null}
              tripBuilderInitialVersionId={tripBuilderInit?.initialVersionId ?? null}
              deliveries={deliveries}
              baseUrl={baseUrl}
              clientEmail={client?.email ?? null}
            />
          )}
        </div>
      </div>
    </div>
  )
}
