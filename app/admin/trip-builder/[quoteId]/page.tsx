import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import TripBuilderForm from '../trip-builder-form'
import { loadBuilderLookups } from '../load-lookups'
import type { TrackKey, TripBuilderState } from '../types'

interface TrackVersionRow {
  id: string
  status: string
  track_label: TrackKey
  version_number: number
  builder_state: TripBuilderState | null
}

export default async function TripBuilderEditPage({
  params,
}: {
  params: Promise<{ quoteId: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { quoteId } = await params
  const admin = createAdminClient()

  const { data: quote } = await admin
    .from('quotes')
    .select('id, quote_number, status, client_id')
    .eq('id', quoteId)
    .maybeSingle()
  if (!quote) notFound()

  const { data: versionsData } = await admin
    .from('quote_versions')
    .select('id, status, track_label, version_number, builder_state')
    .eq('quote_id', quoteId)
    .not('track_label', 'is', null)
    .order('version_number', { ascending: false })

  const versions = (versionsData ?? []) as TrackVersionRow[]
  // Latest version per track — that's what a re-save updates (if still mutable).
  const latestByTrack: Partial<Record<TrackKey, TrackVersionRow>> = {}
  for (const v of versions) {
    if (!latestByTrack[v.track_label]) latestByTrack[v.track_label] = v
  }

  let initialState =
    latestByTrack.standard?.builder_state ?? latestByTrack.premium?.builder_state ?? null
  const hasBuilderState = initialState != null

  // Quotes created outside the builder (e.g. the new-quote wizard) have no
  // builder_state — seed the form from the quote's client, dates and travellers
  // so the admin doesn't re-enter details they already provided.
  if (!initialState) {
    const [{ data: client }, { data: latestVersion }] = await Promise.all([
      quote.client_id
        ? admin.from('clients').select('first_name, last_name, email, phone').eq('id', quote.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from('quote_versions')
        .select('id, title, travel_start_date, travel_end_date')
        .eq('quote_id', quoteId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const { data: travellers } = latestVersion
      ? await admin.from('quote_travellers')
          .select('traveller_category, age_on_travel_date')
          .eq('quote_version_id', latestVersion.id)
      : { data: null }

    const adults = (travellers ?? []).filter((t: any) => t.traveller_category === 'adult').length
    const childAges = (travellers ?? [])
      .filter((t: any) => t.traveller_category !== 'adult')
      .map((t: any) => t.age_on_travel_date ?? (t.traveller_category === 'infant' ? 0 : 8))

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
      hotelRows: { standard: [], premium: [] },
      transportRows: [],
      parkRows: [],
      salePrices: { standard: '', premium: '' },
    }
  }

  const lookups = await loadBuilderLookups(admin)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Trip Builder — <span className="font-mono">{quote.quote_number}</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Editing this quote&apos;s dual-track draft. Saving updates it in place — locked versions get a new version instead.
          </p>
        </div>
        <Link href={`/admin/quotes/${quoteId}`} className="text-sm text-[var(--olive)] hover:text-[var(--olive-dk)]">
          Quote detail →
        </Link>
      </div>

      {!hasBuilderState && (
        <p className="mb-4 text-sm text-amber-700 bg-amber-50 rounded-lg border border-amber-200 px-4 py-3">
          Pricing hasn&apos;t been built for this quote yet — add hotels, transport and parks below, then Save
          to create its Standard/Premium track versions.
        </p>
      )}

      <TripBuilderForm
        {...lookups}
        initialQuoteId={quoteId}
        initialVersionIds={{
          standard: latestByTrack.standard?.id ?? null,
          premium: latestByTrack.premium?.id ?? null,
        }}
        initialState={initialState}
      />
    </div>
  )
}
