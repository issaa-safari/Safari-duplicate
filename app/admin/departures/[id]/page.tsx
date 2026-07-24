import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import DepartureEditForm from './form'
import BookingLinkPanel from './booking-link-panel'
import type { BookingLink } from '@/lib/types'

async function requestBaseUrl() {
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

export default async function DepartureEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: departure } = await admin
    .from('departures')
    .select(`
      *,
      tours (
        id,
        title_en,
        title_ar,
        subtitle_en,
        overview_en,
        type
      )
    `)
    .eq('id', id)
    .single()

  if (!departure) notFound()

  // Get tour days for this departure's tour
  const { data: tourDays } = await admin
    .from('tour_days')
    .select('*')
    .eq('tour_id', departure.tour_id)
    .order('day_number')

  const { data: bookingLinks } = await admin
    .from('booking_links')
    .select('*')
    .eq('departure_id', id)
    .order('created_at', { ascending: false })

  const baseUrl = await requestBaseUrl()
  const tourTitle = (departure as { tours?: { title_en?: string } }).tours?.title_en ?? 'Safari Departure'

  return (
    <div className="space-y-6">
      <DepartureEditForm departure={departure} departureId={id} tourDays={tourDays || []} />

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-4 flex flex-wrap gap-3">
          <Link
            href={`/admin/departures/${id}/manifest`}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Group manifest &amp; agreements →
          </Link>
          <Link
            href={`/admin/vouchers?departure=${id}`}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Hotel vouchers →
          </Link>
        </div>

        <BookingLinkPanel
          departureId={id}
          links={(bookingLinks as BookingLink[]) ?? []}
          baseUrl={baseUrl}
          tourTitle={tourTitle}
        />
      </div>
    </div>
  )
}
