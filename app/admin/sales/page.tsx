import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle, ArrowRight, FilePenLine, MessageSquareText, Plus, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, PageShell } from '@/components/admin/ui/page'
import { Card, CardBody, CardHeader, StatCard } from '@/components/admin/ui/card'
import { ButtonLink } from '@/components/ui/button'
import StatusBadge from '@/components/admin/status-badge'

type ClientRelation = {
  first_name: string | null
  last_name: string | null
  email: string | null
}

type RequestRow = {
  id: string
  reference: string | null
  stage: string
  priority: boolean | null
  created_at: string
  clients: ClientRelation | ClientRelation[] | null
  quotes: Array<{ id: string; status: string }> | null
}

type QuoteVersion = {
  id: string
  version_number: number
  title: string | null
  total_selling_usd: number | null
  valid_until: string | null
}

type QuoteRow = {
  id: string
  quote_number: string
  status: string
  updated_at: string
  clients: ClientRelation | ClientRelation[] | null
  quote_versions: QuoteVersion[] | null
}

type FailedIntake = {
  id: string
  channel: string
  error_message: string | null
  attempts: number
  received_at: string
}

function one<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? (relation[0] ?? null) : relation
}

function clientName(relation: ClientRelation | ClientRelation[] | null) {
  const client = one(relation)
  return `${client?.first_name ?? ''} ${client?.last_name ?? ''}`.trim() || client?.email || 'Unnamed client'
}

function latestVersion(quote: QuoteRow) {
  return [...(quote.quote_versions ?? [])].sort((a, b) => b.version_number - a.version_number)[0] ?? null
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
}

export default async function SalesDeskPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const [{ data: requestRows }, { data: quoteRows }, { data: failedIntakeRows }] = await Promise.all([
    admin
      .from('requests')
      .select('id, reference, stage, priority, created_at, clients ( first_name, last_name, email ), quotes ( id, status )')
      .is('archived_at', null)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('quotes')
      .select('id, quote_number, status, updated_at, clients ( first_name, last_name, email ), quote_versions!quote_versions_quote_id_fkey ( id, version_number, title, total_selling_usd, valid_until )')
      .or('is_template.is.null,is_template.eq.false')
      .order('updated_at', { ascending: false })
      .limit(100),
    admin
      .from('intake_events')
      .select('id, channel, error_message, attempts, received_at')
      .eq('status', 'failed')
      .order('received_at', { ascending: false })
      .limit(10),
  ])

  const requests = (requestRows ?? []) as unknown as RequestRow[]
  const quotes = (quoteRows ?? []) as unknown as QuoteRow[]
  const needsProposal = requests.filter(request =>
    !['booked', 'completed', 'not_booked'].includes(request.stage)
    && !(request.quotes ?? []).some(quote => !['cancelled', 'declined', 'expired'].includes(quote.status)),
  )
  const drafts = quotes.filter(quote => ['draft', 'ready'].includes(quote.status))
  const followUps = quotes.filter(quote => ['sent', 'viewed'].includes(quote.status))
  const accepted = quotes.filter(quote => quote.status === 'accepted')
  const failedIntakes = (failedIntakeRows ?? []) as FailedIntake[]

  return (
    <PageShell>
      <PageHeader
        title="Sales Desk"
        subtitle="Create requests and proposals quickly, then work the next commercial action from one place."
        actions={(
          <>
            <ButtonLink href="/admin/quotes/new" size="sm">Proposal only</ButtonLink>
            <ButtonLink href="/admin/requests/new" variant="primary" size="sm">
              <Plus size={14} /> New request &amp; proposal
            </ButtonLink>
          </>
        )}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Needs proposal" value={needsProposal.length} sub="Unquoted live requests" tone="negative" href="/admin/requests" />
        <StatCard label="Draft proposals" value={drafts.length} sub="Build or price next" tone="brand" href="/admin/quotes?status=draft" />
        <StatCard label="Client follow-up" value={followUps.length} sub="Sent or viewed" tone="brand" href="/admin/quotes?status=sent" />
        <StatCard label="Accepted" value={accepted.length} sub="Handoff to Operations" tone="positive" href="/admin/quotes?status=accepted" />
      </div>

      {failedIntakes.length > 0 && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-700" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{failedIntakes.length} enquiry intake event{failedIntakes.length === 1 ? '' : 's'} need attention</p>
              <p className="mt-1 text-xs text-red-800">No partial request or proposal was created. The source event is retained safely for diagnosis and retry.</p>
              <ul className="mt-3 space-y-1 text-xs">
                {failedIntakes.slice(0, 3).map(event => (
                  <li key={event.id} className="flex flex-wrap gap-x-2">
                    <span className="font-medium">{event.channel.replaceAll('_', ' ')}</span>
                    <span>{new Date(event.received_at).toLocaleString('en-GB')}</span>
                    <span>attempt {event.attempts}</span>
                    {event.error_message && <span className="truncate text-red-700">{event.error_message}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><AlertCircle size={16} className="text-amber-700" /> Requests needing proposals</span>}
            action={<Link href="/admin/requests" className="text-xs font-medium text-brand-text hover:underline">All requests</Link>}
          />
          <CardBody className="divide-y divide-border/70 py-0">
            {needsProposal.length === 0 ? <Empty>Every live request has a proposal.</Empty> : needsProposal.slice(0, 7).map(request => (
              <div key={request.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{clientName(request.clients)}</p>
                    {request.priority && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Priority</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{request.reference ?? 'Request'} · {request.stage.replaceAll('_', ' ')}</p>
                </div>
                <Link href={`/admin/quotes/new?request=${request.id}`} className="shrink-0 rounded-lg bg-primary-strong px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-strong-hover">
                  Create proposal
                </Link>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><FilePenLine size={16} className="text-brand-text" /> Build &amp; price</span>}
            action={<Link href="/admin/quotes?status=draft" className="text-xs font-medium text-brand-text hover:underline">All drafts</Link>}
          />
          <CardBody className="divide-y divide-border/70 py-0">
            {drafts.length === 0 ? <Empty>No draft proposals.</Empty> : drafts.slice(0, 7).map(quote => {
              const version = latestVersion(quote)
              return (
                <Link key={quote.id} href={`/admin/quotes/${quote.id}?step=pricing`} className="flex items-center gap-3 py-3 hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{version?.title || clientName(quote.clients)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {quote.quote_number} · {Number(version?.total_selling_usd ?? 0) > 0 ? `$${Number(version?.total_selling_usd).toLocaleString()}` : 'Pricing required'}
                    </p>
                  </div>
                  <StatusBadge status={quote.status} />
                  <ArrowRight size={14} className="shrink-0 text-muted-foreground" />
                </Link>
              )
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><MessageSquareText size={16} className="text-blue-700" /> Follow up</span>}
            action={<Link href="/admin/quotes?status=sent" className="text-xs font-medium text-brand-text hover:underline">All sent</Link>}
          />
          <CardBody className="divide-y divide-border/70 py-0">
            {followUps.length === 0 ? <Empty>No proposals need follow-up.</Empty> : followUps.slice(0, 7).map(quote => {
              const version = latestVersion(quote)
              return (
                <Link key={quote.id} href={`/admin/quotes/${quote.id}?step=review`} className="flex items-center gap-3 py-3 hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{clientName(quote.clients)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {quote.quote_number}{version?.valid_until ? ` · valid to ${new Date(version.valid_until).toLocaleDateString('en-GB')}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={quote.status} />
                  <Send size={14} className="shrink-0 text-muted-foreground" />
                </Link>
              )
            })}
          </CardBody>
        </Card>
      </div>
    </PageShell>
  )
}
