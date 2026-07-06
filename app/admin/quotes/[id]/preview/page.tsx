import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import QuoteSteps from '../quote-steps'
import PreviewControls from './preview-controls'
import ProposalView, { DEFAULT_SECTIONS, type SectionKey, type ProposalData } from '@/components/quote/proposal-view'

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: quote } = await admin
    .from('quotes').select('id, quote_number, client_id').eq('id', id).single()
  if (!quote) notFound()

  const { data: versions } = await admin
    .from('quote_versions')
    .select('id, title, travel_start_date, travel_end_date, currency, sharing_price_per_person_usd, total_selling_usd, inclusions, exclusions, preview_layout, preview_theme')
    .eq('quote_id', id).order('version_number', { ascending: false })
  const version = (versions ?? [])[0]

  if (!version) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <QuoteSteps quoteId={id} versionId={null} active="preview" />
        <p className="text-sm text-gray-500">No version to preview yet — build the itinerary first.</p>
      </div>
    )
  }

  const [{ data: client }, { data: settings }, { data: days }, { data: priceLines }] = await Promise.all([
    admin.from('clients').select('first_name, last_name').eq('id', quote.client_id).single(),
    admin.from('company_settings').select('company_name').limit(1).single(),
    admin.from('quote_days')
      .select('day_number, title, description_en, meals, quote_day_items (item_type, title_snapshot)')
      .eq('quote_version_id', version.id).order('day_number'),
    admin.from('quote_price_lines')
      .select('description, quantity, total_selling_usd, is_client_visible')
      .eq('quote_version_id', version.id).order('sort_order'),
  ])

  const visibleLines = (priceLines ?? []).filter((l: any) => l.is_client_visible)
  const data: ProposalData = {
    title: version.title || 'Your Safari Proposal',
    companyName: settings?.company_name ?? 'Safari Adventure Riders',
    clientName: client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() : '',
    travelStart: version.travel_start_date,
    travelEnd: version.travel_end_date,
    perPerson: version.sharing_price_per_person_usd,
    currency: version.currency || 'USD',
    days: (days ?? []).map((d: any) => ({
      day_number: d.day_number,
      title: d.title,
      description_en: d.description_en,
      meals: d.meals,
      items: (d.quote_day_items ?? []).map((i: any) => ({ item_type: i.item_type, title_snapshot: i.title_snapshot })),
    })),
    inclusions: version.inclusions,
    exclusions: version.exclusions,
    priceLines: visibleLines.map((l: any) => ({ description: l.description, quantity: Number(l.quantity), total: Number(l.total_selling_usd) })),
    total: Number(version.total_selling_usd ?? 0),
  }

  const order: SectionKey[] = Array.isArray(version.preview_layout) && version.preview_layout.length
    ? (version.preview_layout as SectionKey[])
    : DEFAULT_SECTIONS
  const theme = version.preview_theme || 'classic'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link href={`/admin/quotes/${id}`} className="text-sm text-gray-500 hover:text-gray-700">← Quote</Link>
        <span className="text-sm font-mono text-gray-400">{quote.quote_number}</span>
      </div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Preview</h1>
      <QuoteSteps quoteId={id} versionId={version.id} active="preview" />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <div>
          <PreviewControls quoteId={id} versionId={version.id} theme={theme} order={order} />
          <Link href={`/admin/quotes/${id}/finish`}
            className="block text-center rounded-md px-4 py-2 text-sm font-medium text-white bg-olive hover:bg-olive-dk">
            Continue to Finish →
          </Link>
        </div>
        <ProposalView data={data} order={order} theme={theme} />
      </div>
    </div>
  )
}
