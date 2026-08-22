'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import {
  createManualBookingAtomically,
  mapManualBookingError,
  type ManualBookingTraveller,
} from '@/lib/server/manual-booking'
import { redirect } from 'next/navigation'

export async function createManualBooking(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)

  const departureId = (formData.get('departureId') as string)?.trim() || null
  const requestId = (formData.get('requestId') as string)?.trim() || null
  const clientId = (formData.get('clientId') as string)?.trim() || null
  const status = (formData.get('status') as string) === 'pending' ? 'pending' : 'confirmed'
  const startDate = departureId ? null : ((formData.get('startDate') as string)?.trim() || null)
  const endDate = departureId ? null : ((formData.get('endDate') as string)?.trim() || null)
  const totalPrice = Number.parseFloat((formData.get('totalPrice') as string) ?? '')
  const depositRaw = Number.parseFloat((formData.get('deposit') as string) ?? '')
  const deposit = Number.isFinite(depositRaw) && depositRaw > 0 ? depositRaw : 0
  const depositMethod = (formData.get('depositMethod') as string)?.trim() || null
  const depositReference = (formData.get('depositReference') as string)?.trim() || null

  let travellers: ManualBookingTraveller[]
  try {
    const parsed = JSON.parse((formData.get('travellers') as string) || '[]')
    if (!Array.isArray(parsed)) throw new Error('Traveller details must be an array.')
    travellers = (parsed as unknown[]).filter((value): value is ManualBookingTraveller => {
      if (!value || typeof value !== 'object') return false
      const traveller = value as ManualBookingTraveller
      return Boolean(traveller.firstName?.trim() || traveller.lastName?.trim() || traveller.email?.trim())
    })
  } catch {
    throw new Error('Could not read traveller details.')
  }

  const declaredCount = Number.parseInt((formData.get('travellerCount') as string) ?? '', 10)
  const travellerCount = Math.max(
    travellers.length,
    Number.isFinite(declaredCount) && declaredCount > 0 ? declaredCount : 1,
  )

  if (!Number.isFinite(totalPrice) || totalPrice < 0) throw new Error('Enter a valid total price.')
  if (deposit > totalPrice) throw new Error('Deposit cannot exceed the total price.')
  if (startDate && endDate && endDate < startDate) {
    throw new Error('The end date is before the start date.')
  }

  let bookingId: string
  try {
    const booking = await createManualBookingAtomically(admin, {
      departureId,
      requestId,
      clientId,
      startDate,
      endDate,
      travellerCount,
      totalPriceUsd: totalPrice,
      status,
      travellers,
      depositUsd: deposit,
      depositMethod,
      depositReference,
      createdBy: user.id,
    })
    bookingId = booking.bookingId
  } catch (error) {
    throw new Error(mapManualBookingError(error))
  }

  redirect(`/admin/bookings/${bookingId}`)
}
