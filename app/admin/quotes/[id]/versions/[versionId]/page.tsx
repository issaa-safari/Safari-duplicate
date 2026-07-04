import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/admin/status-badge'
import VersionEditorForm from './form'
import QuoteItineraryBuilder from './quote-itinerary-builder'
import VersionStatusControls from './version-status-controls'

export default async function VersionEditorPage({
  params,
}: {
  params: Promise<{ id: string; versionId: string }>
}) {
  const { id, versionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  // Load all data in parallel
  const [
    { data: version },
    { data: quote },
    { data: travellers },
    { data: ageBands },
    { data: quoteDays },
    { data: destinations },
    { data: accommodations },
    { data: activities },
    { data: vehicles },
    { data: staffData },
    { data: parksData },
    { data: _unused },
  ] = await Promise.all([
    admin.from('quote_versions')
      .select('id, version_number, status, title, travel_start_date, travel_end_date, valid_until, language, track_label')
      .eq('id', versionId).single(),
    admin.from('quotes')
      .select('id, quote_number, status, mode, client_id, tour_id, request_id, requests(preferred_start_date, travelers_adults), tours(duration_days)')
      .eq('id', id).single(),
    admin.from('quote_travellers')
      .select('id, display_name, age_on_travel_date, age_band_id, age_band_snapshot, pricing_fixed_amount_usd, traveller_category, room_category, is_paying, is_complimentary, sort_order')
      .eq('quote_version_id', versionId).order('sort_order'),
    admin.from('traveller_age_bands')
      .select('id, name, code, min_age, max_age, default_pricing_method, default_percentage, default_fixed_amount_usd, sort_order')
      .eq('is_active', true).order('sort_order'),
    admin.from('quote_days')
      .select('id, day_number, day_date, title, description_en, client_notes, title_ar, description_ar, client_notes_ar, destination_id, destination_snapshot, meals, sort_order')
      .eq('quote_version_id', versionId).order('sort_order'),
    admin.from('destinations')
      .select('id, name').eq('is_active', true).order('name'),
    admin.from('accommodations')
      .select('id, name, destination_id, description_en').eq('is_active', true).order('name'),
    admin.from('activities')
      .select('id, name, destination_id, description_en').eq('is_active', true).order('name'),
    admin.from('vehicles')
      .select('id, name, type, seats').order('name'),
    admin.from('tour_staff')
      .select('id, name, role').order('name'),
    admin.from('parks')
      .select('id, name, country').eq('is_active', true).order('name'),
    Promise.resolve({ data: null }),
  ])

  if (!version || !quote) notFound()

  const quoteRequest = {
    start_date: (quote as any).requests?.preferred_start_date ?? null,
    duration_days: (quote as any).tours?.duration_days ?? null,
  }

  // Confirm this version belongs to this quote
  const { data: versionCheck } = await admin
    .from('quote_versions').select('id')
    .eq('id', versionId).eq('quote_id', id).single()
  if (!versionCheck) notFound()

  // Load items for existing days and optionally the tour template days
  const dayIds = (quoteDays ?? []).map((d: any) => d.id)

  const [{ data: dayItems }, { data: tourDays }, { data: client }, { data: priceLines }] = await Promise.all([
    dayIds.length
      ? admin.from('quote_day_items')
          .select('id, quote_day_id, item_type, accommodation_id, activity_id, vehicle_id, staff_id, title_snapshot, content_snapshot, sort_order')
          .in('quote_day_id', dayIds).order('sort_order')
      : Promise.resolve({ data: [] as any[] }),
    quote.tour_id
      ? admin.from('tour_days')
          .select('day_number, day_number_end, title_en, title_ar, description_en, destination_id, accommodation_id, activity_ids, meal_breakfast, meal_lunch, meal_dinner')
          .eq('tour_id', quote.tour_id).order('day_number')
      : Promise.resolve({ data: [] as any[] }),
    admin.from('clients').select('first_name, last_name').eq('id', quote.client_id).single(),
    admin.from('quote_price_lines')
      .select('id, description, cost_category, pricing_unit, quantity, unit_cost_usd, markup_percent_override, total_cost_usd, total_selling_usd, is_optional, is_client_visible, sort_order')
      .eq('quote_version_id', versionId).order('sort_order'),
  ])

  const clientName = client
    ? `${client.first_name} ${client.last_name}`.trim()
    : 'Quote'

  const isLocked = !['draft', 'ready'].includes(version.status)

  // Hide legacy internal cost-sheet rows (pricing_unit cs_*) — they are no longer editable
  const clientPriceLines = (priceLines ?? []).filter(
    (l: any) => !String(l.pricing_unit ?? '').startsWith('cs_')
  )

  const categoryLabel = (c: string) =>
    ({ accommodation: 'Accommodation', activities: 'Activities', park_fees: 'Park Fees', transport: 'Transport', staff: 'Staff', meals: 'Meals', flights: 'Flights', other: 'Other' } as Record<string, string>)[c] ?? c

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
        <Link href="/admin/quotes" className="hover:text-gray-700">Quotes</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/admin/quotes/${id}`} className="font-mono hover:text-gray-700">
          {quote.quote_number}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700">Version {version.version_number}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {version.title || clientName}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge status={version.status} />
            <span className="text-xs text-gray-400">Version {version.version_number}</span>
            {isLocked && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Read-only
              </span>
            )}
          </div>
        </div>
        <Link href={`/admin/quotes/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700 shrink-0">
          ← Back to quote
        </Link>
      </div>

      {/* Status controls */}
      <div className="mb-6">
        <VersionStatusControls quoteId={id} versionId={versionId} status={version.status} />
      </div>

      {/* Phase 2: Dates + Travellers */}
      <VersionEditorForm
        quoteId={id}
        version={version}
        travellers={travellers ?? []}
        ageBands={ageBands ?? []}
        quoteRequest={quoteRequest}
      />

      {/* Live pricing summary */}
      {clientPriceLines.length > 0 && (() => {
        const payingPax = (travellers ?? []).filter((t: any) => t.is_paying && !t.is_complimentary).length
        const totalSelling = clientPriceLines.filter((l: any) => !l.is_optional)
          .reduce((s: number, l: any) => s + Number(l.total_selling_usd), 0)
        const totalCost = clientPriceLines.filter((l: any) => !l.is_optional)
          .reduce((s: number, l: any) => s + Number(l.total_cost_usd), 0)
        const perPerson = payingPax > 0 ? totalSelling / payingPax : 0
        const marginPct = totalSelling > 0 ? ((totalSelling - totalCost) / totalSelling) * 100 : 0
        return (
          <div className="mt-4 mb-2 rounded-lg px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm border"
            style={{ backgroundColor: 'rgba(122,154,74,0.07)', borderColor: 'var(--olive-lt)' }}>
            {payingPax > 0 && (
              <span className="text-gray-600">
                <span className="font-semibold text-gray-900">{payingPax}</span>{' '}
                paying pax
              </span>
            )}
            <span className="text-gray-600">
              Total <span className="font-semibold text-gray-900">
                ${totalSelling.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </span>
            {perPerson > 0 && (
              <span className="text-gray-600">
                Per person <span className="font-semibold text-[var(--olive-dk)]">
                  ${perPerson.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </span>
            )}
            <span className="text-gray-600">
              Margin <span className={`font-semibold ${marginPct < 15 ? 'text-red-600' : 'text-[var(--olive-dk)]'}`}>
                {marginPct.toFixed(1)}%
              </span>
            </span>
          </div>
        )
      })()}

      {/* Pricing — managed in the Trip Builder */}
      <div className="mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Price Lines</h2>
            <p className="text-xs text-gray-500 mt-0.5">Pricing is managed in the Trip Builder.</p>
          </div>
          {!isLocked && (
            <Link href={`/admin/trip-builder/${id}`}
              className="rounded-md px-3.5 py-2 text-sm font-medium text-white bg-olive hover:bg-olive-dk">
              Open Trip Builder
            </Link>
          )}
        </div>
        {version.track_label && (
          <p className="px-5 py-2.5 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
            This is a {version.track_label} track version — itinerary items, travellers and price lines
            are rewritten each time the Trip Builder is saved.
          </p>
        )}
        {clientPriceLines.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400">
            No price lines yet — build this quote in the Trip Builder to generate them.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-2.5 font-semibold">Description</th>
                  <th className="px-3 py-2.5 font-semibold">Category</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Qty</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Unit cost</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Selling</th>
                </tr>
              </thead>
              <tbody>
                {clientPriceLines.map((l: any) => (
                  <tr key={l.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 text-gray-800">
                      {l.description}
                      {l.is_optional && (
                        <span className="ml-2 text-xs text-gray-400">(optional)</span>
                      )}
                      {l.is_client_visible === false && (
                        <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">hidden from client</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{categoryLabel(l.cost_category)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{l.quantity ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">
                      {l.unit_cost_usd != null ? `$${Number(l.unit_cost_usd).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-900">
                      {l.total_selling_usd != null ? `$${Number(l.total_selling_usd).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Phase 3: Itinerary */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Itinerary</h2>
          {(quoteDays ?? []).length > 0 && (
            <span className="text-xs text-gray-400">{(quoteDays ?? []).length} day{(quoteDays ?? []).length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <QuoteItineraryBuilder
          quoteId={id}
          versionId={versionId}
          travelStartDate={version.travel_start_date ?? null}
          travelEndDate={version.travel_end_date ?? null}
          quoteDays={quoteDays ?? []}
          dayItems={dayItems ?? []}
          tourDays={tourDays ?? []}
          destinations={destinations ?? []}
          accommodations={accommodations ?? []}
          activities={activities ?? []}
          vehicles={vehicles ?? []}
          staff={staffData ?? []}
          isLocked={isLocked}
          language={(version.language as 'en' | 'ar') ?? 'en'}
        />
      </div>
    </div>
  )
}
