'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildVouchersForDeparture } from '@/lib/server/vouchers'
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

function revalidate(departureId: string) {
  revalidatePath(`/admin/departures/${departureId}/vouchers`)
}

// Confirm a voucher actually belongs to this departure before mutating it.
async function assertVoucherOnDeparture(admin: SupabaseClient, voucherId: string, departureId: string) {
  const { data } = await admin
    .from('hotel_vouchers')
    .select('id, departure_id')
    .eq('id', voucherId)
    .single()
  if (!data || data.departure_id !== departureId) throw new Error('Voucher not found on this departure.')
}

export async function generateVouchers(formData: FormData) {
  const { admin } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  if (!departureId) throw new Error('Missing departure.')
  await buildVouchersForDeparture(admin, departureId)
  revalidate(departureId)
}

export async function updateVoucher(formData: FormData) {
  const { admin } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  const id = (formData.get('id') as string)?.trim()
  if (!departureId || !id) throw new Error('Missing voucher.')
  await assertVoucherOnDeparture(admin, id, departureId)

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
    .eq('departure_id', departureId)
  if (error) throw new Error(error.message)
  revalidate(departureId)
}

export async function sendVoucher(formData: FormData) {
  const { admin } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  const id = (formData.get('id') as string)?.trim()
  if (!departureId || !id) throw new Error('Missing voucher.')
  await assertVoucherOnDeparture(admin, id, departureId)

  const { data: voucher } = await admin
    .from('hotel_vouchers')
    .select('*')
    .eq('id', id)
    .single()
  if (!voucher) throw new Error('Voucher not found.')
  if (!voucher.hotel_email?.trim()) {
    throw new Error('Add the hotel email before sending.')
  }

  const baseUrl = await requestBaseUrl()
  const { subject, html } = buildVoucherEmail(voucher as HotelVoucher, {
    viewUrl: `${baseUrl}/voucher/${voucher.token}`,
  })

  const sent = await sendEmail({ to: voucher.hotel_email.trim(), subject, html })
  if (!sent) throw new Error('Email could not be sent (check email configuration).')

  await admin
    .from('hotel_vouchers')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
    .eq('departure_id', departureId)
  revalidate(departureId)
}

export async function markVoucherConfirmed(formData: FormData) {
  const { admin } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  const id = (formData.get('id') as string)?.trim()
  const ref = (formData.get('confirmationRef') as string)?.trim() || null
  if (!departureId || !id) throw new Error('Missing voucher.')
  await assertVoucherOnDeparture(admin, id, departureId)

  const { error } = await admin
    .from('hotel_vouchers')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), hotel_confirmation_ref: ref })
    .eq('id', id)
    .eq('departure_id', departureId)
  if (error) throw new Error(error.message)
  revalidate(departureId)
}

export async function deleteVoucher(formData: FormData) {
  const { admin } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  const id = (formData.get('id') as string)?.trim()
  if (!departureId || !id) throw new Error('Missing voucher.')

  const { error } = await admin
    .from('hotel_vouchers')
    .delete()
    .eq('id', id)
    .eq('departure_id', departureId)
  if (error) throw new Error(error.message)
  revalidate(departureId)
}
