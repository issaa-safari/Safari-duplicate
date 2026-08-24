import { notFound } from 'next/navigation'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import WhatsAppButton from '@/components/public/whatsapp-button'
import DepartureBookingForm from '@/components/public/departure-booking-form'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerLocale } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

function formatDate(value: string, ar: boolean) {
  return new Date(value).toLocaleDateString(ar ? 'ar-SA-u-ca-gregory' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function DepartureBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const locale = await getServerLocale()
  const ar = locale === 'ar'
  const admin = createAdminClient()

  const { data: departure } = await admin
    .from('departures')
    .select(`
      id, start_date, end_date, price_usd, price_single_usd,
      security_deposit_usd, max_seats, booked_seats, status,
      tours!inner ( title_en, title_ar )
    `)
    .eq('id', id)
    .eq('kind', 'scheduled_group')
    .eq('is_active', true)
    .eq('is_public', true)
    .eq('tours.status', 'active')
    .eq('tours.show_on_website', true)
    .maybeSingle()

  if (!departure) notFound()

  const tour = (departure as { tours?: { title_en?: string; title_ar?: string } }).tours
  const title = (ar ? tour?.title_ar : tour?.title_en) || tour?.title_en || (ar ? 'رحلة سفاري' : 'Safari departure')
  const seatsLeft = Math.max(0, departure.max_seats - departure.booked_seats)
  const closed = seatsLeft === 0 || ['closed', 'cancelled', 'full'].includes(departure.status)

  const text = ar
    ? {
        heading: 'أكمل حجزك',
        closedTitle: 'هذه الرحلة غير متاحة للحجز',
        closedBody: 'يرجى التواصل معنا للتحقق من تواريخ أو خيارات بديلة.',
      }
    : {
        heading: 'Complete your booking',
        closedTitle: 'This departure is not available to book',
        closedBody: 'Please contact us to check alternative dates or options.',
      }

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50">
      <PublicHeader initialLang={locale} />
      <main>
        <section className="bg-gradient-to-b from-gray-900 to-gray-800 py-12 text-white md:py-16">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <h1 className="mb-3 text-3xl font-bold md:text-4xl">{text.heading}</h1>
            <p className="text-lg text-gray-300">{title}</p>
            <p className="mt-1 text-sm text-gray-400">
              {formatDate(departure.start_date, ar)} – {formatDate(departure.end_date, ar)}
            </p>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-2xl px-4">
            {closed ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
                <h2 className="mb-2 text-xl font-bold text-amber-900">{text.closedTitle}</h2>
                <p className="text-amber-800">{text.closedBody}</p>
              </div>
            ) : (
              <DepartureBookingForm
                submitUrl={`/api/departures/${id}/book`}
                locale={locale}
                pricePerPerson={departure.price_usd == null ? null : Number(departure.price_usd)}
                singlePricePerPerson={departure.price_single_usd == null ? null : Number(departure.price_single_usd)}
                depositPerPerson={Number(departure.security_deposit_usd) || 0}
                seatsLeft={seatsLeft}
              />
            )}
          </div>
        </section>
      </main>
      <PublicFooter />
      <WhatsAppButton lang={locale} />
    </div>
  )
}
