import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/admin/status-badge'

const STAGES = [
  { key: 'new',        label: 'New',        color: 'var(--status-new)' },
  { key: 'working_on', label: 'Working On', color: 'var(--status-working)' },
  { key: 'open',       label: 'Open',       color: 'var(--status-open)' },
  { key: 'pre_booked', label: 'Pre-Booked', color: 'var(--status-prebooked)' },
  { key: 'booked',     label: 'Booked',     color: 'var(--status-booked)' },
  { key: 'completed',  label: 'Completed',  color: 'var(--status-completed)' },
  { key: 'not_booked', label: 'Not Booked', color: 'var(--status-notbooked)' },
  { key: 'archived',   label: 'Archive',    color: 'var(--status-archive)' },
]

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const params = await searchParams
  const activeStage = params.stage ?? 'new'

  const { data: allRequests } = await supabase.from('requests').select('stage')
  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s.key] = (allRequests ?? []).filter(r => r.stage === s.key).length
    return acc
  }, {} as Record<string, number>)

  const { data: requests } = await supabase
    .from('requests')
    .select('*, clients (first_name, last_name, email), tours (title_en)')
    .eq('stage', activeStage)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-1 min-h-screen">
      <div className="w-48 bg-surface border-r border-border p-3 flex flex-col gap-1">
        <Link href="/admin/requests/new"
          className="mb-3 rounded-md px-3 py-2 text-sm font-medium text-white text-center bg-olive hover:bg-olive-dk">
          + New Request
        </Link>
        {STAGES.map((stage) => (
          <Link key={stage.key}
            href={"/admin/requests?stage=" + stage.key}
            className={"flex items-center justify-between rounded-md px-3 py-2 text-sm transition " +
              (activeStage === stage.key
                ? 'font-medium'
                : 'text-gray-600 hover:bg-gray-50')}
            style={activeStage === stage.key
              ? {
                  backgroundColor: `color-mix(in oklab, ${stage.color} 12%, transparent)`,
                  color: `color-mix(in oklab, ${stage.color} 65%, black)`,
                }
              : undefined}>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
              {stage.label}
            </span>
            <span className={"text-xs font-medium px-2 py-0.5 rounded-full " +
              (activeStage === stage.key ? '' : 'bg-gray-100 text-gray-600')}
              style={activeStage === stage.key
                ? {
                    backgroundColor: `color-mix(in oklab, ${stage.color} 22%, white)`,
                    color: `color-mix(in oklab, ${stage.color} 70%, black)`,
                  }
                : undefined}>
              {stageCounts[stage.key] ?? 0}
            </span>
          </Link>
        ))}
      </div>

      <div className="flex-1 p-6">
        <h1 className="text-2xl font-semibold text-brand-ink mb-4">
          {STAGES.find(s => s.key === activeStage)?.label} Requests
        </h1>
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
                  className="block bg-surface rounded-xl border border-border p-4 hover:border-[var(--olive)] hover:shadow-sm transition">
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