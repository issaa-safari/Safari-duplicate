import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle, ArrowRight, CheckCircle2, FilePenLine, MessageSquareText, Plus, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader, PageShell } from '@/components/admin/ui/page'
import { Card, CardBody, CardHeader, StatCard } from '@/components/admin/ui/card'
import { ButtonLink } from '@/components/ui/button'
import StatusBadge from '@/components/admin/status-badge'
import FailedIntakeList, { type FailedIntakeRow } from './failed-intake-list'

type ClientRelation = {
  first_name: string | null
  last_name: string | null
  email: string | null
}

type RequestRow = {
  id: string
  reference: string | null
  stage: string
  priority: string | null
  created_at: string
  next_action: string | null
  next_action_due_at: string | null
  admin_users: TeamRelation | TeamRelation[] | null
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
  departure_id: string | null
  next_action: string | null
  next_action_due_at: string | null
  admin_users: TeamRelation | TeamRelation[] | null
  clients: ClientRelation | ClientRelation[] | null
  quote_versions: QuoteVersion[] | null
}

type TeamRelation = {
  full_name: string | null
  email: string
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

function workflowLine(
  ownerRelation: TeamRelation | TeamRelation[] | null,
  nextAction: string | null,
  dueAt: string | null,
) {
  const owner = one(ownerRelation)
  const ownerName = owner?.full_name || owner?.email || 'Unassigned'
  const due = dueAt ? new Date(dueAt) : null
  const overdue = !!due && due.getTime() < Date.now()
  const action = nextAction || 'Set next action'
  return { ownerName, action, due, overdue }
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
      .select('id, reference, stage, priority, created_at, next_action, next_action_due_at, clients ( first_name, last_name, email ), admin_users!requests_handled_by_fkey ( full_name, email ), quotes ( id, status )')
      .is('archived_at', null)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('quotes')
      .select('id, quote_number, status, updated_at, departure_id, next_action, next_action_due_at, clients ( first_name, last_name, email ), admin_users!quotes_owner_id_fkey ( full_name, email ), quote_versions!quote_versions_quote_id_fkey ( id, version_number, title, total_selling_usd, valid_until )')
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
  const failedIntakes = (failedIntakeRows ?? []) as FailedIntakeRow[]

  return (
    <PageShell>
      <PageHeader
        title="Sales Desk"
        subtitle="Create requests and proposals quickly from one place."
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
              <FailedIntakeList events={failedIntakes} />
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-2 2xl:grid-cols-4">
        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><AlertCircle size={16} className="text-amber-700" /> Requests needing proposals</span>}
            action={<Link href="/admin/requests" className="text-xs font-medium text-brand-text hover:underline">All requests</Link>}
          />
          <CardBody className="divide-y divide-border/70 py-0">
            {needsProposal.length === 0 ? <Empty>Every live request has a proposal.</Empty> : needsProposal.slice(0, 7).map(request => {
              const workflow = workflowLine(request.admin_users, request.next_action, request.next_action_due_at)
              return <div key={request.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{clientName(request.clients)}</p>
                    {request.priority && request.priority !== 'normal' && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold capitalize text-amber-800">{request.priority}</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{request.reference ?? 'Request'} · {request.stage.replaceAll('_', ' ')}</p>
                  <p className={`mt-1 truncate text-[11px] ${workflow.overdue ? 'font-medium text-red-700' : 'text-muted-foreground'}`}>
                    {workflow.ownerName} · {workflow.action}{workflow.due ? ` · ${workflow.due.toLocaleDateString('en-GB')}` : ''}
                  </p>
                </div>
                <Link href={`/admin/quotes/new?request=${request.id}`} className="shrink-0 rounded-lg bg-primary-strong px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-strong-hover">
                  Create proposal
                </Link>
              </div>
            })}
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
              const workflow = workflowLine(quote.admin_users, quote.next_action, quote.next_action_due_at)
              return (
                <Link key={quote.id} href={`/admin/quotes/${quote.id}?step=pricing`} className="flex items-center gap-3 py-3 hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{version?.title || clientName(quote.clients)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {quote.quote_number} · {Number(version?.total_selling_usd ?? 0) > 0 ? `$${Number(version?.total_selling_usd).toLocaleString()}` : 'Pricing required'}
                    </p>
                    <p className={`mt-1 truncate text-[11px] ${workflow.overdue ? 'font-medium text-red-700' : 'text-muted-foreground'}`}>{workflow.ownerName} · {workflow.action}</p>
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
              const workflow = workflowLine(quote.admin_users, quote.next_action, quote.next_action_due_at)
              return (
                <Link key={quote.id} href={`/admin/quotes/${quote.id}?step=review`} className="flex items-center gap-3 py-3 hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{clientName(quote.clients)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {quote.quote_number}{version?.valid_until ? ` · valid to ${new Date(version.valid_until).toLocaleDateString('en-GB')}` : ''}
                    </p>
                    <p className={`mt-1 truncate text-[11px] ${workflow.overdue ? 'font-medium text-red-700' : 'text-muted-foreground'}`}>{workflow.ownerName} · {workflow.action}</p>
                  </div>
                  <StatusBadge status={quote.status} />
                  <Send size={14} className="shrink-0 text-muted-foreground" />
                </Link>
              )
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-700" /> Accepted handoff</span>}
            action={<Link href="/admin/quotes?status=accepted" className="text-xs font-medium text-brand-text hover:underline">All accepted</Link>}
          />
          <CardBody className="divide-y divide-border/70 py-0">
            {accepted.length === 0 ? <Empty>No accepted proposals.</Empty> : accepted.slice(0, 7).map(quote => {
              const version = latestVersion(quote)
              return (
                <Link key={quote.id} href={quote.departure_id ? `/admin/departures/${quote.departure_id}` : `/admin/quotes/${quote.id}`} className="flex items-center gap-3 py-3 hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{version?.title || clientName(quote.clients)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{quote.quote_number} · {quote.departure_id ? 'Trip workspace ready' : 'Handoff needs review'}</p>
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-muted-foreground" />
                </Link>
              )
            })}
          </CardBody>
        </Card>
      </div>
    </PageShell>
  )
}
