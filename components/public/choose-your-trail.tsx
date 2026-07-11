'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import SafariImage from '@/components/public/safari-image'

const MURRAM = '#B0492B'
const GOLD = '#C9A24B'
const BUSH = '#20271A'
const SAND = '#EAE3D2'

const EASE = [0.22, 1, 0.36, 1] as const

interface TrailCard {
  type: 'bike' | 'private'
  imageUrl: string | null
  tourId: string | null
}

interface ChooseYourTrailProps {
  bikeCard: TrailCard
  privateCard: TrailCard
  isAr: boolean
  locale: string
}

function ForkSVG({ inView, reduced, isAr }: { inView: boolean; reduced: boolean | null; isAr: boolean }) {
  return (
    <svg
      viewBox="0 0 200 80"
      style={{ width: '100%', maxWidth: 320, display: 'block', margin: '0 auto' }}
      aria-hidden="true"
    >
      {/* Stem */}
      <motion.line
        x1="100" y1="0" x2="100" y2="36"
        stroke={SAND} strokeWidth="2" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: reduced ? 1 : (inView ? 1 : 0) }}
        transition={{ duration: 0.4, ease: EASE }}
      />
      {/* Left fork — bike / murram */}
      <motion.path
        d={isAr ? "M100,36 Q100,70 160,78" : "M100,36 Q100,70 40,78"}
        fill="none" stroke={MURRAM} strokeWidth="2.5" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: reduced ? 1 : (inView ? 1 : 0) }}
        transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
      />
      {/* Right fork — private / gold */}
      <motion.path
        d={isAr ? "M100,36 Q100,70 40,78" : "M100,36 Q100,70 160,78"}
        fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: reduced ? 1 : (inView ? 1 : 0) }}
        transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
      />
      {/* End dots */}
      <motion.circle
        cx={isAr ? 160 : 40} cy="78" r="4" fill={MURRAM}
        initial={{ scale: 0 }} animate={{ scale: reduced ? 1 : (inView ? 1 : 0) }}
        transition={{ duration: 0.25, delay: 0.75, ease: EASE }}
        style={{ transformOrigin: `${isAr ? 160 : 40}px 78px` }}
      />
      <motion.circle
        cx={isAr ? 40 : 160} cy="78" r="4" fill={GOLD}
        initial={{ scale: 0 }} animate={{ scale: reduced ? 1 : (inView ? 1 : 0) }}
        transition={{ duration: 0.25, delay: 0.8, ease: EASE }}
        style={{ transformOrigin: `${isAr ? 40 : 160}px 78px` }}
      />
    </svg>
  )
}

export default function ChooseYourTrail({ bikeCard, privateCard, isAr, locale }: ChooseYourTrailProps) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const dir = isAr ? 'rtl' : 'ltr'

  const cards = [
    {
      accent: MURRAM,
      imageUrl: bikeCard.imageUrl,
      seed: bikeCard.tourId ?? 'bike',
      badge: isAr ? 'جولات الدراجات' : 'Group Bike Tours',
      heading: isAr ? 'مغامرة الدراجات النارية' : 'MOTORBIKE ADVENTURE',
      body: isAr
        ? 'جولات دراجات جماعية بقيادة خبراء من نيروبي إلى الساحل. مدعومة بالكامل، ممتازة للمغامرين.'
        : 'Expert-led group rides from Nairobi to the coast. Fully supported, KTM-grade adventure for serious riders.',
      cta: isAr ? 'استكشف جولات الدراجات' : 'Explore Bike Tours',
      href: `/tours?lang=${locale}&type=bike`,
    },
    {
      accent: GOLD,
      imageUrl: privateCard.imageUrl,
      seed: privateCard.tourId ?? 'private',
      badge: isAr ? 'سفاري خاص' : 'Private Safari',
      heading: isAr ? 'أطلق العنان للبرية' : 'CAR SAFARI',
      body: isAr
        ? 'مسارات مخصصة، مخيمات حصرية، مجموعتك وحدها فقط. سفاري مصمم حول تفضيلاتك.'
        : 'Custom itineraries, exclusive camps, your group only. Safari built entirely around your preferences.',
      cta: isAr ? 'استكشف السفاري الخاص' : 'Explore Private Safaris',
      href: `/tours?lang=${locale}&type=private`,
    },
  ]

  return (
    <section id="choose-trail" style={{ background: BUSH, padding: '80px 24px' }} dir={dir}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>

        {/* Heading */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{ textAlign: 'center', marginBottom: 48 }}
        >
          <h2 style={{
            fontFamily: 'var(--font-display, "Readex Pro", sans-serif)',
            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 12px',
          }}>
            {isAr ? 'اختر مسارك' : 'Choose Your Trail'}
          </h2>
          <p style={{
            color: 'rgba(234,227,210,0.7)',
            fontFamily: 'var(--font-body, sans-serif)',
            fontSize: '1rem',
            margin: 0,
          }}>
            {isAr
              ? 'مسارين مختلفان. نفس الشغف بأفريقيا.'
              : 'Two different paths. The same passion for East Africa.'}
          </p>
        </motion.div>

        {/* Fork SVG */}
        <div ref={ref} style={{ marginBottom: 32 }}>
          <ForkSVG inView={inView} reduced={reduced} isAr={isAr} />
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
        }}>
          {cards.map((card, i) => (
            <motion.div
              key={card.badge}
              initial={reduced ? false : { opacity: 0, y: 32, x: isAr ? (i === 0 ? 24 : -24) : (i === 0 ? -24 : 24) }}
              animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
              transition={{ duration: 0.55, delay: i * 0.1 + 0.5, ease: EASE }}
              whileHover={reduced ? {} : { y: -6 }}
              style={{ borderRadius: 16, overflow: 'hidden', position: 'relative', minHeight: 400 }}
            >
              <Link href={card.href} style={{ display: 'block', height: '100%', textDecoration: 'none' }}>
                {/* Image */}
                <div style={{ position: 'absolute', inset: 0 }}>
                  <SafariImage
                    src={card.imageUrl}
                    seed={card.seed}
                    alt={card.heading}
                    className="w-full h-full"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  {/* Dark + colour tint overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(to top, ${card.accent}ee 0%, ${card.accent}77 45%, rgba(20,25,15,0.35) 100%)`,
                  }} />
                </div>

                {/* Content */}
                <div style={{
                  position: 'relative', zIndex: 1,
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                  height: '100%', minHeight: 400,
                  padding: '32px 28px',
                }}>
                  {/* Badge */}
                  <div style={{
                    display: 'inline-block',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: 99,
                    padding: '4px 14px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    // Letter-spacing breaks Arabic joining; uppercase is Latin-only
                    letterSpacing: isAr ? undefined : '0.1em',
                    textTransform: isAr ? undefined : ('uppercase' as const),
                    color: '#fff',
                    fontFamily: 'var(--font-body, sans-serif)',
                    marginBottom: 14,
                    alignSelf: 'flex-start',
                  }}>
                    {card.badge}
                  </div>

                  <h3 style={{
                    fontFamily: 'var(--font-display, "Readex Pro", sans-serif)',
                    fontSize: 'clamp(1.6rem, 3vw, 2.1rem)',
                    fontWeight: 700,
                    color: '#fff',
                    margin: '0 0 12px',
                    lineHeight: 1.15,
                    textShadow: '0 2px 12px rgba(20,25,15,0.55)',
                  }}>
                    {card.heading}
                  </h3>

                  <p style={{
                    color: 'rgba(255,255,255,0.88)',
                    fontFamily: 'var(--font-body, sans-serif)',
                    fontSize: '0.92rem',
                    lineHeight: 1.6,
                    margin: '0 0 24px',
                    textShadow: '0 1px 8px rgba(20,25,15,0.5)',
                  }}>
                    {card.body}
                  </p>

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#fff',
                    color: card.accent,
                    fontFamily: 'var(--font-body, sans-serif)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    padding: '10px 20px',
                    borderRadius: 8,
                    alignSelf: 'flex-start',
                  }}>
                    {card.cta}
                    <span aria-hidden="true" style={{ fontSize: '1rem' }}>{isAr ? '←' : '→'}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
