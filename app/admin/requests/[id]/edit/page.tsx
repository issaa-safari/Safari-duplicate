import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import RequestForm, { type ClientOption } from '../../request-form'

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { id } = await params
  const admin = createAdminClient()

  const { data: request } = await admin
    .from('requests')
    .select('id, reference, client_id, source, client_question, travelers_adults, travelers_children_older, travelers_children_younger, preferred_start_date, trip_length_nights, preferred_room_type, priority')
    .eq('id', id)
    .maybeSingle()
  if (!request) notFound()

  const { data: clientRows } = await admin
    .from('clients')
    .select('id, first_name, last_name, email')
    .order('first_name')

  const clients: ClientOption[] = (clientRows ?? []).map((c: { id: string; first_name: string | null; last_name: string | null; email: string | null }) => ({
    id: c.id,
    name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.email || 'Unnamed client',
    email: c.email,
  }))

  // priority is stored loosely (text/boolean across data generations) — treat
  // anything other than empty/'false' as set.
  const priority = !!request.priority && String(request.priority) !== 'false'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/admin/requests/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          Back to Request
        </Link>
        <h1 className="text-2xl font-semibold text-brand-ink">
          Edit Request <span className="font-mono text-sm text-gray-400">{request.reference}</span>
        </h1>
      </div>
      <RequestForm
        clients={clients}
        initialClientId={request.client_id}
        requestId={id}
        initial={{
          source: request.source ?? '',
          clientQuestion: request.client_question ?? '',
          preferredDate: request.preferred_start_date ?? '',
          tripLengthNights: request.trip_length_nights != null ? String(request.trip_length_nights) : '',
          preferredRoomType: request.preferred_room_type ?? '',
          adults: request.travelers_adults ?? 2,
          childrenOlder: request.travelers_children_older ?? 0,
          childrenYounger: request.travelers_children_younger ?? 0,
          priority,
        }}
      />
    </div>
  )
}
