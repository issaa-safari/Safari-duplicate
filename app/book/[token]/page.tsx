import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { getServerLocale } from '@/lib/i18n'
import BookingLinkForm from './booking-link-form'

export const dynamic = 'force-dynamic'

function fmtDate(d: string | null, ar: boolean) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(ar ? 'ar-SA-u-ca-gregory' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default async function BookingLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { token } = await params
  const sp = await searchParams
  const admin = createAdminClient()

  const { data: link } = await admin
    .from('booking_links')
    .select('id, departure_id, language, is_active, expires_at, max_bookings, use_count')
    .eq('token', token)
    .maybeSingle()

  if (!link) notFound()

  // The link carries its own preferred language, but ?lang= still wins if present.
  const locale = await getServerLocale({ lang: sp.lang ?? link.language })
  const ar = locale === 'ar'

  const { data: departure } = await admin
    .from('departures')
    .select('id, start_date, end_date, price_usd, max_seats, booked_seats, status, tours ( title_en, title_ar )')
    .eq('id', link.departure_id)
    .maybeSingle()

  if (!departure) notFound()

  const tour = (departure as { tours?: { title_en?: string; title_ar?: string } }).tours
  const tourTitle = (ar ? tour?.title_ar : tour?.title_en) || tour?.title_en || 'Safari Departure'
  const seatsLeft = Math.max(0, departure.max_seats - departure.booked_seats)

  const expired = !!(link.expires_at && new Date(link.expires_at) < new Date())
  const limitReached = link.max_bookings != null && link.use_count >= link.max_bookings
  const closed = !link.is_active || expired || limitReached ||
    seatsLeft === 0 || ['closed', 'cancelled', 'full'].includes(departure.status)

  const L = ar
    ? {
        heading: 'أكمل حجزك',
        closedTitle: 'هذا الرابط غير متاح',
        closedBody: 'هذا الرابط لم يعد يقبل الحجوزات. يرجى التواصل معنا مباشرةً.',
      }
    : {
        heading: 'Complete your booking',
        closedTitle: 'This link is no longer available',
        closedBody: 'This booking link is no longer accepting bookings. Please contact us directly.',
      }

  return (
    <main dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50">
      {ar && <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" />}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 md:py-16">
        <div className="max-w-2xl mx-auto px-4 text-center" style={ar ? { fontFamily: "'Cairo', sans-serif" } : undefined}>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{L.heading}</h1>
          <p className="text-lg text-gray-300">{tourTitle}</p>
          <p className="mt-1 text-sm text-gray-400">
            {fmtDate(departure.start_date, ar)} – {fmtDate(departure.end_date, ar)}
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-2xl mx-auto px-4" style={ar ? { fontFamily: "'Cairo', sans-serif" } : undefined}>
          {closed ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
              <h2 className="text-xl font-bold text-amber-900 mb-2">{L.closedTitle}</h2>
              <p className="text-amber-800">{L.closedBody}</p>
            </div>
          ) : (
            <BookingLinkForm
              token={token}
              locale={locale}
              pricePerPerson={Number(departure.price_usd) || 0}
              seatsLeft={seatsLeft}
            />
          )}
        </div>
      </section>
    </main>
  )
}
