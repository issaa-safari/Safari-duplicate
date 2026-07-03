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
    .select('id, quote_number, status')
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

  const initialState =
    latestByTrack.standard?.builder_state ?? latestByTrack.premium?.builder_state ?? null

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

      {!initialState && (
        <p className="mb-4 text-sm text-amber-700 bg-amber-50 rounded-lg border border-amber-200 px-4 py-3">
          This quote wasn&apos;t created in the Trip Builder (no saved builder state) — the form below starts empty,
          and saving will add new Standard/Premium track versions to the quote.
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
