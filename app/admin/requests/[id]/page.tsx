import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/admin/status-badge'
import StageSelector from './stage-selector'
import CommunicationLog from './communication-log'
import TaskManager from './task-manager'
import StartFromTemplate from './start-from-template'
import FlightsManager from './flights-manager'
import AssignmentManager from './assignment-manager'

const STAGES = [
  { key: 'new', label: 'New' },
  { key: 'working_on', label: 'Working On' },
  { key: 'open', label: 'Open' },
  { key: 'pre_booked', label: 'Pre-Booked' },
  { key: 'booked', label: 'Booked' },
  { key: 'completed', label: 'Completed' },
  { key: 'not_booked', label: 'Not Booked' },
  { key: 'archived', label: 'Archived' },
]

const STATUS_ORDER = ['draft','ready','sent','viewed','accepted','declined','expired','superseded','cancelled']

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab = tab ?? 'info'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  const [
    { data: request },
    { data: logs },
    { data: tasks },
    { data: quotesData },
    { data: templateData },
    { data: flightData },
    { data: staffAssignData },
    { data: vehicleAssignData },
    { data: staffOptions },
    { data: vehicleOptions },
  ] = await Promise.all([
    supabase.from('requests')
      .select('*, clients (*), tours (id, title_en, type)')
      .eq('id', id).single(),
    admin.from('communication_logs')
      .select('*').eq('request_id', id).order('created_at', { ascending: false }),
    admin.from('tasks')
      .select('*').eq('request_id', id).order('created_at', { ascending: false }),
    admin.from('quotes')
      .select(`
        id, quote_number, status, mode, created_at,
        tours (title_en),
        quote_versions (id, version_number, status, title, travel_start_date, travel_end_date)
      `)
      .eq('request_id', id)
      .order('created_at', { ascending: true }),
    admin.from('quotes')
      .select('id, quote_number, quote_versions (title, version_number)')
      .eq('is_template', true)
      .order('created_at', { ascending: false }),
    admin.from('request_flights')
      .select('*').eq('request_id', id).order('scheduled_at', { ascending: true }),
    admin.from('request_staff_assignments')
      .select('id, role, notes, tour_staff (id, name, role)').eq('request_id', id),
    admin.from('request_vehicle_assignments')
      .select('id, seats_used, notes, vehicles (id, name, type, seats)').eq('request_id', id),
    admin.from('tour_staff').select('id, name, role').eq('is_active', true).order('name'),
    admin.from('vehicles').select('id, name, type, seats').eq('is_active', true).order('name'),
  ])

  const templateOptions = (templateData ?? []).map((t: any) => {
    const latest = (t.quote_versions ?? []).sort((a: any, b: any) => b.version_number - a.version_number)[0]
    return { id: t.id, label: `${latest?.title || 'Untitled'} · ${t.quote_number}` }
  })

  if (!request) notFound()

  const client = request.clients as any
  const linkedTour = request.tours as any
  const clientName = client
    ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()
    : 'Unknown Client'

  const notes = (logs ?? []).filter((l: any) => l.type === 'note')
  const commLogs = (logs ?? []).filter((l: any) => l.type !== 'note')
  const openTasks = (tasks ?? []).filter((t: any) => !t.is_done)
  const quotes = quotesData ?? []

  // Flatten all quote versions for grouping
  const allVersions: { quote: any; version: any }[] = []
  for (const q of quotes) {
    const versions = (q.quote_versions as any[]) ?? []
    for (const v of versions) allVersions.push({ quote: q, version: v })
  }
  const byStatus: Record<string, typeof allVersions> = {}
  for (const item of allVersions) {
    const s = item.version.status
    if (!byStatus[s]) byStatus[s] = []
    byStatus[s].push(item)
  }

  const flights = flightData ?? []
  const staffAssignments = staffAssignData ?? []
  const vehicleAssignments = vehicleAssignData ?? []
  const logisticsCount = flights.length + staffAssignments.length + vehicleAssignments.length

  const TABS = [
    { key: 'info',      label: 'Request Information', count: null },
    { key: 'quotes',    label: 'Quotes',               count: allVersions.length },
    { key: 'tour',      label: 'Tour Information',     count: null },
    { key: 'logistics', label: 'Logistics',            count: logisticsCount },
    { key: 'tasks',     label: 'Tasks',                count: openTasks.length },
    { key: 'notes',     label: 'Notes',               count: notes.length },
  ]

  const handledBy = user.email?.split('@')[0] ?? 'Admin'

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/admin/requests" className="text-xs text-gray-400 hover:text-gray-600">
            ← Back
          </Link>
          <div className="flex items-start justify-between gap-4 mt-2 mb-3">
            <div>
              <h1 className="text-base font-semibold text-gray-900">
                Request from <span className="text-[var(--olive)]">{clientName}</span>
                {request.priority && (
                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full align-middle">Priority</span>
                )}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                <span>Reference: <span className="font-mono text-gray-700">{request.reference}</span></span>
                <span>Date received:{' '}
                  {new Date(request.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
                {request.source && (
                  <span>Source: <span className="capitalize text-gray-700">{request.source}</span></span>
                )}
                <span>Handled by: <span className="text-gray-700 font-medium">{handledBy}</span></span>
              </div>
            </div>
            <Link
              href={`/admin/quotes/new?request=${id}`}
              className="shrink-0 rounded-md px-4 py-2 text-sm font-medium text-white bg-olive hover:bg-olive-dk">
              + Create Quote
            </Link>
          </div>

          <StageSelector requestId={id} currentStage={request.stage} stages={STAGES} />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(t => (
              <Link
                key={t.key}
                href={`/admin/requests/${id}?tab=${t.key}`}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  activeTab === t.key
                    ? 'border-[var(--olive)] text-[var(--olive)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {t.label}
                {t.count !== null && (
                  <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                    activeTab === t.key
                      ? 'bg-[var(--olive)]/10 text-[var(--olive)]'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {t.count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* ── REQUEST INFORMATION ────────────────────────────────────── */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-900">Client</h2>
                  {client && (
                    <Link href={`/admin/clients/${client.id}`}
                      className="text-xs text-[var(--olive)] hover:underline">
                      View profile
                    </Link>
                  )}
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="font-medium text-gray-900">{clientName}</p>
                  {client?.email && <p className="text-gray-500">{client.email}</p>}
                  {client?.whatsapp && <p className="text-gray-500">WhatsApp: {client.whatsapp}</p>}
                  {client?.phone && <p className="text-gray-500">Phone: {client.phone}</p>}
                  {client?.country && <p className="text-gray-500">Country: {client.country}</p>}
                  {client?.preferred_language && (
                    <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {client.preferred_language === 'ar' ? 'Arabic' : 'English'}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Request Details</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Adults</span>
                    <span className="text-gray-700">{request.travelers_adults}</span>
                  </div>
                  {(request.travelers_children_older ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Children 12–18</span>
                      <span className="text-gray-700">{request.travelers_children_older}</span>
                    </div>
                  )}
                  {(request.travelers_children_younger ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Children 2–12</span>
                      <span className="text-gray-700">{request.travelers_children_younger}</span>
                    </div>
                  )}
                  {request.preferred_start_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Preferred date</span>
                      <span className="text-gray-700">
                        {new Date(request.preferred_start_date).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source</span>
                    <span className="text-gray-700 capitalize">{request.source ?? 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Received</span>
                    <span className="text-gray-700">
                      {new Date(request.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>
              </div>

              {request.client_question && (
                <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                  <h2 className="text-sm font-semibold text-amber-800 mb-2">Client Message</h2>
                  <p className="text-sm text-amber-700">{request.client_question}</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">
                  Communication Log
                  {commLogs.length > 0 && (
                    <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {commLogs.length}
                    </span>
                  )}
                </h2>
                <CommunicationLog requestId={id} logs={commLogs} />
              </div>
            </div>
          </div>
        )}

        {/* ── QUOTES ────────────────────────────────────────────────── */}
        {activeTab === 'quotes' && (
          <div className="space-y-6">
            {allVersions.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
                <p className="text-sm text-gray-500 mb-4">No quotes yet for this request.</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Link
                    href={`/admin/quotes/new?request=${id}`}
                    className="inline-block rounded-md px-4 py-2 text-sm font-medium text-white bg-olive hover:bg-olive-dk">
                    Create First Quote
                  </Link>
                  <StartFromTemplate requestId={id} templates={templateOptions} />
                </div>
              </div>
            ) : (
              <>
                {STATUS_ORDER.filter(s => byStatus[s]?.length).map(statusKey => (
                  <div key={statusKey}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Quotes in {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                    </h3>
                    <div className="space-y-3">
                      {byStatus[statusKey].map(({ quote, version }) => (
                        <div key={version.id}
                          className="bg-white rounded-lg border border-gray-200 p-4 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs text-gray-400">Version</span>
                              <span className="text-sm font-semibold text-gray-900 font-mono">
                                #{quote.quote_number}.{version.version_number}
                              </span>
                              <StatusBadge status={version.status} />
                            </div>
                            {(version.title || (quote.tours as any)?.title_en) && (
                              <p className="text-sm text-gray-600 truncate">
                                Tour: {version.title || (quote.tours as any)?.title_en}
                              </p>
                            )}
                            {version.travel_start_date && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(version.travel_start_date).toLocaleDateString('en-GB')}
                                {version.travel_end_date
                                  ? ` – ${new Date(version.travel_end_date).toLocaleDateString('en-GB')}`
                                  : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Link
                              href={`/admin/quotes/${quote.id}?step=itinerary&version=${version.id}`}
                              className="rounded-md px-3 py-1.5 text-xs font-medium text-white bg-olive hover:bg-olive-dk">
                              Edit Quote
                            </Link>
                            <Link
                              href={`/admin/quotes/${quote.id}`}
                              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                              Create New Version
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href={`/admin/quotes/new?request=${id}`}
                    className="text-sm font-medium text-[var(--olive)] hover:text-[var(--olive-dk)]">
                    + Create Another Quote
                  </Link>
                  <StartFromTemplate requestId={id} templates={templateOptions} />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TOUR INFORMATION ──────────────────────────────────────── */}
        {activeTab === 'tour' && (
          <div className="max-w-lg">
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Tour Information</h2>
              {linkedTour ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tour</span>
                    <Link href={`/admin/tours/${request.tour_id}`}
                      className="text-[var(--olive)] hover:underline font-medium text-right max-w-[260px]">
                      {linkedTour.title_en}
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="text-gray-700 capitalize">{linkedTour.type}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No tour linked to this request.</p>
              )}
              <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Group Size</p>
                <div className="flex justify-between">
                  <span className="text-gray-500">Adults</span>
                  <span className="text-gray-700">{request.travelers_adults}</span>
                </div>
                {(request.travelers_children_older ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Children 12–18</span>
                    <span className="text-gray-700">{request.travelers_children_older}</span>
                  </div>
                )}
                {(request.travelers_children_younger ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Children 2–12</span>
                    <span className="text-gray-700">{request.travelers_children_younger}</span>
                  </div>
                )}
                {request.preferred_start_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Preferred start</span>
                    <span className="text-gray-700">
                      {new Date(request.preferred_start_date).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                )}
                {request.trip_length_nights && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Trip length</span>
                    <span className="text-gray-700">{request.trip_length_nights} nights</span>
                  </div>
                )}
                {request.preferred_room_type && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Preferred room type</span>
                    <span className="text-gray-700 capitalize">{request.preferred_room_type}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── LOGISTICS ─────────────────────────────────────────────── */}
        {activeTab === 'logistics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <FlightsManager requestId={id} flights={flights as any} />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Staff &amp; Vehicles</h2>
              <AssignmentManager
                requestId={id}
                staffAssignments={staffAssignments as any}
                vehicleAssignments={vehicleAssignments as any}
                staffOptions={(staffOptions ?? []) as any}
                vehicleOptions={(vehicleOptions ?? []) as any}
              />
            </div>
          </div>
        )}

        {/* ── TASKS ─────────────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <div className="max-w-lg">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <TaskManager requestId={id} tasks={tasks ?? []} />
            </div>
          </div>
        )}

        {/* ── NOTES ─────────────────────────────────────────────────── */}
        {activeTab === 'notes' && (
          <div className="max-w-lg">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Notes</h2>
              <CommunicationLog requestId={id} logs={notes} noteOnly />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
