import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import SafariImage from '@/components/public/safari-image'
import WhatsAppButton from '@/components/public/whatsapp-button'
import { getServerLocale } from '@/lib/i18n'
import { STOCK_HERO_IMAGE } from '@/lib/stock-images'

const G = '#7A9A4A'

export const dynamic = 'force-dynamic'

export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const sp = await searchParams
  const locale = await getServerLocale(sp)
  const isAr = locale === 'ar'

  const admin = createAdminClient()

  // Use the real tours columns: tours are gated by `status`, not `is_active`,
  // and carry duration_days / countries_visited (not country/min_days/max_days).
  const { data: tours } = await admin
    .from('tours')
    .select('id, title_en, title_ar, subtitle_en, overview_en, type, duration_days, duration_nights, countries_visited, status, hero_image_url, gallery_urls')
    .eq('status', 'active')
    .order('title_en')

  const t = isAr ? {
    title: 'جولات السفاري لدينا',
    subtitle: 'استكشف مجموعتنا المختارة من تجارب السفاري التي لا تُنسى في شرق أفريقيا. كل جولة مصممة لإبراز أروع الحياة البرية والمناظر الطبيعية في أفريقيا.',
    days: 'أيام',
    requestQuote: 'طلب عرض سعر',
    none: 'لا توجد جولات متاحة بعد. تحقق قريباً!',
    ctaTitle: 'لم تجد الجولة المثالية؟',
    ctaText: 'أخبرنا بتفضيلاتك وسننشئ رحلة سفاري مخصصة لك.',
    ctaButton: 'أنشئ جولة مخصصة',
  } : {
    title: 'Our Safari Tours',
    subtitle: "Explore our curated collection of unforgettable East African safari experiences. Each tour is designed to showcase Africa's most incredible wildlife and landscapes.",
    days: 'days',
    requestQuote: 'Request Quote',
    none: 'No tours available yet. Check back soon!',
    ctaTitle: "Can't Find the Perfect Tour?",
    ctaText: "Let us know your preferences and we'll create a custom safari just for you.",
    ctaButton: 'Create a Custom Tour',
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <PublicHeader />
      <main>
        {/* Page Header */}
        <section
          className="bg-gray-900 text-white py-16 md:py-24 bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(rgba(17,24,39,0.62), rgba(17,24,39,0.72)), url(${STOCK_HERO_IMAGE})` }}
        >
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.title}</h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">{t.subtitle}</p>
          </div>
        </section>

        {/* Tours Grid */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            {tours && tours.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {tours.map((tour: any) => {
                  const title = isAr ? (tour.title_ar || tour.title_en) : tour.title_en
                  const desc = tour.overview_en || tour.subtitle_en || ''
                  return (
                    <div key={tour.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition">
                      <SafariImage
                        src={tour.hero_image_url || tour.gallery_urls?.[0]}
                        seed={tour.id}
                        alt={title}
                        className="w-full h-48"
                      />
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                        {tour.countries_visited && (
                          <p className="text-sm text-gray-500 mb-3">{tour.countries_visited}</p>
                        )}
                        {tour.duration_days && (
                          <p className="text-sm text-gray-600 mb-4">
                            <span className="font-semibold">{tour.duration_days} {t.days}</span>
                          </p>
                        )}
                        {desc && <p className="text-sm text-gray-600 mb-6 line-clamp-3">{desc}</p>}
                        <Link
                          href={`/tours/${tour.id}?lang=${locale}`}
                          className="block text-center px-4 py-2 rounded-lg font-semibold text-white transition"
                          style={{ backgroundColor: G }}
                        >
                          {t.requestQuote}
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">{t.none}</p>
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{t.ctaTitle}</h2>
            <p className="text-lg text-gray-600 mb-8">{t.ctaText}</p>
            <Link
              href={`/quote-request?lang=${locale}`}
              className="px-8 py-3 rounded-lg font-semibold text-white transition inline-block"
              style={{ backgroundColor: G }}
            >
              {t.ctaButton}
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
      <WhatsAppButton lang={locale} />
    </div>
  )
}
