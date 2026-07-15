import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type ActivityRow = {
  id: string
  actor_email: string | null
  entity_type: string
  entity_id: string | null
  action: string
  summary: string | null
  created_at: string
}

const ENTITY_HREF: Record<string, (id: string) => string> = {
  quote: (id) => `/admin/quotes/${id}`,
  request: (id) => `/admin/requests/${id}`,
  booking: (id) => `/admin/bookings/${id}`,
}

function fmtWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data } = await admin
    .from('activity_log')
    .select('id, actor_email, entity_type, entity_id, action, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = (data ?? []) as ActivityRow[]

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground mb-1">Activity Log</h1>
      <p className="text-sm text-muted-foreground mb-6">
        A history of key changes across requests, quotes, and bookings — who did what, and when.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No activity recorded yet. Actions like quote status changes, share links, emails, and request
          stage moves will appear here.
        </div>
      ) : (
        <ol className="relative border-l border-border ml-2">
          {rows.map((r) => {
            const href = r.entity_id && ENTITY_HREF[r.entity_type] ? ENTITY_HREF[r.entity_type](r.entity_id) : null
            return (
              <li key={r.id} className="mb-5 ml-4">
                <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-surface bg-olive" />
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium text-foreground">{r.summary ?? r.action}</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{r.entity_type}</span>
                  {href && (
                    <Link href={href} className="text-xs text-primary-strong underline">view</Link>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {fmtWhen(r.created_at)}
                  {r.actor_email ? ` · ${r.actor_email}` : ''}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
