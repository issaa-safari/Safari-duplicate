'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import type { ReactNode } from 'react'

interface TourHeroProps {
  tourTitle: string
  subtitle: string | null
  routeText: string | null
  durationDays: number | null
  distanceKm: number | null
  groupSize: number | null
  terrain: string | null
  accentColor: string
  price: number | null
  isAvailable: boolean
  bookHref: string
  enquireHref: string
  isAr: boolean
  imageSlot: ReactNode
  tripLabel: string | null
}

const chip = () => ({
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  gap: 6,
  padding: '5px 15px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.08)',
  border: `1px solid rgba(255,255,255,0.24)`,
  fontSize: 13,
  fontWeight: 600,
  color: '#fff',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  letterSpacing: '0.02em',
  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08)`,
})

export default function TourHero({
  tourTitle,
  subtitle,
  routeText,
  durationDays,
  distanceKm,
  groupSize,
  terrain,
  accentColor,
  price,
  isAvailable,
  bookHref,
  enquireHref,
  isAr,
  imageSlot,
  tripLabel,
}: TourHeroProps) {
  const reduced = useReducedMotion()
  const dir = isAr ? 'rtl' : 'ltr'

  const EASE = [0.22, 1, 0.36, 1] as const

  // `initial` stays identical between server and client renders (server can't know the
  // client's prefers-reduced-motion) — only the transition duration is gated, so a
  // reduced-motion client lands on `animate` instantly instead of a hydration mismatch
  // leaving the element stuck at its initial (invisible) state.
  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0 : 0.6, delay: reduced ? 0 : delay, ease: EASE },
  })

  const imageAnim = {
    initial: { opacity: 0, scale: 1.06 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: reduced ? 0 : 1.1, ease: EASE },
  }

  const chips = [
    durationDays ? `${durationDays} ${isAr ? 'يوم' : 'days'}` : null,
    distanceKm ? `${distanceKm.toLocaleString()} km` : null,
    groupSize ? `${isAr ? 'حتى' : 'max'} ${groupSize}` : null,
    terrain ?? null,
  ].filter(Boolean) as string[]

  return (
    <section
      id="tour-hero"
      dir={dir}
      style={{ position: 'relative', minHeight: '92vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden', background: '#20271A' }}
    >
      {/* Background image */}
      <motion.div
        {...imageAnim}
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      >
        {imageSlot}
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(20,25,15,0.92) 0%, rgba(20,25,15,0.55) 45%, rgba(20,25,15,0.18) 100%)',
        }} />
        {/* Accent-tinted ambient glow — murram for moto, gold for safari */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 60% 50% at ${isAr ? '85%' : '15%'} 100%, ${accentColor}33 0%, transparent 60%)`,
        }} />
      </motion.div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '0 24px 64px' }}>

        {/* Trip type badge */}
        {tripLabel && (
          <motion.div {...fadeUp(0.12)} style={{ marginBottom: 20 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 16px',
              borderRadius: 4,
              background: accentColor,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-body, sans-serif)',
              boxShadow: `0 4px 20px ${accentColor}55`,
            }}>
              {tripLabel}
            </span>
          </motion.div>
        )}

        {/* Title */}
        <motion.h1
          {...fadeUp(0.25)}
          style={{
            fontFamily: 'var(--font-display, "Readex Pro", sans-serif)',
            fontSize: 'clamp(2.4rem, 6vw, 4.5rem)',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.08,
            marginBottom: 16,
            maxWidth: 820,
            textShadow: '0 2px 24px rgba(0,0,0,0.35)',
          }}
        >
          {tourTitle}
        </motion.h1>

        {/* Subtitle */}
        {subtitle && (
          <motion.p
            {...fadeUp(0.32)}
            style={{
              fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
              color: 'rgba(255,255,255,0.78)',
              maxWidth: 600,
              lineHeight: 1.6,
              marginBottom: 20,
              fontFamily: 'var(--font-body, sans-serif)',
            }}
          >
            {subtitle}
          </motion.p>
        )}

        {/* Route text */}
        {routeText && (
          <motion.p
            {...fadeUp(0.38)}
            style={{
              fontSize: 14,
              color: accentColor,
              fontWeight: 600,
              letterSpacing: '0.04em',
              marginBottom: 24,
              fontFamily: 'var(--font-body, sans-serif)',
            }}
          >
            {isAr ? '◀' : '▶'} {routeText}
          </motion.p>
        )}

        {/* Fact chips */}
        {chips.length > 0 && (
          <motion.div
            {...fadeUp(0.44)}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 36 }}
          >
            {chips.map((c) => (
              <span key={c} style={chip()}>{c}</span>
            ))}
          </motion.div>
        )}

        {/* Price + CTAs */}
        <motion.div {...fadeUp(0.52)} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
          {price != null && (
            <div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body, sans-serif)', display: 'block', marginBottom: 2 }}>
                {isAr ? 'يبدأ من' : 'From'}
              </span>
              <span style={{
                fontFamily: 'var(--font-display, "Readex Pro", sans-serif)',
                fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                fontWeight: 700,
                color: '#fff',
              }}>
                ${price.toLocaleString()}
                <span style={{ fontSize: '0.45em', color: 'rgba(255,255,255,0.6)', fontWeight: 400, marginInlineStart: 6 }}>
                  {isAr ? '/ شخص' : '/ person'}
                </span>
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {isAvailable ? (
              <motion.div
                whileHover={reduced ? {} : { scale: 1.04, boxShadow: `0 8px 28px ${accentColor}66` }}
                whileTap={reduced ? {} : { scale: 0.98 }}
                style={{ borderRadius: 8 }}
              >
                <Link
                  href={bookHref}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '14px 28px', borderRadius: 8,
                    background: accentColor, color: '#fff',
                    fontWeight: 700, fontSize: 15, textDecoration: 'none',
                    fontFamily: 'var(--font-body, sans-serif)',
                  }}
                >
                  {isAr ? 'احجز الآن' : 'Book Now'}
                </Link>
              </motion.div>
            ) : null}
            <motion.div whileHover={reduced ? {} : { scale: 1.04 }} whileTap={reduced ? {} : { scale: 0.98 }}>
              <Link
                href={enquireHref}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.12)', color: '#fff',
                  border: '1.5px solid rgba(255,255,255,0.4)',
                  fontWeight: 700, fontSize: 15, textDecoration: 'none',
                  fontFamily: 'var(--font-body, sans-serif)',
                  backdropFilter: 'blur(6px)',
                }}
              >
                {isAr ? 'استفسر الآن' : 'Request Quote'}
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
