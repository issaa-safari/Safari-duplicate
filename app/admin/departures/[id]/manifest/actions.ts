'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { admin }
}

function revalidate(departureId: string) {
  revalidatePath(`/admin/departures/${departureId}/manifest`)
}

// Confirm a traveller belongs to a booking on this departure — prevents an
// action from touching a traveller on a different departure.
async function assertTravellerOnDeparture(
  admin: SupabaseClient,
  travellerId: string,
  departureId: string,
) {
  const { data } = await admin
    .from('booking_travellers')
    .select('id, bookings!inner(departure_id)')
    .eq('id', travellerId)
    .single()
  const depId = (data as any)?.bookings?.departure_id
  if (!data || depId !== departureId) throw new Error('Traveller not found on this departure.')
}

export async function addTravellerFlight(formData: FormData) {
  const { admin } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  const travellerId = (formData.get('travellerId') as string)?.trim()
  if (!departureId || !travellerId) throw new Error('Missing traveller.')
  await assertTravellerOnDeparture(admin, travellerId, departureId)

  const str = (n: string) => (formData.get(n) as string)?.trim() || null
  const direction = (formData.get('direction') as string) === 'departure' ? 'departure' : 'arrival'
  const scheduledRaw = str('scheduledAt')

  const { error } = await admin.from('booking_traveller_flights').insert({
    booking_traveller_id: travellerId,
    direction,
    flight_number: str('flightNumber'),
    airline: str('airline'),
    airport: str('airport'),
    scheduled_at: scheduledRaw ? new Date(scheduledRaw).toISOString() : null,
    notes: str('notes'),
  })
  if (error) throw new Error(error.message)
  revalidate(departureId)
}

export async function deleteTravellerFlight(formData: FormData) {
  const { admin } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  const id = (formData.get('id') as string)?.trim()
  if (!departureId || !id) throw new Error('Missing flight.')
  const { error } = await admin.from('booking_traveller_flights').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidate(departureId)
}

export async function assignMotorbike(formData: FormData) {
  const { admin } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  const travellerId = (formData.get('travellerId') as string)?.trim()
  const motorbikeId = (formData.get('motorbikeId') as string)?.trim() || null
  if (!departureId || !travellerId) throw new Error('Missing traveller.')
  await assertTravellerOnDeparture(admin, travellerId, departureId)

  if (motorbikeId) {
    // A bike may not be assigned to two travellers on overlapping departures.
    const { data: thisDep } = await admin
      .from('departures').select('start_date, end_date').eq('id', departureId).single()
    if (!thisDep) throw new Error('Departure not found.')

    const { data: others } = await admin
      .from('booking_travellers')
      .select('id, first_name, last_name, bookings!inner(departures!inner(start_date, end_date))')
      .eq('motorbike_id', motorbikeId)
      .neq('id', travellerId)

    const overlaps = (others ?? []).some((row: any) => {
      const dep = row.bookings?.departures
      if (!dep) return false
      return thisDep.start_date <= dep.end_date && dep.start_date <= thisDep.end_date
    })
    if (overlaps) {
      const { data: bike } = await admin.from('motorbikes').select('name').eq('id', motorbikeId).single()
      throw new Error(`${bike?.name ?? 'That bike'} is already assigned on an overlapping departure.`)
    }
  }

  const { error } = await admin
    .from('booking_travellers').update({ motorbike_id: motorbikeId }).eq('id', travellerId)
  if (error) throw new Error(error.message)
  revalidate(departureId)
}

export async function updateTravellerExtras(formData: FormData) {
  const { admin } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  const travellerId = (formData.get('travellerId') as string)?.trim()
  if (!departureId || !travellerId) throw new Error('Missing traveller.')
  await assertTravellerOnDeparture(admin, travellerId, departureId)

  const str = (n: string) => (formData.get(n) as string)?.trim() || null
  const { error } = await admin.from('booking_travellers').update({
    is_rider: formData.get('isRider') === 'on',
    dietary_requirements: str('dietary'),
    allergies: str('allergies'),
    emergency_contact: str('emergency'),
  }).eq('id', travellerId)
  if (error) throw new Error(error.message)
  revalidate(departureId)
}

// Create (or refresh a still-pending) signable agreement for a traveller,
// snapshotting the active template so later template edits don't rewrite an
// already-issued document.
export async function generateAgreement(formData: FormData) {
  const { admin } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  const travellerId = (formData.get('travellerId') as string)?.trim()
  if (!departureId || !travellerId) throw new Error('Missing traveller.')
  await assertTravellerOnDeparture(admin, travellerId, departureId)

  const { data: template } = await admin
    .from('agreement_templates')
    .select('id, title, body')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!template) throw new Error('No active agreement template. Create one under Agreements first.')

  const { data: existing } = await admin
    .from('traveller_agreements')
    .select('id, status')
    .eq('booking_traveller_id', travellerId)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'signed') return // never overwrite a signed agreement
    const { error } = await admin.from('traveller_agreements').update({
      departure_id: departureId,
      agreement_template_id: template.id,
      title_snapshot: template.title,
      body_snapshot: template.body,
    }).eq('id', existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await admin.from('traveller_agreements').insert({
      booking_traveller_id: travellerId,
      departure_id: departureId,
      agreement_template_id: template.id,
      title_snapshot: template.title,
      body_snapshot: template.body,
    })
    if (error) throw new Error(error.message)
  }
  revalidate(departureId)
}

// Issue agreements for every traveller on the departure who doesn't have one.
export async function generateAllAgreements(formData: FormData) {
  const { admin } = await authGuard()
  const departureId = (formData.get('departureId') as string)?.trim()
  if (!departureId) throw new Error('Missing departure.')

  const { data: template } = await admin
    .from('agreement_templates')
    .select('id, title, body')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!template) throw new Error('No active agreement template. Create one under Agreements first.')

  const { data: bookings } = await admin
    .from('bookings')
    .select('booking_travellers ( id )')
    .eq('departure_id', departureId)
  const travellerIds: string[] = (bookings ?? []).flatMap((b: any) =>
    (b.booking_travellers ?? []).map((t: any) => t.id))
  if (travellerIds.length === 0) { revalidate(departureId); return }

  const { data: existing } = await admin
    .from('traveller_agreements')
    .select('booking_traveller_id')
    .in('booking_traveller_id', travellerIds)
  const have = new Set((existing ?? []).map((e: any) => e.booking_traveller_id))

  const toCreate = travellerIds.filter(id => !have.has(id)).map(id => ({
    booking_traveller_id: id,
    departure_id: departureId,
    agreement_template_id: template.id,
    title_snapshot: template.title,
    body_snapshot: template.body,
  }))
  if (toCreate.length > 0) {
    const { error } = await admin.from('traveller_agreements').insert(toCreate)
    if (error) throw new Error(error.message)
  }
  revalidate(departureId)
}
