'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import SafariImage from '@/components/public/safari-image'

const G = '#7A9A4A'

function formatDate(dateStr: string, locale: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function daysCount(start: string, end: string) {
  if (!start || !end) return 0
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
}

export default function FeaturedDepartures({ lang }: { lang: string }) {
  const [departures, setDepartures] = useState<any[] | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/departures')
      .then((r) => r.json())
      .then((d) => { if (active) setDepartures(d.departures ?? []) })
      .catch(() => { if (active) setDepartures([]) })
    return () => { active = false }
  }, [])

  const t = lang === 'ar' ? {
    heading: 'الرحلات القادمة',
    subheading: 'احجز مكانك في إحدى مغامرات السفاري ذات التواريخ المحددة',
    viewAll: 'عرض جميع الرحلات',
    viewDetails: 'عرض التفاصيل وبرنامج الرحلة',
    perPerson: 'للفرد',
    spotsLeft: 'مقاعد متبقية',
    full: 'مكتمل',
    days: 'أيام',
    none: 'لا توجد رحلات منشورة حالياً. تحقق قريباً!',
  } : {
    heading: 'Upcoming Departures',
    subheading: 'Reserve your place on one of our fixed-date safari adventures',
    viewAll: 'View all departures',
    viewDetails: 'View details & itinerary',
    perPerson: 'per person',
    spotsLeft: 'spots left',
    full: 'Fully booked',
    days: 'days',
    none: 'No departures published yet. Check back soon!',
  }

  if (departures === null) {
    return (
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-400">Loading departures…</div>
      </section>
    )
  }

  if (departures.length === 0) return null

  return (
    <section className="py-16 md:py-20 bg-white" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t.heading}</h2>
            <p className="text-gray-600 mt-2">{t.subheading}</p>
          </div>
          <Link href={`/departures?lang=${lang}`} className="hidden md:inline text-sm font-semibold hover:underline" style={{ color: G }}>
            {t.viewAll} →
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departures.map((dep) => {
            const tour = dep.tours as any
            const title = lang === 'ar' ? (tour?.title_ar || tour?.title_en) : tour?.title_en
            const available = dep.max_seats - dep.booked_seats
            const isAvailable = available > 0 && dep.status === 'available'
            return (
              <Link
                key={dep.id}
                href={`/departures/${dep.id}?lang=${lang}`}
                className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition"
              >
                <SafariImage
                  src={tour?.hero_image_url || tour?.gallery_urls?.[0]}
                  seed={dep.id}
                  alt={title || 'Safari departure'}
                  className="h-40 w-full"
                />
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{title}</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {formatDate(dep.start_date, lang)} · {daysCount(dep.start_date, dep.end_date)} {t.days}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold" style={{ color: G }}>
                      ${dep.price_usd?.toLocaleString()}
                      <span className="text-xs font-normal text-gray-500 ml-1">{t.perPerson}</span>
                    </span>
                    <span className={`text-xs font-medium ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                      {isAvailable ? `${available} ${t.spotsLeft}` : t.full}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold" style={{ color: G }}>{t.viewDetails} →</p>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link href={`/departures?lang=${lang}`} className="text-sm font-semibold hover:underline" style={{ color: G }}>
            {t.viewAll} →
          </Link>
        </div>
      </div>
    </section>
  )
}
