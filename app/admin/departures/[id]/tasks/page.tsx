import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import TaskManager from '@/app/admin/requests/[id]/task-manager'
import DepartureOperationsNav from '../operations-nav'

type LinkedBooking = {
  id: string
  request_id: string | null
  clients: { first_name: string | null; last_name: string | null } | Array<{ first_name: string | null; last_name: string | null }> | null
  requests: { reference: string | null } | Array<{ reference: string | null }> | null
}

type GroupTask = {
  id: string
  request_id: string
  title: string
  is_done: boolean
  created_at: string
  type?: string
  auto_generated?: boolean
  sort_order?: number
}

export default async function DepartureTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const [{ data: departure }, { data: bookings }] = await Promise.all([
    admin
      .from('departures')
      .select('id, start_date, end_date, tours ( title_en )')
      .eq('id', id)
      .single(),
    admin
      .from('bookings')
      .select('id, request_id, clients ( first_name, last_name ), requests ( reference )')
      .eq('departure_id', id)
      .neq('status', 'cancelled'),
  ])
  if (!departure) notFound()

  const bookingList = (bookings ?? []) as unknown as LinkedBooking[]
  const requestMap = new Map<string, LinkedBooking>()
  for (const booking of bookingList) {
    if (booking.request_id && !requestMap.has(booking.request_id)) requestMap.set(booking.request_id, booking)
  }
  const requestIds = [...requestMap.keys()]

  let tasks: GroupTask[] = []
  if (requestIds.length > 0) {
    const { data } = await admin
      .from('tasks')
      .select('id, request_id, title, is_done, created_at, type, auto_generated, sort_order')
      .in('request_id', requestIds)
      .order('sort_order', { ascending: true })
    tasks = (data ?? []) as GroupTask[]
  }

  const tour = Array.isArray(departure.tours) ? departure.tours[0] : departure.tours
  const bookingsWithoutRequest = bookingList.filter(booking => !booking.request_id).length

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <Link href={`/admin/departures/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Departure overview
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">Group tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tour?.title_en ?? 'Departure'} · one operational checklist across every linked booking request.
        </p>
      </div>

      <DepartureOperationsNav departureId={id} />

      {requestIds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm font-medium text-foreground">No request-linked tasks yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tasks appear here when a departure booking is connected to a client request.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {requestIds.map(requestId => {
            const booking = requestMap.get(requestId)
            if (!booking) return null
            const client = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients
            const request = Array.isArray(booking.requests) ? booking.requests[0] : booking.requests
            const clientName = `${client?.first_name ?? ''} ${client?.last_name ?? ''}`.trim()
            const requestTasks = tasks.filter(task => task.request_id === requestId)

            return (
              <section key={requestId} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <h2 className="font-semibold text-foreground">{clientName || 'Booking party'}</h2>
                    <p className="text-xs text-muted-foreground">{request?.reference ?? 'Linked request'}</p>
                  </div>
                  <Link href={`/admin/requests/${requestId}`} className="text-xs font-medium text-brand-text hover:underline">
                    Open request →
                  </Link>
                </div>
                <TaskManager requestId={requestId} tasks={requestTasks} />
              </section>
            )
          })}
        </div>
      )}

      {bookingsWithoutRequest > 0 && (
        <p className="rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground">
          {bookingsWithoutRequest} booking{bookingsWithoutRequest === 1 ? '' : 's'} cannot show tasks here because no client request is linked.
        </p>
      )}
    </div>
  )
}
