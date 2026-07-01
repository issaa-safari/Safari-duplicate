'use client'

import { motion, useReducedMotion } from 'framer-motion'
import SectionReveal from './section-reveal'

export interface StaffMember {
  id: string
  name: string
  role: string
}

interface TrustStripProps {
  staff: StaffMember[]
  isAr: boolean
  accentColor: string
}

const OLIVE = '#7A9A4A'
const STONE = '#6E6A59'
const SAND = '#EAE3D2'
const BUSH = '#20271A'

const TRUST_POINTS_EN = [
  { icon: '🛡️', title: 'Safety First', body: 'All vehicles fully serviced, first-aid trained guides on every trip.' },
  { icon: '🗺️', title: '15+ Years Local Knowledge', body: 'Routes and camps chosen from years of experience, not guide books.' },
  { icon: '🌍', title: 'Small Groups', body: 'Max 10 riders / guests — personal attention, not a coach tour.' },
  { icon: '🤝', title: 'Fully Supported', body: 'Dedicated support vehicle, mechanical backup, 24/7 contact throughout.' },
]

const TRUST_POINTS_AR = [
  { icon: '🛡️', title: 'السلامة أولاً', body: 'جميع المركبات مُصانة بالكامل، ومرشدون مدربون على الإسعافات الأولية في كل رحلة.' },
  { icon: '🗺️', title: 'أكثر من 15 عاماً من المعرفة المحلية', body: 'مسارات ومخيمات تم اختيارها من سنوات الخبرة، وليس من دليل السياحة.' },
  { icon: '🌍', title: 'مجموعات صغيرة', body: 'حد أقصى 10 ركاب — اهتمام شخصي، لا جولات جماعية.' },
  { icon: '🤝', title: 'دعم كامل', body: 'سيارة دعم مخصصة، احتياط ميكانيكي، وتواصل على مدار الساعة.' },
]

function roleLabel(role: string, isAr: boolean): string {
  const map: Record<string, [string, string]> = {
    guide: ['Lead Guide', 'مرشد رئيسي'],
    driver: ['Driver', 'سائق'],
    chef: ['Chef', 'طاهي'],
    coordinator: ['Trip Coordinator', 'منسق الرحلات'],
  }
  return map[role] ? (isAr ? map[role][1] : map[role][0]) : role
}

export default function TrustStrip({ staff, isAr, accentColor }: TrustStripProps) {
  const reduced = useReducedMotion()
  const dir = isAr ? 'rtl' : 'ltr'
  const points = isAr ? TRUST_POINTS_AR : TRUST_POINTS_EN

  return (
    <div dir={dir}>
      {/* What makes us different */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 24, marginBottom: staff.length > 0 ? 56 : 0,
      }}>
        {points.map((p, i) => (
          <SectionReveal key={p.title} delay={i * 0.08}>
            <motion.div
              whileHover={reduced ? {} : { y: -3, boxShadow: '0 10px 28px rgba(32,39,26,0.1)' }}
              transition={{ duration: 0.25 }}
              style={{
                background: '#fff', borderRadius: 14, padding: '24px 20px',
                border: '1px solid #E5E0D8',
                display: 'flex', flexDirection: 'column', gap: 10,
                height: '100%', boxSizing: 'border-box',
              }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 48, height: 48, borderRadius: 12,
                background: `${accentColor}1A`,
                boxShadow: `inset 0 0 0 2px ${accentColor}33`,
                fontSize: 22,
              }}>{p.icon}</span>
              <h3 style={{
                fontFamily: 'var(--font-display, sans-serif)',
                fontSize: '1rem', fontWeight: 700, color: BUSH, margin: 0,
              }}>
                {p.title}
              </h3>
              <p style={{
                fontSize: '0.9rem', color: STONE, lineHeight: 1.65, margin: 0,
                fontFamily: 'var(--font-body, sans-serif)',
              }}>
                {p.body}
              </p>
            </motion.div>
          </SectionReveal>
        ))}
      </div>

      {/* Staff */}
      {staff.length > 0 && (
        <SectionReveal>
          <h3 style={{
            fontFamily: 'var(--font-display, sans-serif)',
            fontSize: '1.3rem', fontWeight: 700, color: BUSH, marginBottom: 20,
          }}>
            {isAr ? 'فريقنا' : 'Meet Your Team'}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {staff.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : i * 0.07 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: '#fff', borderRadius: 50,
                  padding: '10px 20px 10px 10px',
                  border: '1px solid #E5E0D8',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: accentColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: '#fff', fontWeight: 700,
                  fontFamily: 'var(--font-display, sans-serif)',
                  flexShrink: 0,
                }}>
                  {member.name[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: BUSH, fontFamily: 'var(--font-body, sans-serif)' }}>
                    {member.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: STONE, fontFamily: 'var(--font-body, sans-serif)' }}>
                    {roleLabel(member.role, isAr)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </SectionReveal>
      )}
    </div>
  )
}
