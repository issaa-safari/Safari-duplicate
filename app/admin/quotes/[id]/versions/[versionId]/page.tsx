import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import VersionEditorForm from './form'

const STATUS_STYLES: Record<string, string> = {
  draft:      'bg-gray-100 text-gray-600',
  ready:      'bg-blue-100 text-blue-700',
  sent:       'bg-purple-100 text-purple-700',
  viewed:     'bg-indigo-100 text-indigo-700',
  accepted:   'bg-green-100 text-green-700',
  declined:   'bg-red-100 text-red-700',
  expired:    'bg-amber-100 text-amber-700',
  superseded: 'bg-gray-100 text-gray-400',
  cancelled:  'bg-gray-100 text-gray-500',
}

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

  const [
    { data: version },
    { data: quote },
    { data: travellers },
    { data: ageBands },
  ] = await Promise.all([
    admin
      .from('quote_versions')
      .select('id, version_number, status, title, travel_start_date, travel_end_date, valid_until')
      .eq('id', versionId)
      .single(),
    admin
      .from('quotes')
      .select('id, quote_number, status, mode, client_id')
      .eq('id', id)
      .single(),
    admin
      .from('quote_travellers')
      .select('id, display_name, age_on_travel_date, age_band_id, age_band_snapshot, traveller_category, room_category, is_paying, is_complimentary, sort_order')
      .eq('quote_version_id', versionId)
      .order('sort_order'),
    admin
      .from('traveller_age_bands')
      .select('id, name, code, min_age, max_age, default_pricing_method, default_percentage, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  if (!version || !quote) notFound()

  // Ensure version belongs to this quote
  const { data: versionCheck } = await admin
    .from('quote_versions')
    .select('id')
    .eq('id', versionId)
    .eq('quote_id', id)
    .single()

  if (!versionCheck) notFound()

  const { data: client } = await admin
    .from('clients')
    .select('first_name, last_name')
    .eq('id', quote.client_id)
    .single()

  const clientName = client
    ? `${client.first_name} ${client.last_name}`.trim()
    : 'Quote'

  const isLocked = !['draft', 'ready'].includes(version.status)

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
            <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' +
              (STATUS_STYLES[version.status] ?? 'bg-gray-100 text-gray-600')}>
              {version.status}
            </span>
            <span className="text-xs text-gray-400">Version {version.version_number}</span>
            {isLocked && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Read-only
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/admin/quotes/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700 shrink-0"
        >
          ← Back to quote
        </Link>
      </div>

      <VersionEditorForm
        quoteId={id}
        version={version}
        travellers={travellers ?? []}
        ageBands={ageBands ?? []}
      />
    </div>
  )
}
