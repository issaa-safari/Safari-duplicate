'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { buildVouchersForDeparture, buildVouchersForBooking } from '@/lib/server/vouchers'
import { buildVoucherEmail } from '@/lib/voucher-email'
import { sendEmail } from '@/lib/email'
import type { HotelVoucher } from '@/lib/types'

async function requestBaseUrl() {
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { admin }
}

// Refresh the central list plus whichever trip pages surface this voucher, so a
// change made in one place is reflected everywhere it appears.
function revalidateFor(voucher: { departure_id: string | null; booking_id: string | null }) {
  revalidatePath('/admin/vouchers')
  if (voucher.departure_id) revalidatePath(`/admin/departures/${voucher.departure_id}`)
  if (voucher.booking_id) revalidatePath(`/admin/bookings/${voucher.booking_id}`)
}

async function loadVoucher(admin: Awaited<ReturnType<typeof authGuard>>['admin'], id: string) {
  const { data } = await admin.from('hotel_vouchers').select('*').eq('id', id).single()
  if (!data) throw new Error('Voucher not found.')
  return data as HotelVoucher
}

export async function generateDepartureVouchers(formData: FormData) {
  const { admin } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  if (!departureId) throw new Error('Choose a departure to generate from.')
  await buildVouchersForDeparture(admin, departureId)
  revalidatePath('/admin/vouchers')
  revalidatePath(`/admin/departures/${departureId}`)
}

export async function generateBookingVouchers(formData: FormData) {
  const { admin } = await authGuard()
  const bookingId = (formData.get('bookingId') as string)?.trim()
  if (!bookingId) throw new Error('Choose a booking to generate from.')
  await buildVouchersForBooking(admin, bookingId)
  revalidatePath('/admin/vouchers')
  revalidatePath(`/admin/bookings/${bookingId}`)
}

export async function updateVoucher(formData: FormData) {
  const { admin } = await authGuard()
  const id = (formData.get('id') as string)?.trim()
  if (!id) throw new Error('Missing voucher.')
  const voucher = await loadVoucher(admin, id)

  const str = (n: string) => {
    const v = (formData.get(n) as string)?.trim()
    return v ? v : null
  }
  const checkIn = str('checkIn')
  const checkOut = str('checkOut')
  if (!checkIn || !checkOut) throw new Error('Check-in and check-out dates are required.')
  if (checkOut <= checkIn) throw new Error('Check-out must be after check-in.')

  const nights = Math.round(
    (new Date(checkOut + 'T00:00:00Z').getTime() - new Date(checkIn + 'T00:00:00Z').getTime()) / 86_400_000,
  )
  const numRooms = Math.max(1, parseInt((formData.get('numRooms') as string) || '1', 10) || 1)
  const numGuests = Math.max(1, parseInt((formData.get('numGuests') as string) || '1', 10) || 1)
  const guestNames = ((formData.get('guestNames') as string) || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
  const language = (formData.get('language') as string) === 'ar' ? 'ar' : 'en'

  const { error } = await admin
    .from('hotel_vouchers')
    .update({
      hotel_name: str('hotelName') ?? 'Hotel',
      hotel_email: str('hotelEmail'),
      check_in: checkIn,
      check_out: checkOut,
      nights: Math.max(1, nights),
      num_rooms: numRooms,
      room_type: str('roomType'),
      num_guests: numGuests,
      guest_names: guestNames,
      meal_plan: str('mealPlan'),
      special_requests: str('specialRequests'),
      internal_notes: str('internalNotes'),
      language,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidateFor(voucher)
}

export async function sendVoucher(formData: FormData) {
  const { admin } = await authGuard()
  const id = (formData.get('id') as string)?.trim()
  if (!id) throw new Error('Missing voucher.')
  const voucher = await loadVoucher(admin, id)
  if (!voucher.hotel_email?.trim()) {
    throw new Error('Add the hotel email before sending.')
  }

  const baseUrl = await requestBaseUrl()
  const { subject, html } = buildVoucherEmail(voucher, {
    viewUrl: `${baseUrl}/voucher/${voucher.token}`,
  })

  const sent = await sendEmail({ to: voucher.hotel_email.trim(), subject, html })
  if (!sent) throw new Error('Email could not be sent (check email configuration).')

  await admin
    .from('hotel_vouchers')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
  revalidateFor(voucher)
}

export async function markVoucherConfirmed(formData: FormData) {
  const { admin } = await authGuard()
  const id = (formData.get('id') as string)?.trim()
  const ref = (formData.get('confirmationRef') as string)?.trim() || null
  if (!id) throw new Error('Missing voucher.')
  const voucher = await loadVoucher(admin, id)

  const { error } = await admin
    .from('hotel_vouchers')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), hotel_confirmation_ref: ref })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidateFor(voucher)
}

export async function deleteVoucher(formData: FormData) {
  const { admin } = await authGuard()
  const id = (formData.get('id') as string)?.trim()
  if (!id) throw new Error('Missing voucher.')
  const voucher = await loadVoucher(admin, id)

  const { error } = await admin.from('hotel_vouchers').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidateFor(voucher)
}
