import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import WhatsAppButton from '@/components/public/whatsapp-button'
import FeaturedDepartures from '@/components/public/featured-departures'
import Testimonials from '@/components/public/testimonials'
import HomeHero from '@/components/public/home-hero'
import ChooseYourTrail from '@/components/public/choose-your-trail'
import HomeWhyDirect from '@/components/public/home-why-direct'
import SectionReveal from '@/components/public/section-reveal'
import { getServerLocale } from '@/lib/i18n'
import { whatsappLink } from '@/lib/site'

const BUSH = '#20271A'
const OLIVE = '#7A9A4A'

export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const sp = await searchParams
  const locale = await getServerLocale(sp)
  const isAr = locale === 'ar'
  const dir = isAr ? 'rtl' : 'ltr'

  const supabase = await createClient()

  // Fetch one active tour per type to power the trail cards and hero
  const { data: tours } = await supabase
    .from('tours')
    .select('id, type, hero_image_url, gallery_urls')
    .eq('status', 'active')
    .in('type', ['bike', 'private'])
    .limit(10)

  const bikeTour = (tours ?? []).find(t => t.type === 'bike') ?? null
  const privateTour = (tours ?? []).find(t => t.type === 'private') ?? null

  // Hero image: prefer the bike tour's hero (most dramatic), fall back to private
  const heroTour = bikeTour ?? privateTour
  const heroImageUrl: string | null =
    (heroTour?.hero_image_url as string | null) ??
    ((heroTour?.gallery_urls as string[] | null)?.[0] ?? null)

  const bikeImageUrl: string | null =
    (bikeTour?.hero_image_url as string | null) ??
    ((bikeTour?.gallery_urls as string[] | null)?.[0] ?? null)
  const privateImageUrl: string | null =
    (privateTour?.hero_image_url as string | null) ??
    ((privateTour?.gallery_urls as string[] | null)?.[0] ?? null)

  const waHref = whatsappLink(
    isAr ? 'مرحباً، أود الاستفسار عن جولة' : "Hi, I'd like to enquire about a tour"
  )

  const t = isAr ? {
    credibility1: 'مقرنا نيروبي، كينيا',
    credibility2: 'تأسسنا عام 2009',
    credibility3: 'نتحدث الإنجليزية والعربية والسواحيلية',
    ctaHeading: 'هل أنت مستعد لتخطيط رحلتك؟',
    ctaSub: 'تواصل معنا لتحصل على عرض مخصص، أو ابدأ محادثة على واتساب.',
    ctaQuote: 'طلب عرض سعر',
    ctaWhatsapp: 'تحدث معنا على واتساب',
  } : {
    credibility1: 'Based in Nairobi, Kenya',
    credibility2: 'Operating since 2009',
    credibility3: 'English · Arabic · Swahili',
    ctaHeading: 'Ready to plan your trip?',
    ctaSub: 'Get in touch for a personalised quote, or start a conversation on WhatsApp.',
    ctaQuote: 'Request a Quote',
    ctaWhatsapp: 'Chat on WhatsApp',
  }

  return (
    <div dir={dir}>
      <Suspense>
        <PublicHeader initialLang={locale} />
      </Suspense>

      <main>
        {/* 1. Hero */}
        <HomeHero
          heroImageUrl={heroImageUrl}
          heroTourId={heroTour?.id ?? null}
          isAr={isAr}
          locale={locale}
        />

        {/* 2. Choose Your Trail */}
        <ChooseYourTrail
          bikeCard={{ type: 'bike', imageUrl: bikeImageUrl, tourId: bikeTour?.id ?? null }}
          privateCard={{ type: 'private', imageUrl: privateImageUrl, tourId: privateTour?.id ?? null }}
          isAr={isAr}
          locale={locale}
        />

        {/* 3. Featured Departures */}
        <div style={{ background: '#fff' }}>
          <FeaturedDepartures lang={locale} />
        </div>

        {/* 4. Credibility bar — true claims only, no fabricated metrics */}
        <SectionReveal>
          <section style={{
            background: BUSH,
            padding: '36px 24px',
          }}>
            <div style={{
              maxWidth: 900,
              margin: '0 auto',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '8px 40px',
            }}>
              {[t.credibility1, t.credibility2, t.credibility3].map((fact, i) => (
                <span key={i} style={{
                  color: 'rgba(234,227,210,0.8)',
                  fontFamily: 'var(--font-body, sans-serif)',
                  fontSize: '0.88rem',
                  // Letter-spacing breaks Arabic letter joining — Latin only
                  letterSpacing: isAr ? undefined : '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  {i > 0 && (
                    <span aria-hidden="true" style={{ color: 'rgba(234,227,210,0.3)', fontSize: '1rem' }}>·</span>
                  )}
                  {fact}
                </span>
              ))}
            </div>
          </section>
        </SectionReveal>

        {/* 5. Why Book Direct */}
        <HomeWhyDirect isAr={isAr} />

        {/* 6. Testimonials */}
        <Testimonials lang={locale} />

        {/* 7. Final CTA */}
        <section style={{ background: BUSH, padding: '80px 24px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <SectionReveal>
              <h2 style={{
                fontFamily: 'var(--font-display, "Readex Pro", sans-serif)',
                fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
                fontWeight: 700,
                color: '#fff',
                margin: '0 0 16px',
              }}>
                {t.ctaHeading}
              </h2>
              <p style={{
                color: 'rgba(234,227,210,0.75)',
                fontFamily: 'var(--font-body, sans-serif)',
                fontSize: '1rem',
                lineHeight: 1.7,
                margin: '0 0 36px',
              }}>
                {t.ctaSub}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
                <Link
                  href={`/quote-request?lang=${locale}`}
                  style={{
                    background: OLIVE,
                    color: '#fff',
                    fontFamily: 'var(--font-body, sans-serif)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    padding: '14px 28px',
                    borderRadius: 8,
                    textDecoration: 'none',
                  }}
                >
                  {t.ctaQuote}
                </Link>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#25D366',
                    color: '#fff',
                    fontFamily: 'var(--font-body, sans-serif)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    padding: '14px 28px',
                    borderRadius: 8,
                    textDecoration: 'none',
                  }}
                >
                  {t.ctaWhatsapp}
                </a>
              </div>
            </SectionReveal>
          </div>
        </section>
      </main>

      <PublicFooter />
      <WhatsAppButton lang={locale} />
    </div>
  )
}
