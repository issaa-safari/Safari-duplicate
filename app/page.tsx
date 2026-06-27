'use client'

import Link from 'next/link'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import FeaturedDepartures from '@/components/public/featured-departures'

const G = '#7A9A4A'

function HomeContent() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const currentLang = searchParams.get('lang') || 'en'

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const t = currentLang === 'ar' ? {
    experienceAfricasSafaris: 'اختبر أعظم الرحلات في أفريقيا',
    discoverUntamed: 'اكتشف جمال إفريقيا الشرقية البري مع أدلاء خبراء وأماكن إقامة فاخرة ومغامرات لا تُنسى.',
    browseTours: 'استعرض الجولات',
    planYourTrip: 'خطط رحلتك',
    happyTravelers: 'مسافرون سعداء',
    uniqueTours: 'جولات فريدة',
    yearsExperience: 'سنوات الخبرة',
    satisfactionRate: 'معدل الرضا',
    whyChooseUs: 'لماذا تختار نا؟',
    expertGuides: 'أدلاء خبراء',
    guideDescription: 'يتمتع أدلاؤنا الطبيعيون بعقود من الخبرة المشتركة في تحديد الحياة البرية ومشاركة قصص البرية الأفريقية.',
    luxuryStays: 'إقامة فاخرة',
    staysDescription: 'أماكن إقامة مختارة بعناية تتراوح من الأكواخ الحميمية إلى المنتجعات عالمية الطراز.',
    peaceOfMind: 'راحة البال',
    mindDescription: 'السلامة هي أولويتنا. تشمل جميع الجولات تأمين السفر والأدلاء المحترفين والدعم 24/7.',
    readyForAdventure: 'هل أنت مستعد لمغامرتك الأفريقية؟',
    getPersonalizedQuote: 'احصل على عرض سعر مخصص لرحلة أحلامك. سيقوم خبراؤنا بتخصيص كل التفاصيل وفقاً لتفضيلاتك.',
    requestCustomQuote: 'طلب عرض سعر مخصص',
  } : {
    experienceAfricasSafaris: 'Experience Africa\'s Greatest Safaris',
    discoverUntamed: 'Discover the untamed beauty of East Africa with expert guides, luxury accommodations, and unforgettable wildlife encounters.',
    browseTours: 'Browse Tours',
    planYourTrip: 'Plan Your Trip',
    happyTravelers: 'Happy Travelers',
    uniqueTours: 'Unique Tours',
    yearsExperience: 'Years Experience',
    satisfactionRate: 'Satisfaction Rate',
    whyChooseUs: 'Why Choose Safari Adventure Riders?',
    expertGuides: 'Expert Guides',
    guideDescription: 'Our naturalist guides have decades of combined experience identifying wildlife and sharing stories of the African bush.',
    luxuryStays: 'Luxury Stays',
    staysDescription: 'Hand-picked accommodations ranging from intimate lodges to world-class resorts, all carefully curated for comfort.',
    peaceOfMind: 'Peace of Mind',
    mindDescription: 'Safety is our priority. All tours include travel insurance, professional guides, and 24/7 support.',
    readyForAdventure: 'Ready for Your African Adventure?',
    getPersonalizedQuote: 'Get a personalized quote for your dream safari. Our experts will tailor every detail to your preferences.',
    requestCustomQuote: 'Request Your Custom Quote',
  }

  return (
    <main>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-gray-900 to-gray-800 text-white py-20 md:py-32">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {t.experienceAfricasSafaris}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            {t.discoverUntamed}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/tours?lang=${currentLang}`}
              className="px-8 py-3 rounded-lg font-semibold transition inline-block text-center"
              style={{ backgroundColor: G, color: 'white' }}
            >
              {t.browseTours}
            </Link>
            <Link
              href={`/quote-request?lang=${currentLang}`}
              className="px-8 py-3 rounded-lg font-semibold border-2 border-white text-white hover:bg-white hover:text-gray-900 transition inline-block text-center"
            >
              {t.planYourTrip}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Stats */}
      <section className="bg-white py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold" style={{ color: G }}>
                500+
              </div>
              <p className="text-gray-600 mt-2">{t.happyTravelers}</p>
            </div>
            <div>
              <div className="text-4xl font-bold" style={{ color: G }}>
                20+
              </div>
              <p className="text-gray-600 mt-2">{t.uniqueTours}</p>
            </div>
            <div>
              <div className="text-4xl font-bold" style={{ color: G }}>
                15+
              </div>
              <p className="text-gray-600 mt-2">{t.yearsExperience}</p>
            </div>
            <div>
              <div className="text-4xl font-bold" style={{ color: G }}>
                99%
              </div>
              <p className="text-gray-600 mt-2">{t.satisfactionRate}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Departures */}
      <FeaturedDepartures lang={currentLang} />

      {/* Why Choose Us */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            {t.whyChooseUs}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-8 border border-gray-200">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{t.expertGuides}</h3>
                <p className="text-gray-600">
                  {t.guideDescription}
                </p>
              </div>
              <div className="bg-white rounded-xl p-8 border border-gray-200">
                <div className="text-4xl mb-4">⭐</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{t.luxuryStays}</h3>
                <p className="text-gray-600">
                  {t.staysDescription}
                </p>
              </div>
              <div className="bg-white rounded-xl p-8 border border-gray-200">
                <div className="text-4xl mb-4">🛡️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{t.peaceOfMind}</h3>
                <p className="text-gray-600">
                  {t.mindDescription}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20" style={{ backgroundColor: G }}>
          <div className="max-w-4xl mx-auto px-4 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t.readyForAdventure}
            </h2>
            <p className="text-lg mb-8 opacity-90">
              {t.getPersonalizedQuote}
            </p>
            <Link
              href={`/quote-request?lang=${currentLang}`}
              className="px-8 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition inline-block"
            >
              {t.requestCustomQuote}
            </Link>
          </div>
        </section>
      </main>
    )
}

export default function HomePage() {
  return (
    <>
      <Suspense>
        <PublicHeader />
      </Suspense>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <HomeContent />
      </Suspense>
      <PublicFooter />
    </>
  )
}
