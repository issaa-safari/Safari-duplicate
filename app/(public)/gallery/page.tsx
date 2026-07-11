import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import SafariImage from '@/components/public/safari-image'
import WhatsAppButton from '@/components/public/whatsapp-button'
import { getServerLocale } from '@/lib/i18n'
import { STOCK_HERO_IMAGE, STOCK_SAFARI_IMAGES } from '@/lib/stock-images'

const G = '#7A9A4A'

export const dynamic = 'force-dynamic'

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const sp = await searchParams
  const locale = await getServerLocale(sp)
  const isAr = locale === 'ar'

  const admin = createAdminClient()
  const { data: tours } = await admin
    .from('tours')
    .select('id, title_en, title_ar, hero_image_url, gallery_urls')
    .eq('status', 'active')

  // Collect every real image (hero + gallery) across active tours.
  type Shot = { src: string; caption: string }
  const shots: Shot[] = []
  for (const tour of tours ?? []) {
    const caption = (isAr ? (tour.title_ar || tour.title_en) : tour.title_en) || ''
    if (tour.hero_image_url) shots.push({ src: tour.hero_image_url, caption })
    for (const u of (tour.gallery_urls ?? []) as string[]) {
      if (u) shots.push({ src: u, caption })
    }
  }

  // If there are no uploaded images yet, show a tasteful curated set so the
  // page never looks empty.
  const usingStock = shots.length === 0
  const items: Shot[] = usingStock
    ? STOCK_SAFARI_IMAGES.map((src) => ({ src, caption: '' }))
    : shots

  const t = isAr
    ? {
        title: 'معرض الصور',
        subtitle: 'لمحات من مغامراتنا عبر براري شرق أفريقيا.',
        cta: 'خطط رحلتك',
        note: 'صور توضيحية — سيتم استبدالها بصور رحلاتك الفعلية.',
      }
    : {
        title: 'Gallery',
        subtitle: 'Glimpses from our adventures across the wilds of East Africa.',
        cta: 'Plan your trip',
        note: 'Sample imagery — replaced automatically as you upload tour photos.',
      }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <PublicHeader initialLang={locale} />
      <main>
        <section
          className="bg-gray-900 text-white py-16 md:py-24 bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(rgba(17,24,39,0.62), rgba(17,24,39,0.72)), url(${STOCK_HERO_IMAGE})` }}
        >
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.title}</h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">{t.subtitle}</p>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((shot, i) => (
                <div key={i} className="group relative rounded-xl overflow-hidden">
                  <SafariImage
                    src={shot.src}
                    seed={i}
                    alt={shot.caption || 'Safari photo'}
                    className="aspect-square w-full"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    useStockFallback={false}
                  />
                  {shot.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition">
                      <span className="text-white text-sm font-medium">{shot.caption}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {usingStock && (
              <p className="mt-6 text-center text-xs text-gray-400">{t.note}</p>
            )}

            <div className="mt-12 text-center">
              <Link
                href={`/quote-request?lang=${locale}`}
                className="px-8 py-3 rounded-lg font-semibold text-white transition inline-block"
                style={{ backgroundColor: G }}
              >
                {t.cta}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
      <WhatsAppButton lang={locale} />
    </div>
  )
}
