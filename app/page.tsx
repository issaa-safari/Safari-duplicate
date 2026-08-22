import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import WhatsAppButton from '@/components/public/whatsapp-button'
import FeaturedDepartures from '@/components/public/featured-departures'
import HomeHero from '@/components/public/home-hero'
import ChooseYourTrail from '@/components/public/choose-your-trail'
import HomeWhyDirect from '@/components/public/home-why-direct'
import SectionReveal from '@/components/public/section-reveal'
import SafariImage from '@/components/public/safari-image'
import { getServerLocale } from '@/lib/i18n'
import { whatsappLink } from '@/lib/site'
import type { Metadata } from 'next'
import StructuredData from '@/components/public/structured-data'
import { pageMetadata, travelAgencyJsonLd } from '@/lib/seo'
import { localePath } from '@/lib/locale'
import { getPublicSocialProfiles } from '@/lib/social-server'
import { enabledProfileUrls, type SocialVideo } from '@/lib/social'
import SocialVideoGallery from '@/components/public/social-video-gallery'

const BUSH = '#20271A'
const OLIVE = '#7A9A4A'
const SAND = '#EAE3D2'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}): Promise<Metadata> {
  const locale = await getServerLocale(await searchParams)
  return pageMetadata({
    path: '/',
    locale,
    absoluteTitle: true,
    title: {
      en: 'Safari Adventure Riders — Kenya & Tanzania Safari and Motorbike Tours',
      ar: 'سفاري أدفنتشر رايدرز — رحلات سفاري ودراجات نارية في كينيا وتنزانيا',
    },
    description: {
      en: 'Expert-led safaris and motorbike tours across Kenya and Tanzania. Custom itineraries, Masai Mara and Serengeti departures, booked direct with the operator.',
      ar: 'رحلات سفاري وجولات دراجات نارية في كينيا وتنزانيا بإشراف خبراء. برامج مخصصة، ورحلات إلى ماساي مارا وسيرينجيتي، وحجز مباشر مع المشغّل.',
    },
  })
}

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
  const [{ data: tours }, { data: featuredVideos }, socialProfiles] = await Promise.all([
    supabase
      .from('tours')
      .select('id, type, hero_image_url, gallery_urls')
      .eq('status', 'active')
      .eq('show_on_website', true)
      .in('type', ['bike', 'private'])
      .limit(10),
    supabase
      .from('social_videos')
      .select('*')
      .eq('is_published', true)
      .eq('is_featured', true)
      .order('sort_order')
      .limit(3),
    getPublicSocialProfiles(),
  ])

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
    credibility2: 'نتحدث الإنجليزية والعربية والسواحيلية',
    ctaHeading: 'هل أنت مستعد لتخطيط رحلتك؟',
    ctaSub: 'تواصل معنا لتحصل على عرض مخصص، أو ابدأ محادثة على واتساب.',
    ctaQuote: 'طلب عرض سعر',
    ctaWhatsapp: 'تحدث معنا على واتساب',
    storyHeading: 'كينيا وطننا… والمغامرة تخصصنا',
    storyLines: [
      'نعمل من قلب نيروبي — هذا بيتنا، مو مجرد مكتب.',
      'نركب الطرق ونقود المسارات اللي نبيعها بأنفسنا.',
      'ما نبيعك رحلة جاهزة. كل رحلة نبنيها حسب أسلوبك.',
    ],
    emotionalHeading: 'لا تزور أفريقيا… عِشها',
    emotionalLines: [
      'اصحَ على صوت البرية.',
      'اركب وادي الصدع مع أول خيوط الفجر.',
      'اسلك طرقاً ما تجدها في أي دليل سياحي.',
      'شاهد الشمس تختفي خلف المرتفعات.',
    ],
    emotionalClose: 'هذه مو إجازة جاهزة. هذه أفريقيا، على طريقتك.',
    emotionalCta: 'ابدأ مغامرتك',
    kenyaHeading: 'كينيا أكثر من مجرد سفاري',
    kenyaBody: 'مساراتنا تمر بمناظر تجعل كينيا أكثر من مجرد وجهة سفاري — وادي الصدع العظيم، بحيرات المرتفعات، غابات جبل كينيا، ومحميات الحياة البرية بينها.',
    kenyaChips: ['الصدع العظيم', 'بحيرة نيفاشا', 'جبل كينيا', 'مرتفعات الشاي', 'محمية أول بيجيتا'],
  } : {
    credibility1: 'Based in Nairobi, Kenya',
    credibility2: 'English · Arabic · Swahili',
    ctaHeading: 'Ready to plan your trip?',
    ctaSub: 'Get in touch for a personalised quote, or start a conversation on WhatsApp.',
    ctaQuote: 'Request a Quote',
    ctaWhatsapp: 'Chat on WhatsApp',
    storyHeading: 'Africa is our home. Adventure is our business.',
    storyLines: [
      "We're based in Nairobi — this is where we live, not just where we work.",
      'We ride the trails and drive the routes we sell.',
      "No packaged holiday. Every trip is built around how you want to travel.",
    ],
    emotionalHeading: "Don't just visit Africa. Experience it.",
    emotionalLines: [
      'Wake up to the sound of the bush.',
      'Ride the Rift Valley at first light.',
      "Follow roads that don't make it into the guidebooks.",
      'Watch the sun drop behind the highlands.',
    ],
    emotionalClose: "This isn't a package holiday. It's Africa, on your terms.",
    emotionalCta: 'Start Your Adventure',
    kenyaHeading: 'Kenya is more than a safari',
    kenyaBody: "Our routes run through the landscapes that make Kenya more than its safari reputation — the Great Rift Valley, the lakes of the highlands, Mount Kenya's forests, and the wildlife reserves in between.",
    kenyaChips: ['Great Rift Valley', 'Lake Naivasha', 'Mount Kenya', 'Highland Tea Country', 'Ol Pejeta Conservancy'],
  }

  return (
    <div dir={dir}>
      <StructuredData data={travelAgencyJsonLd(enabledProfileUrls(socialProfiles))} />
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

        {/* 3. Brand story */}
        <SectionReveal>
          <section style={{ background: '#fff', padding: '80px 24px' }}>
            <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
              <h2 style={{
                fontFamily: 'var(--font-display, "Readex Pro", sans-serif)',
                fontSize: 'clamp(1.6rem, 3.5vw, 2.3rem)',
                fontWeight: 700,
                color: BUSH,
                margin: '0 0 28px',
              }}>
                {t.storyHeading}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {t.storyLines.map((line, i) => (
                  <p key={i} style={{
                    color: '#3D3D35',
                    fontFamily: 'var(--font-body, sans-serif)',
                    fontSize: 'clamp(1rem, 2vw, 1.15rem)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </section>
        </SectionReveal>

        {/* 4. Featured Departures */}
        <div style={{ background: '#fff' }}>
          <FeaturedDepartures lang={locale} />
        </div>

        {/* 5. Credibility bar — true claims only, no fabricated metrics */}
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
              {[t.credibility1, t.credibility2].map((fact, i) => (
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

        {/* 6. Why Book Direct */}
        <HomeWhyDirect isAr={isAr} />

        {/* 7. Emotional editorial — cinematic pause before the final push */}
        <SectionReveal>
          <section
            style={{
              position: 'relative',
              padding: '100px 24px',
              background: BUSH,
              overflow: 'hidden',
            }}
          >
            {heroImageUrl && (
              <div style={{ position: 'absolute', inset: 0 }}>
                <SafariImage
                  src={heroImageUrl}
                  seed={heroTour?.id ?? 'emotional'}
                  alt=""
                  className="w-full h-full"
                  sizes="100vw"
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(rgba(20,25,15,0.88), rgba(20,25,15,0.88))',
                }} />
              </div>
            )}
            <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
              <h2 style={{
                fontFamily: 'var(--font-display, "Readex Pro", sans-serif)',
                fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                fontWeight: 700,
                color: '#fff',
                margin: '0 0 32px',
              }}>
                {t.emotionalHeading}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                {t.emotionalLines.map((line, i) => (
                  <p key={i} style={{
                    color: 'rgba(234,227,210,0.85)',
                    fontFamily: 'var(--font-body, sans-serif)',
                    fontSize: 'clamp(1rem, 2vw, 1.15rem)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {line}
                  </p>
                ))}
              </div>
              <p style={{
                color: '#fff',
                fontFamily: 'var(--font-body, sans-serif)',
                fontWeight: 600,
                fontSize: '1.05rem',
                margin: '0 0 36px',
              }}>
                {t.emotionalClose}
              </p>
              <Link
                href={localePath('/quote-request', locale)}
                style={{
                  display: 'inline-block',
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
                {t.emotionalCta}
              </Link>
            </div>
          </section>
        </SectionReveal>

        {/* 8. Kenya — grounded in the destinations our routes actually visit */}
        <SectionReveal>
          <section style={{ background: SAND, padding: '80px 24px' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
              <h2 style={{
                fontFamily: 'var(--font-display, "Readex Pro", sans-serif)',
                fontSize: 'clamp(1.6rem, 3.5vw, 2.3rem)',
                fontWeight: 700,
                color: BUSH,
                margin: '0 0 20px',
              }}>
                {t.kenyaHeading}
              </h2>
              <p style={{
                color: '#3D3D35',
                fontFamily: 'var(--font-body, sans-serif)',
                fontSize: '1.05rem',
                lineHeight: 1.7,
                margin: '0 0 32px',
              }}>
                {t.kenyaBody}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
                {t.kenyaChips.map((chip) => (
                  <span key={chip} style={{
                    background: '#fff',
                    border: '1px solid #DDD8CC',
                    borderRadius: 99,
                    padding: '8px 18px',
                    color: '#3D5229',
                    fontFamily: 'var(--font-body, sans-serif)',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                  }}>
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </SectionReveal>

        <SocialVideoGallery videos={(featuredVideos ?? []) as SocialVideo[]} locale={locale} />

        {/* 9. Final CTA */}
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
                  href={localePath('/quote-request', locale)}
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
