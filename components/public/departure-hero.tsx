'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import type { ReactNode } from 'react'

interface DepartureHeroProps {
  tourTitle: string
  backToTourHref: string
  backToTourLabel: string
  departureLabel: string
  dateRangeText: string
  daysCount: number
  daysLabel: string
  statusLabel: string
  statusColor: string
  priceUsd: number | null
  perPersonLabel: string
  isAvailable: boolean
  bookHref: string
  bookNowLabel: string
  whatsappHref: string
  whatsappLabel: string
  accentColor: string
  isAr: boolean
  imageSlot: ReactNode
}

export default function DepartureHero({
  tourTitle,
  backToTourHref,
  backToTourLabel,
  departureLabel,
  dateRangeText,
  daysCount,
  daysLabel,
  statusLabel,
  statusColor,
  priceUsd,
  perPersonLabel,
  isAvailable,
  bookHref,
  bookNowLabel,
  whatsappHref,
  whatsappLabel,
  accentColor,
  isAr,
  imageSlot,
}: DepartureHeroProps) {
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

  return (
    <section
      id="departure-hero"
      dir={dir}
      style={{
        position: 'relative', minHeight: '70vh', display: 'flex',
        flexDirection: 'column', justifyContent: 'flex-end',
        overflow: 'hidden', background: '#20271A',
      }}
    >
      {/* Background image */}
      <motion.div {...imageAnim} style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {imageSlot}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(20,25,15,0.92) 0%, rgba(20,25,15,0.55) 45%, rgba(20,25,15,0.18) 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 60% 50% at ${isAr ? '85%' : '15%'} 100%, ${accentColor}33 0%, transparent 60%)`,
        }} />
      </motion.div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1120, margin: '0 auto', width: '100%', padding: '0 24px 56px' }}>
        {/* Back link */}
        <motion.div {...fadeUp(0.1)}>
          <Link href={backToTourHref} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem',
            textDecoration: 'none', marginBottom: 28,
            fontFamily: 'var(--font-body, sans-serif)',
          }}>
            {isAr ? '→' : '←'} {backToTourLabel}
          </Link>
        </motion.div>

        {/* Departure + status badges */}
        <motion.div {...fadeUp(0.16)} style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <span style={{
            background: accentColor, color: '#fff',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', padding: '5px 14px', borderRadius: 4,
            fontFamily: 'var(--font-body, sans-serif)',
            boxShadow: `0 4px 20px ${accentColor}55`,
          }}>
            {departureLabel}
          </span>
          <span style={{
            background: 'rgba(255,255,255,0.08)', color: statusColor === '#166534' ? '#4ade80' : '#fff',
            border: `1px solid rgba(255,255,255,0.25)`,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', padding: '5px 14px', borderRadius: 4,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            fontFamily: 'var(--font-body, sans-serif)',
          }}>
            {statusLabel}
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          {...fadeUp(0.26)}
          style={{
            fontFamily: 'var(--font-display, "Readex Pro", sans-serif)',
            fontSize: 'clamp(2rem, 5.5vw, 3.4rem)',
            fontWeight: 700, color: '#fff', lineHeight: 1.1,
            margin: '0 0 12px', maxWidth: 820,
          }}
        >
          {tourTitle}
        </motion.h1>

        {/* Date range */}
        <motion.p
          {...fadeUp(0.34)}
          style={{
            fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
            color: 'rgba(255,255,255,0.78)', margin: '0 0 32px',
            fontFamily: 'var(--font-body, sans-serif)',
          }}
        >
          {dateRangeText}
          {daysCount > 0 && ` · ${daysCount} ${daysLabel}`}
        </motion.p>

        {/* Price + CTAs */}
        <motion.div {...fadeUp(0.44)} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
          {priceUsd != null && (
            <div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body, sans-serif)', display: 'block', marginBottom: 2 }}>
                {perPersonLabel}
              </span>
              <span style={{
                fontFamily: 'var(--font-display, "Readex Pro", sans-serif)',
                fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 700, color: '#fff',
              }}>
                ${priceUsd.toLocaleString()}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {isAvailable && (
              <motion.div
                whileHover={reduced ? {} : { scale: 1.04, boxShadow: `0 8px 28px ${accentColor}66` }}
                whileTap={reduced ? {} : { scale: 0.98 }}
                style={{ borderRadius: 8 }}
              >
                <Link href={bookHref} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 8,
                  background: accentColor, color: '#fff',
                  fontWeight: 700, fontSize: 15, textDecoration: 'none',
                  fontFamily: 'var(--font-body, sans-serif)',
                }}>
                  {bookNowLabel}
                </Link>
              </motion.div>
            )}
            <motion.div whileHover={reduced ? {} : { scale: 1.04 }} whileTap={reduced ? {} : { scale: 0.98 }}>
              <Link href={whatsappHref} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 8,
                background: '#25D366', color: '#fff',
                fontWeight: 700, fontSize: 15, textDecoration: 'none',
                fontFamily: 'var(--font-body, sans-serif)',
              }}>
                {whatsappLabel}
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
