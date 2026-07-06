import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import QuoteSteps from '../quote-steps'
import FinishForm from './finish-form'

export default async function FinishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: quote } = await admin
    .from('quotes').select('id, quote_number, client_id').eq('id', id).single()
  if (!quote) notFound()

  const [{ data: client }, { data: versions }, { data: settings }, { data: agents }] = await Promise.all([
    admin.from('clients').select('email, first_name, last_name').eq('id', quote.client_id).single(),
    admin.from('quote_versions').select('id, version_number, title, status').eq('quote_id', id).order('version_number', { ascending: false }),
    admin.from('company_settings').select('email, company_name').limit(1).single(),
    admin.from('admin_users').select('full_name, email').eq('is_active', true).order('full_name'),
  ])

  const latest = (versions ?? [])[0]
  if (!latest) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <QuoteSteps quoteId={id} versionId={null} active="finish" />
        <p className="text-sm text-gray-500">This quote has no version to send yet. Build the itinerary first.</p>
      </div>
    )
  }

  const senders = [
    ...(agents ?? []).map(a => ({ email: a.email, label: `${a.full_name || a.email}` })),
    ...(settings?.email ? [{ email: settings.email, label: `${settings.company_name} (${settings.email})` }] : []),
  ].filter((s, i, arr) => s.email && arr.findIndex(x => x.email === s.email) === i)

  const clientName = client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() : ''
  const defaultSubject = `Your safari proposal${clientName ? `, ${clientName}` : ''} — ${quote.quote_number}`

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Link href={`/admin/quotes/${id}`} className="text-sm text-gray-500 hover:text-gray-700">← Quote</Link>
        <span className="text-sm font-mono text-gray-400">{quote.quote_number}</span>
      </div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Finish &amp; share</h1>
      <QuoteSteps quoteId={id} versionId={latest.id} active="finish" />

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <FinishForm
          quoteId={id}
          versionId={latest.id}
          recipientDefault={client?.email ?? ''}
          senders={senders.length ? senders : [{ email: '', label: 'No sender configured' }]}
          defaultSubject={defaultSubject}
        />
      </div>
    </div>
  )
}
