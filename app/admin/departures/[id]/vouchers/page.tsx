import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import VouchersClient from './vouchers-client'
import type { HotelVoucher } from '@/lib/types'

async function requestBaseUrl() {
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

export default async function DepartureVouchersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: departure } = await admin
    .from('departures')
    .select('id, start_date, end_date, tours ( title_en )')
    .eq('id', id)
    .single()
  if (!departure) notFound()

  const { data: vouchers } = await admin
    .from('hotel_vouchers')
    .select('*')
    .eq('departure_id', id)
    .order('check_in', { ascending: true })

  const baseUrl = await requestBaseUrl()
  const tourTitle = (departure as { tours?: { title_en?: string } }).tours?.title_en ?? 'Departure'

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <Link href={`/admin/departures/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← Back to departure
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Hotel Vouchers</h1>
        <p className="text-sm text-muted-foreground">
          {tourTitle} · {departure.start_date} – {departure.end_date}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Generate a booking voucher for every hotel in the itinerary, then edit rooms and guests and email each
          hotel a confirmation. Vouchers are bilingual — set the language per voucher.
        </p>
      </div>

      <VouchersClient
        departureId={id}
        vouchers={(vouchers as HotelVoucher[]) ?? []}
        baseUrl={baseUrl}
      />
    </div>
  )
}
