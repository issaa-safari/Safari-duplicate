import Link from 'next/link'
import PublicFooter from '@/components/public/footer'
import PublicHeader from '@/components/public/header'
import WhatsAppButton from '@/components/public/whatsapp-button'
import StructuredData from '@/components/public/structured-data'
import { faqPageJsonLd } from '@/lib/seo'
import { localePath } from '@/lib/locale'

export type LandingCopy = {
  eyebrow: string
  title: string
  intro: string
  sections: { title: string; body: string }[]
  faqs: { question: string; answer: string }[]
  related?: { href: string; label: string }[]
}

export default function SeoLandingPage({ locale, copy }: { locale: 'en' | 'ar'; copy: LandingCopy }) {
  const isAr = locale === 'ar'
  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      {copy.faqs.length > 0 && <StructuredData data={faqPageJsonLd(copy.faqs)} />}
      <PublicHeader initialLang={locale} />
      <main>
        <section style={{ background: '#20271A', color: '#fff', padding: '96px 24px 80px' }}>
          <div style={{ maxWidth: 920, margin: '0 auto' }}>
            <p style={{ color: '#C9A24B', fontWeight: 700 }}>{copy.eyebrow}</p>
            <h1 style={{ fontSize: 'clamp(2.2rem,6vw,4rem)', lineHeight: 1.08, margin: '12px 0 24px', fontFamily: 'var(--font-display,sans-serif)' }}>{copy.title}</h1>
            <p style={{ maxWidth: 780, fontSize: '1.15rem', lineHeight: 1.8, color: '#EAE3D2' }}>{copy.intro}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32 }}>
              <Link href={localePath('/tours', locale)} style={{ background: '#7A9A4A', color: '#fff', padding: '14px 22px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>{isAr ? 'شاهد الرحلات' : 'Explore Tours'}</Link>
              <Link href={localePath('/quote-request', locale)} style={{ border: '1px solid #EAE3D2', color: '#fff', padding: '14px 22px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>{isAr ? 'اطلب برنامجاً مخصصاً' : 'Request a Custom Trip'}</Link>
            </div>
          </div>
        </section>
        {copy.sections.map((s, i) => (
          <section key={s.title} style={{ padding: '64px 24px', background: i % 2 ? '#EAE3D2' : '#fff' }}>
            <div style={{ maxWidth: 920, margin: '0 auto' }}>
              <h2 style={{ color: '#20271A', fontSize: 'clamp(1.6rem,4vw,2.3rem)', fontFamily: 'var(--font-display,sans-serif)' }}>{s.title}</h2>
              <p style={{ color: '#3D3D35', fontSize: '1.05rem', lineHeight: 1.8, maxWidth: 780 }}>{s.body}</p>
            </div>
          </section>
        ))}
        {copy.related && copy.related.length > 0 && (
          <section style={{ padding: '56px 24px', background: '#20271A' }}>
            <div style={{ maxWidth: 920, margin: '0 auto' }}>
              <h2 style={{ color: '#fff', marginBottom: 20 }}>{isAr ? 'استكشف المزيد' : 'Explore more'}</h2>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {copy.related.map((r) => <Link key={r.href} href={localePath(r.href, locale)} style={{ color: '#fff', border: '1px solid #7A9A4A', padding: '10px 14px', borderRadius: 8, textDecoration: 'none' }}>{r.label}</Link>)}
              </div>
            </div>
          </section>
        )}
        {copy.faqs.length > 0 && (
          <section style={{ padding: '64px 24px', background: '#fff' }}>
            <div style={{ maxWidth: 920, margin: '0 auto' }}>
              <h2>{isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}</h2>
              {copy.faqs.map((f) => <details key={f.question} style={{ borderBottom: '1px solid #DDD8CC', padding: '18px 0' }}><summary style={{ fontWeight: 700, cursor: 'pointer' }}>{f.question}</summary><p style={{ lineHeight: 1.7 }}>{f.answer}</p></details>)}
            </div>
          </section>
        )}
      </main>
      <PublicFooter />
      <WhatsAppButton lang={locale} />
    </div>
  )
}
