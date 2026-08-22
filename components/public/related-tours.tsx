import Link from 'next/link'
import SafariImage from '@/components/public/safari-image'
import { localePath, type Locale } from '@/lib/locale'
import type { RelatedTourCandidate } from '@/lib/tour-seo-engine'

export default function RelatedTours({ tours, locale }: { tours: RelatedTourCandidate[]; locale: Locale }) {
  if (tours.length === 0) return null
  const isAr = locale === 'ar'
  return (
    <section style={{ padding: '72px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 700, color: '#20271A', marginBottom: 28 }}>
          {isAr ? 'رحلات قد تناسبك أيضاً' : 'You May Also Like'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {tours.map((tour) => {
            const title = isAr ? tour.title_ar || tour.title_en : tour.title_en
            const overview = isAr ? tour.overview_ar || tour.overview_en : tour.overview_en
            return (
              <article key={tour.id} style={{ overflow: 'hidden', borderRadius: 14, border: '1px solid #DDD8CC', background: '#fff' }}>
                <Link href={localePath(`/tours/${tour.slug ?? tour.id}`, locale)} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <SafariImage src={tour.hero_image_url} seed={tour.id} alt={title} className="h-52 w-full" sizes="(max-width: 768px) 100vw, 33vw" />
                  <div style={{ padding: 20 }}>
                    <h3 style={{ color: '#20271A', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{title}</h3>
                    {tour.duration_days && <p style={{ color: '#7A9A4A', fontSize: 13, fontWeight: 700, margin: '7px 0 0' }}>{tour.duration_days} {isAr ? 'أيام' : 'days'}</p>}
                    {overview && <p style={{ color: '#6E6A59', fontSize: '0.9rem', lineHeight: 1.6, margin: '10px 0 0' }}>{overview.slice(0, 150)}{overview.length > 150 ? '…' : ''}</p>}
                  </div>
                </Link>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
