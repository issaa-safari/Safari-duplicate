import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { id } = await params

  // Data reads use the service-role client: quotes, quote_versions, bookings
  // and booking_travellers are RLS-locked to service_role only (group_34), so
  // the session client would silently return empty lists here.
  const admin = createAdminClient()

  const { data: client } = await admin
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const { data: requests } = await admin
    .from('requests')
    .select('*, tours(title_en)')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  // Quotes carry client_id + tour_id, but the price lives on quote_versions
  // (total_selling_usd) and the tour name on the related tour — join both.
  const { data: quotesRaw } = await admin
    .from('quotes')
    .select('id, quote_number, status, tour_id, accepted_version_id, created_at, tours(title_en, title_ar), quote_versions(id, total_selling_usd, version_number)')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const quotes = (quotesRaw ?? []).map((q: any) => {
    const versions = Array.isArray(q.quote_versions) ? q.quote_versions : []
    const accepted = versions.find((v: any) => v.id === q.accepted_version_id)
    const latest = [...versions].sort((a: any, b: any) => (b.version_number ?? 0) - (a.version_number ?? 0))[0]
    const chosen = accepted || latest
    return {
      id: q.id,
      quote_number: q.quote_number,
      status: q.status,
      created_at: q.created_at,
      tour_title: q.tours?.title_en ?? null,
      total: Number(chosen?.total_selling_usd ?? 0),
    }
  })

  // Bookings link to a client either firmly (bookings.client_id, group_27) or,
  // for legacy website bookings, by traveller email. Gather IDs from both.
  const bookingIdSet = new Set<string>()
  try {
    const { data: byClient } = await admin.from('bookings').select('id').eq('client_id', id)
    for (const b of (byClient ?? []) as { id: string }[]) bookingIdSet.add(b.id)
  } catch {
    // client_id column may not exist yet (pre group_27) — fall back to email
  }
  if (client.email) {
    const { data: travellerRows } = await admin
      .from('booking_travellers')
      .select('booking_id')
      .ilike('email', client.email)
    for (const r of (travellerRows ?? []) as { booking_id: string }[]) {
      if (r.booking_id) bookingIdSet.add(r.booking_id)
    }
  }

  let bookings: any[] = []
  if (bookingIdSet.size > 0) {
    const { data: bk } = await admin
      .from('bookings')
      .select('id, total_price_usd, status, created_at, departures(start_date, tours(title_en, title_ar)), quotes(quote_number, tours(title_en, title_ar))')
      .in('id', [...bookingIdSet])
      .order('created_at', { ascending: false })
    bookings = bk ?? []
  }

  const { data: logs } = await admin
    .from('communication_logs')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const clientName = (client.first_name + ' ' + client.last_name).trim()
  const initials = (client.first_name?.[0] ?? '?').toUpperCase()

  return (
    <div className="max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <Link href="/admin/clients" className="text-sm text-muted-foreground hover:text-foreground">
          Back to Clients
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center text-xl font-semibold text-[var(--olive-dk)] shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">{clientName}</h1>
              {client.language === 'ar' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Arabic</span>
              )}
              {client.total_bookings >= 2 && (
                <span className="text-xs bg-accent text-[var(--olive-dk)] px-2 py-0.5 rounded-full">Repeat Booker</span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">{client.email}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {client.phone && (
                <a href={`tel:${client.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition"
                  style={{ backgroundColor: 'var(--admin-bg)', color: 'var(--olive-dk)', border: '1px solid var(--olive-lt)' }}>
                  📞 {client.phone}
                </a>
              )}
              {client.whatsapp && (
                <a href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition"
                  style={{ backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}>
                  💬 WhatsApp
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition"
                  style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                  ✉ Email
                </a>
              )}
              {client.country && <span className="text-sm text-muted-foreground self-center ml-1">🌍 {client.country}</span>}
            </div>
          </div>
          <div className="text-right text-sm shrink-0">
            <p className="text-2xl font-semibold text-foreground">
              ${Number(client.total_spent_usd ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total spent</p>
            <p className="text-lg font-medium text-foreground mt-2">{client.total_bookings ?? 0}</p>
            <p className="text-xs text-muted-foreground">Bookings</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface shadow-sm p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Contact Details</h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-foreground">{client.email}</p>
              </div>
              {client.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <a href={`tel:${client.phone}`} className="text-[var(--olive-dk)] hover:underline text-sm">{client.phone}</a>
                </div>
              )}
              {client.whatsapp && (
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <a href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[var(--olive-dk)] hover:underline text-sm">{client.whatsapp}</a>
                </div>
              )}
              {client.country && (
                <div>
                  <p className="text-xs text-muted-foreground">Country</p>
                  <p className="text-foreground">{client.country}</p>
                </div>
              )}
              {client.language && (
                <div>
                  <p className="text-xs text-muted-foreground">Language</p>
                  <p className="text-foreground">{client.language === 'ar' ? 'Arabic' : 'English'}</p>
                </div>
              )}
              {client.source && (
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="text-foreground capitalize">{client.source}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Client since</p>
                <p className="text-foreground">
                  {new Date(client.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {client.notes && (
            <div className="rounded-xl border border-warning-foreground/20 bg-warning/50 p-4">
              <h2 className="text-sm font-semibold text-warning-foreground mb-2">Notes</h2>
              <p className="text-sm text-warning-foreground">{client.notes}</p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface shadow-sm p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/admin/requests/new?client=${client.id}`}
                className="block w-full rounded-md px-3 py-2 text-sm font-medium text-white text-center bg-olive hover:bg-olive-dk">
                + New Request
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-surface shadow-sm p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Requests
              <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {requests?.length ?? 0}
              </span>
            </h2>
            {requests && requests.length > 0 ? (
              <div className="space-y-2">
                {requests.map((req: any) => (
                  <Link key={req.id} href={"/admin/requests/" + req.id}
                    className="flex items-center justify-between p-3 rounded-md border border-border/70 hover:border-primary-strong hover:bg-muted transition">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {req.tours?.title_en ?? 'No tour selected'}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{req.reference}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {req.stage.replace('_', ' ')}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(req.created_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No requests yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface shadow-sm p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Quotes
              <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {quotes?.length ?? 0}
              </span>
            </h2>
            {quotes && quotes.length > 0 ? (
              <div className="space-y-2">
                {quotes.map((quote) => (
                  <Link key={quote.id} href={"/admin/quotes/" + quote.id}
                    className="flex items-center justify-between p-3 rounded-md border border-border/70 hover:border-primary-strong hover:bg-muted transition">
                    <div>
                      <p className="text-sm font-medium text-foreground">{quote.tour_title ?? 'Custom quote'}</p>
                      <p className="text-xs text-muted-foreground font-mono">{quote.quote_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        ${quote.total.toLocaleString()}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                        {quote.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No quotes yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface shadow-sm p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Bookings
              <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {bookings?.length ?? 0}
              </span>
            </h2>
            {bookings && bookings.length > 0 ? (
              <div className="space-y-2">
                {bookings.map((booking: any) => (
                  <Link key={booking.id} href={"/admin/bookings/" + booking.id}
                    className="flex items-center justify-between p-3 rounded-md border border-border/70 hover:border-primary-strong hover:bg-muted transition">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {booking.departures?.tours?.title_en ?? booking.quotes?.tours?.title_en ?? 'Tour'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.departures?.start_date
                          ? new Date(booking.departures.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : new Date(booking.created_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        ${Number(booking.total_price_usd ?? 0).toLocaleString()}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                        {booking.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No bookings yet.</p>
            )}
          </div>

          {logs && logs.length > 0 && (
            <div className="rounded-xl border border-border bg-surface shadow-sm p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">
                Recent Communication
                <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {logs.length}
                </span>
              </h2>
              <div className="space-y-3">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <span className="shrink-0">
                      {log.type === 'whatsapp' ? 'WhatsApp' :
                       log.type === 'call' ? 'Call' :
                       log.type === 'email' ? 'Email' :
                       log.type === 'meeting' ? 'Meeting' : 'Note'}
                    </span>
                    <div>
                      <p className="text-foreground">{log.summary}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(log.created_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}