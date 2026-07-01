'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'

export interface DepartureCardData {
  id: string
  startDate: string
  endDate: string
  maxSeats: number
  bookedSeats: number
  priceUsd: number | null
  status: string
}

interface DepartureCardsProps {
  departures: DepartureCardData[]
  accentColor: string
  isAr: boolean
  tourTitle: string
  locale: string
}

const OLIVE = '#7A9A4A'
const STONE = '#6E6A59'
const SAND = '#EAE3D2'

function formatDate(d: string, locale: string) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function daysCount(start: string, end: string) {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
}

function StatusBadge({ seats, status, isAr }: { seats: number; status: string; isAr: boolean }) {
  if (status === 'cancelled') {
    return <span style={{ padding: '3px 10px', borderRadius: 99, background: '#fee2e2', color: '#b91c1c', fontSize: 12, fontWeight: 600 }}>{isAr ? 'ملغي' : 'Cancelled'}</span>
  }
  if (seats <= 0 || status === 'full') {
    return <span style={{ padding: '3px 10px', borderRadius: 99, background: '#f3f4f6', color: '#6b7280', fontSize: 12, fontWeight: 600 }}>{isAr ? 'مكتمل' : 'Fully Booked'}</span>
  }
  if (seats <= 3) {
    return <span style={{ padding: '3px 10px', borderRadius: 99, background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 600 }}>{isAr ? `${seats} مقاعد فقط` : `${seats} seats left`}</span>
  }
  if (status === 'guaranteed') {
    return <span style={{ padding: '3px 10px', borderRadius: 99, background: '#dcfce7', color: '#166534', fontSize: 12, fontWeight: 600 }}>{isAr ? 'مضمون' : 'Guaranteed'}</span>
  }
  return <span style={{ padding: '3px 10px', borderRadius: 99, background: '#dcfce7', color: '#166534', fontSize: 12, fontWeight: 600 }}>{isAr ? `${seats} متاح` : `${seats} available`}</span>
}

export default function DepartureCards({ departures, accentColor, isAr, tourTitle, locale }: DepartureCardsProps) {
  const reduced = useReducedMotion()
  const dir = isAr ? 'rtl' : 'ltr'

  if (departures.length === 0) {
    return (
      <div dir={dir} style={{
        background: SAND, borderRadius: 12, padding: '40px 32px', textAlign: 'center',
        border: '1px solid #DDD8CC',
      }}>
        <p style={{ fontSize: '1.1rem', color: '#20271A', fontWeight: 600, marginBottom: 8, fontFamily: 'var(--font-display, sans-serif)' }}>
          {isAr ? 'لا توجد مواعيد محددة حالياً' : 'No fixed dates right now'}
        </p>
        <p style={{ color: STONE, marginBottom: 24, fontFamily: 'var(--font-body, sans-serif)' }}>
          {isAr ? 'هذه الجولة متاحة بطلب مسبق — اتصل بنا للتحدث عن تواريخك.' : 'This tour is available on request — get in touch to discuss your dates.'}
        </p>
        <a
          href={`/quote-request?tour=${tourTitle}&lang=${locale}`}
          style={{
            display: 'inline-block', padding: '12px 28px', borderRadius: 8,
            background: OLIVE, color: '#fff', fontWeight: 700, textDecoration: 'none',
            fontFamily: 'var(--font-body, sans-serif)',
          }}
        >
          {isAr ? 'استفسر عن التواريخ' : 'Enquire About Dates'}
        </a>
      </div>
    )
  }

  return (
    <div dir={dir} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {departures.map((dep, i) => {
        const seats = dep.maxSeats - dep.bookedSeats
        const available = seats > 0 && dep.status !== 'cancelled' && dep.status !== 'full'
        const pct = Math.min(100, Math.round((dep.bookedSeats / dep.maxSeats) * 100))
        const bookHref = `/departures/${dep.id}/book?lang=${locale}&price=${dep.priceUsd}&tour=${encodeURIComponent(tourTitle)}`
        const detailHref = `/departures/${dep.id}?lang=${locale}`

        return (
          <motion.div
            key={dep.id}
            initial={reduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={reduced ? {} : { y: -2, boxShadow: '0 8px 32px rgba(32,39,26,0.12)' }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            viewport={{ once: true, margin: '-40px' }}
            style={{
              background: available ? '#fff' : '#f9f9f7',
              borderRadius: 14,
              border: `1px solid ${available ? '#E5E0D8' : '#EDEAE4'}`,
              borderInlineStart: available ? `4px solid ${accentColor}` : '4px solid #EDEAE4',
              padding: '20px 24px',
              display: 'flex', flexWrap: 'wrap', alignItems: 'center',
              gap: 20,
              opacity: available ? 1 : 0.7,
            }}
          >
            {/* Dates */}
            <div style={{ flex: '1 1 200px' }}>
              <div style={{
                fontFamily: 'var(--font-display, sans-serif)',
                fontSize: '1.05rem', fontWeight: 600, color: '#20271A', marginBottom: 4,
              }}>
                {formatDate(dep.startDate, locale)}
                <span style={{ color: STONE, margin: '0 8px' }}>{isAr ? '←' : '→'}</span>
                {formatDate(dep.endDate, locale)}
              </div>
              <div style={{ fontSize: 13, color: STONE, fontFamily: 'var(--font-body, sans-serif)' }}>
                {daysCount(dep.startDate, dep.endDate)} {isAr ? 'أيام' : 'days'}
              </div>
            </div>

            {/* Seats + progress */}
            <div style={{ flex: '1 1 160px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <StatusBadge seats={seats} status={dep.status} isAr={isAr} />
              </div>
              <div style={{ height: 4, borderRadius: 99, background: '#EAE3D2', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }}
                  viewport={{ once: true }}
                  style={{ height: '100%', background: pct >= 80 ? '#B0492B' : OLIVE, borderRadius: 99 }}
                />
              </div>
              <div style={{ fontSize: 11, color: STONE, marginTop: 4, fontFamily: 'var(--font-body, sans-serif)' }}>
                {dep.bookedSeats}/{dep.maxSeats} {isAr ? 'محجوز' : 'booked'}
              </div>
            </div>

            {/* Price + CTAs */}
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {dep.priceUsd != null && (
                <div style={{ textAlign: isAr ? 'right' : 'left' }}>
                  <div style={{ fontSize: 11, color: STONE }}>{isAr ? 'للفرد' : 'per person'}</div>
                  <div style={{
                    fontFamily: 'var(--font-display, sans-serif)',
                    fontSize: '1.35rem', fontWeight: 700, color: '#20271A',
                  }}>
                    ${dep.priceUsd.toLocaleString()}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Link
                  href={detailHref}
                  style={{
                    padding: '9px 16px', borderRadius: 7,
                    border: `1.5px solid ${OLIVE}`, color: OLIVE,
                    fontWeight: 600, fontSize: 13, textDecoration: 'none',
                    fontFamily: 'var(--font-body, sans-serif)',
                  }}
                >
                  {isAr ? 'التفاصيل' : 'Details'}
                </Link>
                {available && (
                  <Link
                    href={bookHref}
                    style={{
                      padding: '9px 16px', borderRadius: 7,
                      background: accentColor, color: '#fff',
                      fontWeight: 700, fontSize: 13, textDecoration: 'none',
                      fontFamily: 'var(--font-body, sans-serif)',
                    }}
                  >
                    {isAr ? 'احجز' : 'Book'}
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
