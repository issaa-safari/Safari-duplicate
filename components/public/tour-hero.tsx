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

const OLIVE = '#7A9A4A'

const chip = (label: string, accent: string) => ({
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  gap: 6,
  padding: '4px 14px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.12)',
  border: `1px solid rgba(255,255,255,0.22)`,
  fontSize: 13,
  fontWeight: 600,
  color: '#fff',
  backdropFilter: 'blur(6px)',
  letterSpacing: '0.02em',
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

  const fadeUp = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
        }

  const imageAnim = reduced
    ? {}
    : {
        initial: { opacity: 0, scale: 1.06 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
      }

  const chips = [
    durationDays ? `${durationDays} ${isAr ? 'يوم' : 'days'}` : null,
    distanceKm ? `${distanceKm.toLocaleString()} km` : null,
    groupSize ? `${isAr ? 'حتى' : 'max'} ${groupSize}` : null,
    terrain ?? null,
  ].filter(Boolean) as string[]

  return (
    <section
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
      </motion.div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '0 24px 64px' }}>

        {/* Trip type badge */}
        {tripLabel && (
          <motion.div {...fadeUp(0.15)} style={{ marginBottom: 20 }}>
            <span style={{
              display: 'inline-block',
              padding: '5px 16px',
              borderRadius: 4,
              background: accentColor,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-body, sans-serif)',
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
              <span key={c} style={chip(c, accentColor)}>{c}</span>
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
                <span style={{ fontSize: '0.45em', color: 'rgba(255,255,255,0.6)', fontWeight: 400, marginLeft: 6 }}>
                  {isAr ? '/ شخص' : '/ person'}
                </span>
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {isAvailable ? (
              <Link
                href={bookHref}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 8,
                  background: accentColor, color: '#fff',
                  fontWeight: 700, fontSize: 15, textDecoration: 'none',
                  fontFamily: 'var(--font-body, sans-serif)',
                  transition: 'opacity 0.2s',
                }}
              >
                {isAr ? 'احجز الآن' : 'Book Now'}
              </Link>
            ) : null}
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
          </div>
        </motion.div>
      </div>
    </section>
  )
}
