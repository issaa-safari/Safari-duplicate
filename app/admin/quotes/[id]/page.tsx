import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import StatusBadge from '@/components/admin/status-badge'
import DeliveryPanel from './delivery-panel'
import CloneVersionButton from './clone-version-button'

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  // Separate queries to avoid PostgREST FK ambiguity
  const { data: quote } = await admin
    .from('quotes')
    .select('id, quote_number, status, mode, created_at, client_id, request_id, tour_id, departure_id')
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
      ? admin.from('requests').select('id, reference').eq('id', quote.request_id).single()
      : Promise.resolve({ data: null }),
    quote.tour_id
      ? admin.from('tours').select('title_en').eq('id', quote.tour_id).single()
      : Promise.resolve({ data: null }),
    quote.departure_id
      ? admin.from('departures').select('start_date, end_date').eq('id', quote.departure_id).single()
      : Promise.resolve({ data: null }),
    admin.from('quote_versions')
      .select('id, version_number, status, title, travel_start_date, travel_end_date, valid_until, default_markup_percent, sharing_price_per_person_usd, single_price_per_person_usd, single_supplement_usd, total_cost_usd, total_selling_usd, gross_margin_percent, locked_at, sent_at, created_at, track_label, compare_group')
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

  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = `${proto}://${host}`

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/admin/quotes" className="text-sm text-gray-500 hover:text-gray-700">
              ← Quotes
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-mono text-gray-500">{quote.quote_number}</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">
            {latestVersion?.title || (client ? `${client.first_name} ${client.last_name}` : 'Quote')}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge status={quote.status} />
            <span className="text-xs text-gray-400 capitalize">
              {quote.mode === 'fixed_departure' ? 'Fixed Departure' : 'Custom Safari'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {versions.some((v: any) => v.track_label) && ['draft', 'ready'].includes(quote.status) && (
            <Link
              href={`/admin/trip-builder/${quote.id}`}
              className="rounded-md px-4 py-2 text-sm font-medium text-[var(--olive-dk)] border border-[var(--olive)]/40 hover:bg-[var(--olive)]/5">
              Open in Trip Builder
            </Link>
          )}
          {/* Always allow opening the latest version to review the itinerary and
              costing. While editable it's "Edit"; once sent/accepted it's "View". */}
          {latestVersion && (
            <Link
              href={`/admin/quotes/${quote.id}/versions/${latestVersion.id}`}
              className="rounded-md px-4 py-2 text-sm font-medium text-white bg-olive hover:bg-olive-dk">
              {quote.status === 'draft' || quote.status === 'ready'
                ? `Edit Version ${latestVersion.version_number}`
                : `View itinerary & costing (v${latestVersion.version_number})`}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — client + context */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client</h2>
            {client ? (
              <>
                <Link href={`/admin/clients/${quote.client_id}`}
                  className="font-medium text-gray-900 hover:text-[var(--olive-dk)]">
                  {client.first_name} {client.last_name}
                </Link>
                <p className="text-sm text-gray-500 mt-0.5">{client.email}</p>
                {client.country && <p className="text-xs text-gray-400 mt-0.5">🌍 {client.country}</p>}
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
              <p className="text-sm text-gray-400">—</p>
            )}
          </div>

          {requestRow && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Linked Request</h2>
              <Link
                href={`/admin/requests/${(requestRow as any).id}`}
                className="text-sm text-[var(--olive)] hover:underline font-mono">
                {(requestRow as any).reference}
              </Link>
            </div>
          )}

          {tourRow && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tour Template</h2>
              <p className="text-sm text-gray-700">{(tourRow as any).title_en}</p>
            </div>
          )}
        </div>

        {/* Right — versions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Versions</h2>
              <span className="text-xs text-gray-400">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
            </div>
            {versions.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No versions yet.</div>
            ) : (
              <table className="stack-table w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="px-5 py-3 font-medium">Version</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium hidden md:table-cell">Dates</th>
                    <th className="px-5 py-3 font-medium text-right">Price /pp</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v: any) => (
                    <tr key={v.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td data-label="Version" className="px-5 py-3">
                        <Link
                          href={`/admin/quotes/${quote.id}/versions/${v.id}`}
                          className="text-[var(--olive)] hover:underline font-medium">
                          v{v.version_number}
                        </Link>
                        {v.track_label && (
                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                            v.track_label === 'premium' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {v.track_label}
                          </span>
                        )}
                        {v.title && (
                          <p className="text-xs text-gray-400 mt-0.5">{v.title}</p>
                        )}
                      </td>
                      <td data-label="Status" className="px-5 py-3">
                        <StatusBadge status={v.status} />
                      </td>
                      <td data-label="Dates" className="px-5 py-3 text-gray-500 hidden md:table-cell">
                        {v.travel_start_date
                          ? new Date(v.travel_start_date).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td data-label="Price /pp" className="px-5 py-3 text-right font-medium text-gray-900">
                        {v.sharing_price_per_person_usd
                          ? `$${Number(v.sharing_price_per_person_usd).toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <CloneVersionButton quoteId={id} versionId={v.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Share links */}
          <DeliveryPanel
            quoteId={id}
            versions={versions.map((v: any) => ({ id: v.id, version_number: v.version_number, status: v.status }))}
            deliveries={deliveries}
            baseUrl={baseUrl}
          />

          {/* Pricing summary for latest version */}
          {latestVersion && (latestVersion.total_selling_usd > 0) && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Pricing Summary — v{latestVersion.version_number}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-400">Sharing /pp</p>
                  <p className="font-semibold text-gray-900">
                    {latestVersion.sharing_price_per_person_usd
                      ? `$${Number(latestVersion.sharing_price_per_person_usd).toLocaleString()}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Single /pp</p>
                  <p className="font-semibold text-gray-900">
                    {latestVersion.single_price_per_person_usd
                      ? `$${Number(latestVersion.single_price_per_person_usd).toLocaleString()}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Selling</p>
                  <p className="font-semibold text-gray-900">
                    ${Number(latestVersion.total_selling_usd).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Margin</p>
                  <p className="font-semibold text-gray-900">
                    {Number(latestVersion.gross_margin_percent).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
