'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

const TASK_TYPES = ['payment', 'accommodation', 'activity', 'other']

type TaskContext = {
  requestId: string | null
  departureId: string | null
  bookingId: string | null
}

function readTaskContext(formData: FormData): TaskContext {
  return {
    requestId: (formData.get('requestId') as string | null)?.trim() || null,
    departureId: (formData.get('departureId') as string | null)?.trim() || null,
    bookingId: (formData.get('bookingId') as string | null)?.trim() || null,
  }
}

function requireTaskContext(context: TaskContext) {
  if (!context.requestId && !context.departureId && !context.bookingId) {
    throw new Error('A request, trip or booking is required.')
  }
}

function revalidateTaskContext(context: TaskContext) {
  if (context.requestId) revalidatePath(`/admin/requests/${context.requestId}`)
  if (context.departureId) {
    revalidatePath(`/admin/departures/${context.departureId}`)
    revalidatePath(`/admin/departures/${context.departureId}/tasks`)
  }
  if (context.bookingId) revalidatePath(`/admin/bookings/${context.bookingId}`)
}

async function validateTaskContext(
  admin: ReturnType<typeof createAdminClient>,
  context: TaskContext,
) {
  requireTaskContext(context)

  const [requestResult, departureResult, bookingResult] = await Promise.all([
    context.requestId
      ? admin.from('requests').select('id').eq('id', context.requestId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    context.departureId
      ? admin.from('departures').select('id').eq('id', context.departureId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    context.bookingId
      ? admin.from('bookings').select('id, request_id, departure_id').eq('id', context.bookingId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (requestResult.error || (context.requestId && !requestResult.data)) throw new Error('Request not found.')
  if (departureResult.error || (context.departureId && !departureResult.data)) throw new Error('Trip not found.')
  if (bookingResult.error || (context.bookingId && !bookingResult.data)) throw new Error('Booking not found.')

  const booking = bookingResult.data as { request_id: string | null; departure_id: string | null } | null
  if (booking && context.requestId && booking.request_id !== context.requestId) {
    throw new Error('The booking is not linked to this request.')
  }
  if (booking && context.departureId && booking.departure_id !== context.departureId) {
    throw new Error('The booking is not linked to this trip.')
  }
}

export async function addTask(formData: FormData) {
  const { admin } = await authGuard()
  const context = readTaskContext(formData)
  const title = (formData.get('title') as string)?.trim()
  const typeRaw = (formData.get('type') as string)?.trim()
  const type = TASK_TYPES.includes(typeRaw) ? typeRaw : 'other'

  requireTaskContext(context)
  if (!title) throw new Error('Task title is required.')
  if (title.length > 500) throw new Error('Task title is too long.')

  await validateTaskContext(admin, context)

  const { data: inserted, error } = await admin
    .from('tasks')
    .insert({
      request_id: context.requestId,
      departure_id: context.departureId,
      booking_id: context.bookingId,
      title,
      type,
      is_done: false,
    })
    .select('id, request_id, departure_id, booking_id, title, is_done, created_at, type, auto_generated, sort_order')
    .single()
  if (error) throw new Error(error.message)
  revalidateTaskContext(context)
  return inserted
}

export async function toggleTask(formData: FormData) {
  const { admin } = await authGuard()
  const taskId = (formData.get('taskId') as string)?.trim()
  const context = readTaskContext(formData)
  const isDone = formData.get('isDone') === 'true'

  if (!taskId) throw new Error('Task ID is required.')
  requireTaskContext(context)

  let query = admin.from('tasks').update({ is_done: isDone }).eq('id', taskId)
  if (context.requestId) query = query.eq('request_id', context.requestId)
  if (context.departureId) query = query.eq('departure_id', context.departureId)
  if (context.bookingId) query = query.eq('booking_id', context.bookingId)
  const { error } = await query
  if (error) throw new Error(error.message)
  revalidateTaskContext(context)
}

export async function deleteTask(formData: FormData) {
  const { admin } = await authGuard()
  const taskId = (formData.get('taskId') as string)?.trim()
  const context = readTaskContext(formData)

  if (!taskId) throw new Error('Task ID is required.')
  requireTaskContext(context)

  let query = admin.from('tasks').delete().eq('id', taskId)
  if (context.requestId) query = query.eq('request_id', context.requestId)
  if (context.departureId) query = query.eq('departure_id', context.departureId)
  if (context.bookingId) query = query.eq('booking_id', context.bookingId)
  const { error } = await query
  if (error) throw new Error(error.message)
  revalidateTaskContext(context)
}
