'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function updateDeparture(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string
  const maxSeats = parseInt(formData.get('maxSeats') as string) || 1
  const bookedSeats = parseInt(formData.get('bookedSeats') as string) || 0
  const priceUsd = parseFloat(formData.get('priceUsd') as string)
  const status = (formData.get('status') as string) || 'available'
  const internalNotes = formData.get('internalNotes') as string

  if (!startDate || !endDate) throw new Error('Start and end dates are required.')
  if (new Date(endDate) < new Date(startDate)) throw new Error('End date cannot be before start date.')
  if (isNaN(priceUsd)) throw new Error('Price is required.')
  if (bookedSeats > maxSeats) throw new Error('Booked seats cannot exceed max seats.')

  const admin = createAdminClient()
  const { error } = await admin
    .from('departures')
    .update({
      start_date: startDate,
      end_date: endDate,
      max_seats: maxSeats,
      booked_seats: bookedSeats,
      price_usd: priceUsd,
      status,
      internal_notes: internalNotes || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  redirect('/admin/departures')
}
