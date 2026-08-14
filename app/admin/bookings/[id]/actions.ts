'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { admin }
}

/**
 * Set or clear a booking's own trip dates.
 *
 * Only for a booking with no departure. A seat on a scheduled departure takes
 * its dates from that departure (lib/trip-dates.ts), so writing them here would
 * be writing a value nothing reads — worse, a value someone would later believe.
 *
 * This exists because dates are frequently not agreed when the booking is
 * taken: an enquiry becomes a confirmed private trip first, and the calendar
 * follows a week later.
 */
export async function updateBookingDates(formData: FormData) {
  const { admin } = await authGuard()

  const id = formData.get('id') as string
  if (!id) throw new Error('Missing booking.')

  const startDate = (formData.get('startDate') as string)?.trim() || null
  const endDate = (formData.get('endDate') as string)?.trim() || null
  if (startDate && endDate && endDate < startDate) {
    throw new Error('The end date is before the start date.')
  }

  const { data: booking } = await admin
    .from('bookings')
    .select('id, departure_id')
    .eq('id', id)
    .maybeSingle()

  if (!booking) throw new Error('Booking not found.')
  if (booking.departure_id) {
    throw new Error('This booking is on a scheduled departure — change the dates on the departure instead.')
  }

  const { error } = await admin
    .from('bookings')
    .update({ start_date: startDate, end_date: endDate })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(`/admin/bookings/${id}`)
  revalidatePath('/admin/bookings')
  revalidatePath('/dashboard')
}
