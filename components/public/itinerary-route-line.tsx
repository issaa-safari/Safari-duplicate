'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import SafariImage from '@/components/public/safari-image'

export interface ItineraryDay {
  id: string
  dayNumber: number
  dayNumberEnd: number | null
  title: string
  description: string | null
  imageUrl: string | null
  distanceKm: number | null
  mealBreakfast: boolean
  mealLunch: boolean
  mealDinner: boolean
  accommodation: string | null
  activities: { name: string; description: string | null; moment: string | null; optional: boolean }[]
}

interface ItineraryRouteLineProps {
  days: ItineraryDay[]
  accentColor: string
  isAr: boolean
}

const STONE = '#6E6A59'
const SAND = '#EAE3D2'
const BUSH = '#20271A'

function DayLabel(day: ItineraryDay, isAr: boolean) {
  const base = isAr ? 'اليوم' : 'Day'
  if (day.dayNumberEnd && day.dayNumberEnd !== day.dayNumber) {
    return `${base} ${day.dayNumber}–${day.dayNumberEnd}`
  }
  return `${base} ${day.dayNumber}`
}

function MealsLine({ day, isAr }: { day: ItineraryDay; isAr: boolean }) {
  const parts: string[] = []
  if (isAr) {
    if (day.mealBreakfast) parts.push('فطور')
    if (day.mealLunch) parts.push('غداء')
    if (day.mealDinner) parts.push('عشاء')
  } else {
    if (day.mealBreakfast) parts.push('Breakfast')
    if (day.mealLunch) parts.push('Lunch')
    if (day.mealDinner) parts.push('Dinner')
  }
  return <>{parts.length ? parts.join(' · ') : (isAr ? 'لا توجد وجبات' : 'No meals included')}</>
}

function MomentLabel(m: string, isAr: boolean) {
  const map: Record<string, [string, string]> = {
    morning: ['Morning', 'صباحاً'],
    afternoon: ['Afternoon', 'بعد الظهر'],
    evening: ['Evening', 'مساءً'],
    night: ['Night', 'ليلاً'],
  }
  return map[m] ? (isAr ? map[m][1] : map[m][0]) : ''
}

function DayCard({
  day,
  index,
  accentColor,
  isAr,
  isOpen,
  onToggle,
  headerRef,
}: {
  day: ItineraryDay
  index: number
  accentColor: string
  isAr: boolean
  isOpen: boolean
  onToggle: () => void
  headerRef: (el: HTMLButtonElement | null) => void
}) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] as const }}
      style={{
        background: '#fff',
        borderRadius: 14,
        border: `1px solid ${isOpen ? accentColor : '#E5E0D8'}`,
        overflow: 'hidden',
        boxShadow: isOpen ? '0 8px 28px rgba(32,39,26,0.14)' : '0 2px 12px rgba(32,39,26,0.06)',
        transition: 'box-shadow 0.25s, border-color 0.25s',
      }}
    >
      {/* Header — doubles as the route-line node anchor for the desktop SVG */}
      <button
        ref={headerRef}
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          gap: 16, padding: '18px 24px',
          background: isOpen ? accentColor : SAND,
          border: 'none', cursor: 'pointer', textAlign: isAr ? 'right' : 'left',
          transition: 'background 0.25s',
        }}
      >
        {/* Node circle */}
        <div style={{
          flexShrink: 0,
          width: 44, height: 44, borderRadius: '50%',
          background: isOpen ? 'rgba(255,255,255,0.2)' : accentColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display, sans-serif)',
          fontWeight: 700, fontSize: 16,
          color: '#fff',
          border: `2px solid ${isOpen ? 'rgba(255,255,255,0.4)' : 'transparent'}`,
        }}>
          {day.dayNumber}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
            color: isOpen ? 'rgba(255,255,255,0.7)' : STONE,
            textTransform: 'uppercase', marginBottom: 3,
            fontFamily: 'var(--font-body, sans-serif)',
          }}>
            {DayLabel(day, isAr)}
          </div>
          <div style={{
            fontFamily: 'var(--font-display, sans-serif)',
            fontWeight: 600, fontSize: '1.05rem',
            color: isOpen ? '#fff' : BUSH,
          }}>
            {day.title}
          </div>
        </div>

        <span style={{
          color: isOpen ? 'rgba(255,255,255,0.7)' : STONE,
          fontSize: 20, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s', flexShrink: 0,
        }}>
          ⌄
        </span>
      </button>

      {/* Body */}
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] as const }}
        style={{ overflow: 'hidden' }}
      >
        {/* Day image */}
        {day.imageUrl && (
          <SafariImage
            src={day.imageUrl}
            seed={day.id}
            alt={day.title}
            className="w-full"
            sizes="(max-width: 768px) 100vw, 700px"
            useStockFallback={false}
          />
        )}

        <div style={{ padding: '20px 24px 24px' }}>
          {day.description && (
            <p style={{
              color: '#3D3D35', lineHeight: 1.75, marginBottom: 16,
              fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.975rem',
            }}>
              {day.description}
            </p>
          )}

          {/* Activities */}
          {day.activities.length > 0 && (
            <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid #EAE3D2' }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: STONE, letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 10,
                fontFamily: 'var(--font-body, sans-serif)',
              }}>
                {isAr ? 'الأنشطة' : 'Activities'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {day.activities.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: accentColor, marginTop: 2, flexShrink: 0 }}>→</span>
                    <div>
                      <span style={{ fontWeight: 600, color: BUSH, fontSize: '0.9rem', fontFamily: 'var(--font-body, sans-serif)' }}>
                        {a.name}
                      </span>
                      {a.moment && (
                        <span style={{ color: STONE, fontSize: '0.8rem', marginInlineStart: 6 }}>
                          · {MomentLabel(a.moment, isAr)}
                        </span>
                      )}
                      {a.optional && (
                        <span style={{ color: '#C9A24B', fontSize: '0.8rem', marginInlineStart: 6 }}>
                          · {isAr ? 'اختياري' : 'optional'}
                        </span>
                      )}
                      {a.description && (
                        <p style={{ color: STONE, fontSize: '0.85rem', marginTop: 2, fontFamily: 'var(--font-body, sans-serif)' }}>
                          {a.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer chips */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12, paddingTop: 12, borderTop: '1px solid #EAE3D2',
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: STONE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                🍽 {isAr ? 'الوجبات' : 'Meals'}
              </div>
              <div style={{ fontSize: '0.875rem', color: BUSH }}>
                <MealsLine day={day} isAr={isAr} />
              </div>
            </div>
            {day.accommodation && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: STONE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                  🏨 {isAr ? 'الإقامة' : 'Stay'}
                </div>
                <div style={{ fontSize: '0.875rem', color: BUSH }}>{day.accommodation}</div>
              </div>
            )}
            {day.distanceKm && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: STONE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                  📏 {isAr ? 'المسافة' : 'Distance'}
                </div>
                <div style={{ fontSize: '0.875rem', color: BUSH }}>{day.distanceKm} km</div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ItineraryRouteLine({ days, accentColor, isAr }: ItineraryRouteLineProps) {
  const [openIndex, setOpenIndex] = useState(0)
  const reduced = useReducedMotion()
  const sectionRef = useRef<HTMLDivElement>(null)
  const cardsColRef = useRef<HTMLDivElement>(null)
  const headerRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [nodeCenters, setNodeCenters] = useState<number[]>([])
  const lineInView = useInView(sectionRef, { once: true, margin: '-80px' })

  // Measure each day-card header's vertical center relative to the cards column,
  // so route-line nodes track real card positions instead of an assumed fixed pitch
  // (headers are fixed-height; only the expandable body below them varies).
  useLayoutEffect(() => {
    function measure() {
      const colTop = cardsColRef.current?.getBoundingClientRect().top ?? 0
      const centers = headerRefs.current.map((el) => {
        if (!el) return 0
        const r = el.getBoundingClientRect()
        return r.top - colTop + r.height / 2
      })
      setNodeCenters(centers)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (cardsColRef.current) ro.observe(cardsColRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [days.length])

  if (days.length === 0) {
    return (
      <p style={{ color: STONE, textAlign: 'center', padding: '48px 0', fontFamily: 'var(--font-body, sans-serif)' }}>
        {isAr ? 'لا توجد تفاصيل للبرنامج بعد.' : 'No itinerary details available yet.'}
      </p>
    )
  }

  const hasMeasurements = nodeCenters.length === days.length && nodeCenters.every((c) => c > 0)
  const nodeY = (i: number) => (hasMeasurements ? nodeCenters[i] : 50 + i * 100)
  const svgH = hasMeasurements ? nodeCenters[nodeCenters.length - 1] + 50 : days.length * 100
  const pathD = `M 28 0 Q 32 ${svgH * 0.25} 24 ${svgH * 0.5} Q 32 ${svgH * 0.75} 28 ${svgH}`

  return (
    <div ref={sectionRef} dir={isAr ? 'rtl' : 'ltr'} style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
      {/* Route line SVG — the signature element, desktop only */}
      <div className="hidden md:block shrink-0 w-14" aria-hidden="true">
        <svg
          width={56}
          height={svgH}
          viewBox={`0 0 56 ${svgH}`}
          style={{ overflow: 'visible' }}
        >
          {/* Track */}
          <path d={pathD} fill="none" stroke="#E5E0D8" strokeWidth={4} />
          {/* Animated fill */}
          {!reduced && (
            <motion.path
              d={pathD}
              fill="none"
              stroke={accentColor}
              strokeWidth={4}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={lineInView ? { pathLength: 1 } : {}}
              transition={{ duration: 1.8, ease: 'easeInOut', delay: 0.2 }}
              style={{ filter: `drop-shadow(0 2px 4px ${accentColor}66)` }}
            />
          )}
          {reduced && (
            <path d={pathD} fill="none" stroke={accentColor} strokeWidth={4} />
          )}
          {/* Day nodes */}
          {days.map((day, i) => (
            <g key={day.id}>
              <circle
                cx={28}
                cy={nodeY(i)}
                r={20}
                fill={i === openIndex ? accentColor : '#fff'}
                stroke={accentColor}
                strokeWidth={i === openIndex ? 0 : 3}
                style={{ filter: i === openIndex ? `drop-shadow(0 2px 6px ${accentColor}88)` : undefined }}
              />
              <text
                x={28} y={nodeY(i) + 5}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill={i === openIndex ? '#fff' : accentColor}
                fontFamily="var(--font-display, sans-serif)"
              >
                {day.dayNumber}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Day cards */}
      <div ref={cardsColRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {days.map((day, i) => (
          <DayCard
            key={day.id}
            day={day}
            index={i}
            accentColor={accentColor}
            isAr={isAr}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            headerRef={(el) => { headerRefs.current[i] = el }}
          />
        ))}
      </div>
    </div>
  )
}
