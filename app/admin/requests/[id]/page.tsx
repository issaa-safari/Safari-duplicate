import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import StageSelector from './stage-selector'
import CommunicationLog from './communication-log'
import TaskManager from './task-manager'

const STAGES = [
  { key: 'new', label: 'New' },
  { key: 'working_on', label: 'Working On' },
  { key: 'open', label: 'Open' },
  { key: 'pre_booked', label: 'Pre-Booked' },
  { key: 'booked', label: 'Booked' },
  { key: 'completed', label: 'Completed' },
  { key: 'not_booked', label: 'Not Booked' },
]

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { id } = await params

  const { data: request } = await supabase
    .from('requests')
    .select('*, clients (*), tours (title_en, type)')
    .eq('id', id)
    .single()

  if (!request) notFound()

  const { data: logs } = await supabase
    .from('communication_logs')
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: false })

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: false })

  const client = request.clients as any
  const tour = request.tours as any
  const clientName = client
    ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()
    : 'Unknown Client'

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/requests" className="text-sm text-gray-500 hover:text-gray-700">
            Back to Requests
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">Request from {clientName}</h1>
              {request.priority && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Priority</span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-mono">{request.reference}</p>
          </div>
        </div>
        <Link href={"/admin/quotes/new?request=" + id}
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: '#7A9A4A' }}>
          Create Quote
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-3">Pipeline Stage</p>
        <StageSelector requestId={id} currentStage={request.stage} stages={STAGES} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Client</h2>
              {client && (
                <Link href={"/admin/clients/" + client.id}
                  className="text-xs text-[#7A9A4A] hover:underline">
                  View profile
                </Link>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900">{clientName}</p>
              {client?.email && <p className="text-gray-500">{client.email}</p>}
              {client?.whatsapp && <p className="text-gray-500">WhatsApp: {client.whatsapp}</p>}
              {client?.phone && <p className="text-gray-500">Phone: {client.phone}</p>}
              {client?.country && <p className="text-gray-500">Country: {client.country}</p>}
              {client?.language && (
                <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {client.language === 'ar' ? 'Arabic' : 'English'}
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Request Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Reference</span>
                <span className="font-mono text-xs text-gray-700">{request.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Source</span>
                <span className="text-gray-700 capitalize">{request.source ?? 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Adults</span>
                <span className="text-gray-700">{request.travelers_adults}</span>
              </div>
              {request.travelers_children_older > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Children 12-18</span>
                  <span className="text-gray-700">{request.travelers_children_older}</span>
                </div>
              )}
              {request.travelers_children_younger > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Children 2-12</span>
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
                <span className="text-gray-500">Received</span>
                <span className="text-gray-700">
                  {new Date(request.created_at).toLocaleDateString('en-GB')}
                </span>
              </div>
              {tour && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tour</span>
                  <span className="text-gray-700 text-xs text-right">{tour.title_en}</span>
                </div>
              )}
            </div>
          </div>

          {request.client_question && (
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
              <h2 className="text-sm font-semibold text-amber-800 mb-2">Client Message</h2>
              <p className="text-sm text-amber-700">{request.client_question}</p>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <TaskManager requestId={id} tasks={tasks ?? []} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Communication Log
              {logs && logs.length > 0 && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {logs.length}
                </span>
              )}
            </h2>
            <CommunicationLog requestId={id} logs={logs ?? []} />
          </div>
        </div>
      </div>
    </div>
  )
}