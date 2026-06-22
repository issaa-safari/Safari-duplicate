import { createClient } from '@/lib/supabase/server'
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

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const { data: requests } = await supabase
    .from('requests')
    .select('*, tours(title_en)')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const { data: quotes } = await supabase
    .from('quotes')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, tours(title_en)')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const { data: logs } = await supabase
    .from('communication_logs')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const clientName = (client.first_name + ' ' + client.last_name).trim()
  const initials = (client.first_name?.[0] ?? '?').toUpperCase()

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <Link href="/admin/clients" className="text-sm text-gray-500 hover:text-gray-700">
          Back to Clients
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-[#7A9A4A]/10 flex items-center justify-center text-xl font-semibold text-[#4C5E2A] shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-gray-900">{clientName}</h1>
              {client.language === 'ar' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Arabic</span>
              )}
              {client.total_bookings >= 2 && (
                <span className="text-xs bg-[#7A9A4A]/10 text-[#4C5E2A] px-2 py-0.5 rounded-full">Repeat Booker</span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-1">{client.email}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              {client.phone && <span className="text-gray-600">Phone: {client.phone}</span>}
              {client.whatsapp && <span className="text-gray-600">WhatsApp: {client.whatsapp}</span>}
              {client.country && <span className="text-gray-600">Country: {client.country}</span>}
            </div>
          </div>
          <div className="text-right text-sm shrink-0">
            <p className="text-2xl font-semibold text-gray-900">
              ${Number(client.total_spent_usd ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">Total spent</p>
            <p className="text-lg font-medium text-gray-700 mt-2">{client.total_bookings ?? 0}</p>
            <p className="text-xs text-gray-400">Bookings</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Contact Details</h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-gray-700">{client.email}</p>
              </div>
              {client.phone && (
                <div>
                  <p className="text-xs text-gray-400">Phone</p>
                  <p className="text-gray-700">{client.phone}</p>
                </div>
              )}
              {client.whatsapp && (
                <div>
                  <p className="text-xs text-gray-400">WhatsApp</p>
                  <p className="text-gray-700">{client.whatsapp}</p>
                </div>
              )}
              {client.country && (
                <div>
                  <p className="text-xs text-gray-400">Country</p>
                  <p className="text-gray-700">{client.country}</p>
                </div>
              )}
              {client.language && (
                <div>
                  <p className="text-xs text-gray-400">Language</p>
                  <p className="text-gray-700">{client.language === 'ar' ? 'Arabic' : 'English'}</p>
                </div>
              )}
              {client.source && (
                <div>
                  <p className="text-xs text-gray-400">Source</p>
                  <p className="text-gray-700 capitalize">{client.source}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Client since</p>
                <p className="text-gray-700">
                  {new Date(client.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {client.notes && (
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
              <h2 className="text-sm font-semibold text-amber-800 mb-2">Notes</h2>
              <p className="text-sm text-amber-700">{client.notes}</p>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href="/admin/requests/new"
                className="block w-full rounded-md px-3 py-2 text-sm font-medium text-white text-center"
                style={{ backgroundColor: '#7A9A4A' }}>
                + New Request
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Requests
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {requests?.length ?? 0}
              </span>
            </h2>
            {requests && requests.length > 0 ? (
              <div className="space-y-2">
                {requests.map((req: any) => (
                  <Link key={req.id} href={"/admin/requests/" + req.id}
                    className="flex items-center justify-between p-3 rounded-md border border-gray-100 hover:border-[#7A9A4A] hover:bg-gray-50 transition">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {req.tours?.title_en ?? 'No tour selected'}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">{req.reference}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {req.stage.replace('_', ' ')}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(req.created_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No requests yet.</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Quotes
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {quotes?.length ?? 0}
              </span>
            </h2>
            {quotes && quotes.length > 0 ? (
              <div className="space-y-2">
                {quotes.map((quote: any) => (
                  <div key={quote.id}
                    className="flex items-center justify-between p-3 rounded-md border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{quote.tour_title ?? 'Quote'}</p>
                      <p className="text-xs text-gray-400 font-mono">{quote.reference}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ${Number(quote.total_price_usd ?? 0).toLocaleString()}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {quote.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No quotes yet.</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Bookings
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {bookings?.length ?? 0}
              </span>
            </h2>
            {bookings && bookings.length > 0 ? (
              <div className="space-y-2">
                {bookings.map((booking: any) => (
                  <div key={booking.id}
                    className="flex items-center justify-between p-3 rounded-md border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {booking.tours?.title_en ?? 'Tour'}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">{booking.reference}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ${Number(booking.total_price_usd ?? 0).toLocaleString()}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No bookings yet.</p>
            )}
          </div>

          {logs && logs.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Recent Communication
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
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
                      <p className="text-gray-700">{log.summary}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
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