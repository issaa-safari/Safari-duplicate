'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import SafariImage from '@/components/public/safari-image'

const BUSH = '#20271A'
const EASE = [0.22, 1, 0.36, 1] as const

interface HomeHeroProps {
  heroImageUrl: string | null
  heroTourId: string | null
  isAr: boolean
  locale: string
}

export default function HomeHero({ heroImageUrl, heroTourId, isAr, locale }: HomeHeroProps) {
  const reduced = useReducedMotion()
  const dir = isAr ? 'rtl' : 'ltr'

  const t = isAr ? {
    headline: 'اركب البرية. اقتحم البرية.',
    sub: 'جولات دراجات جماعية وسفاري خاصة في كينيا وشرق أفريقيا — مُصممة لمن يطلب أكثر من مجرد رحلة سياحية.',
    cta: 'اختر مسارك',
    quote: 'طلب عرض سعر',
  } : {
    headline: 'LIVE THE ADVENTURE',
    sub: 'Group bike tours and private safaris across Kenya and East Africa — designed for people who want more than a package holiday.',
    cta: 'Plan Your Adventure',
    quote: 'Request a Quote',
  }

  return (
    <section
      dir={dir}
      style={{
        position: 'relative',
        minHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        background: BUSH,
      }}
    >
      {/* Background image */}
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <SafariImage
          src={heroImageUrl}
          seed={heroTourId ?? 'home-hero'}
          alt="Safari Adventure Riders"
          className="w-full h-full"
          sizes="100vw"
          priority
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(20,25,15,0.95) 0%, rgba(20,25,15,0.6) 40%, rgba(20,25,15,0.15) 100%)',
        }} />
      </motion.div>

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 900,
        margin: '0 auto',
        width: '100%',
        padding: '0 24px 80px',
      }}>
        <motion.h1
          initial={reduced ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
          style={{
            fontFamily: 'var(--font-display, "Readex Pro", sans-serif)',
            fontSize: 'clamp(2.4rem, 7vw, 5rem)',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.1,
            margin: '0 0 20px',
            letterSpacing: '-0.01em',
          }}
        >
          {t.headline}
        </motion.h1>

        <motion.p
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
          style={{
            color: 'rgba(234,227,210,0.85)',
            fontFamily: 'var(--font-body, sans-serif)',
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            lineHeight: 1.7,
            margin: '0 0 40px',
            maxWidth: 560,
          }}
        >
          {t.sub}
        </motion.p>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7, ease: EASE }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}
        >
          <a
            href="#choose-trail"
            style={{
              background: '#fff',
              color: BUSH,
              fontFamily: 'var(--font-body, sans-serif)',
              fontWeight: 700,
              fontSize: '1rem',
              padding: '14px 32px',
              borderRadius: 8,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            {t.cta}
          </a>
          <Link
            href={`/quote-request?lang=${locale}`}
            style={{
              border: '2px solid rgba(255,255,255,0.5)',
              color: '#fff',
              fontFamily: 'var(--font-body, sans-serif)',
              fontWeight: 600,
              fontSize: '1rem',
              padding: '12px 28px',
              borderRadius: 8,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            {t.quote}
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
