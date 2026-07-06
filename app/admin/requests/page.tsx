import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/admin/status-badge'

const SORTS: Record<string, { label: string; column: string; ascending: boolean }> = {
  recent:   { label: 'Newest first',      column: 'created_at',        ascending: false },
  received: { label: 'Date received',      column: 'date_received',     ascending: false },
  activity: { label: 'Last activity',      column: 'status_changed_at', ascending: false },
  value:    { label: 'Booking value',      column: 'total_booking_value', ascending: false },
}

const STAGES = [
  { key: 'new',        label: 'New' },
  { key: 'working_on', label: 'Working On' },
  { key: 'open',       label: 'Open' },
  { key: 'pre_booked', label: 'Pre-Booked' },
  { key: 'booked',     label: 'Booked' },
  { key: 'completed',  label: 'Completed' },
  { key: 'not_booked', label: 'Not Booked' },
  { key: 'archived',   label: 'Archive' },
]

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; handled_by?: string; sort?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const params = await searchParams
  const activeStage = params.stage ?? 'new'
  const handledBy = params.handled_by ?? ''
  const sortKey = SORTS[params.sort ?? ''] ? params.sort! : 'recent'
  const sort = SORTS[sortKey]

  const { data: allRequests } = await supabase.from('requests').select('stage')
  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s.key] = (allRequests ?? []).filter(r => r.stage === s.key).length
    return acc
  }, {} as Record<string, number>)

  const { data: agents } = await admin
    .from('admin_users').select('id, full_name, email').eq('is_active', true).order('full_name')

  let query = admin
    .from('requests')
    .select('*, clients (first_name, last_name, email), tours (title_en), admin_users:handled_by (full_name, email)')
    .eq('stage', activeStage)
  if (handledBy) query = query.eq('handled_by', handledBy)
  const { data: requests } = await query.order(sort.column, { ascending: sort.ascending, nullsFirst: false })

  function withParams(patch: Record<string, string>) {
    const sp = new URLSearchParams({ stage: activeStage })
    if (handledBy) sp.set('handled_by', handledBy)
    if (sortKey !== 'recent') sp.set('sort', sortKey)
    for (const [k, v] of Object.entries(patch)) { if (v) sp.set(k, v); else sp.delete(k) }
    return `/admin/requests?${sp.toString()}`
  }

  return (
    <div className="flex flex-1 min-h-screen">
      <div className="w-48 bg-white border-r border-gray-200 p-3 flex flex-col gap-1">
        <Link href="/admin/requests/new"
          className="mb-3 rounded-md px-3 py-2 text-sm font-medium text-white text-center bg-olive hover:bg-olive-dk">
          + New Request
        </Link>
        {STAGES.map((stage) => (
          <Link key={stage.key}
            href={"/admin/requests?stage=" + stage.key}
            className={"flex items-center justify-between rounded-md px-3 py-2 text-sm transition " +
              (activeStage === stage.key
                ? 'bg-[var(--olive)]/10 text-[var(--olive-dk)] font-medium'
                : 'text-gray-600 hover:bg-gray-50')}>
            <span>{stage.label}</span>
            <span className={"text-xs font-medium px-2 py-0.5 rounded-full " +
              (activeStage === stage.key
                ? 'bg-[var(--olive)] text-white'
                : 'bg-gray-100 text-gray-600')}>
              {stageCounts[stage.key] ?? 0}
            </span>
          </Link>
        ))}
      </div>

      <div className="flex-1 p-6">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h1 className="text-lg font-semibold text-gray-900">
            {STAGES.find(s => s.key === activeStage)?.label} Requests
          </h1>
          <form method="get" className="flex items-center gap-2">
            <input type="hidden" name="stage" value={activeStage} />
            <select name="handled_by" defaultValue={handledBy}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-700 bg-white">
              <option value="">All handlers</option>
              {(agents ?? []).map(a => (
                <option key={a.id} value={a.id}>{a.full_name || a.email}</option>
              ))}
            </select>
            <select name="sort" defaultValue={sortKey}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-700 bg-white">
              {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
            <button type="submit" className="rounded-md bg-olive px-3 py-1.5 text-xs font-medium text-white hover:bg-olive-dk">
              Apply
            </button>
            {(handledBy || sortKey !== 'recent') && (
              <Link href={`/admin/requests?stage=${activeStage}`} className="text-xs text-gray-400 hover:text-gray-600">Clear</Link>
            )}
          </form>
        </div>
        {!requests || requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-400 text-sm">No requests in this stage.</p>
            <Link href="/admin/requests/new"
              className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-white bg-olive hover:bg-olive-dk">
              + Add First Request
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req: any) => {
              const client = req.clients
              const tour = req.tours
              const clientName = client
                ? (client.first_name + ' ' + client.last_name).trim()
                : 'Unknown'
              return (
                <Link key={req.id}
                  href={"/admin/requests/" + req.id}
                  className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-[var(--olive)] hover:shadow-sm transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400 font-mono">{req.reference}</span>
                        {req.priority && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Priority</span>
                        )}
                        {req.stage && <StatusBadge status={req.stage} />}
                      </div>
                      <p className="font-medium text-gray-900">{clientName}</p>
                      {tour && <p className="text-sm text-gray-500 mt-0.5">{tour.title_en}</p>}
                      {req.client_question && (
                        <p className="text-sm text-gray-400 mt-1 truncate">{req.client_question}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-400 shrink-0">
                      <p>{req.travelers_adults} adults</p>
                      {req.admin_users && (
                        <p className="mt-1 text-gray-500">{(req.admin_users as any).full_name || (req.admin_users as any).email}</p>
                      )}
                      <p className="mt-1">{new Date(req.created_at).toLocaleDateString('en-GB')}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}