'use client'

import { useState, useTransition } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface TourEnquiryFormProps {
  tourId: string
  tourTitleEn: string
  accentColor: string
  isAr: boolean
  locale: string
  departureId?: string
}

const OLIVE = '#7A9A4A'
const STONE = '#6E6A59'
const SAND = '#EAE3D2'

const HEARD_ABOUT_OPTIONS_EN = [
  { value: '', label: 'How did you hear about us?' },
  { value: 'google', label: 'Google Search' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'referral', label: 'Friend / Referral' },
  { value: 'returning', label: 'Returning customer' },
  { value: 'other', label: 'Other' },
]

const HEARD_ABOUT_OPTIONS_AR = [
  { value: '', label: 'كيف سمعت عنا؟' },
  { value: 'google', label: 'بحث Google' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'واتساب' },
  { value: 'referral', label: 'صديق / إحالة' },
  { value: 'returning', label: 'عميل سابق' },
  { value: 'other', label: 'أخرى' },
]

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 8,
  border: '1.5px solid #DDD8CC',
  fontSize: '0.95rem',
  color: '#20271A',
  background: '#fff',
  fontFamily: 'var(--font-body, sans-serif)',
  boxSizing: 'border-box' as const,
}

type FormCSSVars = React.CSSProperties & { '--focus-accent'?: string }

const labelStyle = {
  display: 'block' as const,
  fontSize: 13,
  fontWeight: 600,
  color: '#20271A',
  marginBottom: 6,
  fontFamily: 'var(--font-body, sans-serif)',
}

export default function TourEnquiryForm({
  tourId,
  tourTitleEn,
  accentColor,
  isAr,
  locale,
  departureId,
}: TourEnquiryFormProps) {
  const reduced = useReducedMotion()
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    groupSize: '',
    startDate: '',
    preferences: '',
    heardAboutUs: '',
  })

  const t = isAr ? {
    heading: 'أرسل لنا استفساراً',
    sub: 'وسنتواصل معك خلال 24 ساعة بعرض مخصص.',
    firstName: 'الاسم الأول *', lastName: 'اسم العائلة *',
    email: 'البريد الإلكتروني *', phone: 'الهاتف *',
    country: 'الدولة', groupSize: 'حجم المجموعة *',
    startDate: 'تاريخ البدء المفضل', preferences: 'ملاحظات أو أسئلة',
    heardAbout: 'كيف سمعت عنا؟',
    submit: 'أرسل الاستفسار', sending: 'جارٍ الإرسال...',
    successTitle: 'تم إرسال استفسارك!',
    successBody: 'شكراً! سيتواصل معك فريقنا خلال 24 ساعة.',
    failed: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
  } : {
    heading: 'Send an Enquiry',
    sub: "We'll get back to you within 24 hours with a personalised quote.",
    firstName: 'First Name *', lastName: 'Last Name *',
    email: 'Email *', phone: 'Phone *',
    country: 'Country', groupSize: 'Group Size *',
    startDate: 'Preferred Start Date', preferences: 'Notes or questions',
    heardAbout: 'How did you hear about us?',
    submit: 'Send Enquiry', sending: 'Sending…',
    successTitle: 'Enquiry sent!',
    successBody: "Thanks — our team will be in touch within 24 hours.",
    failed: 'Something went wrong. Please try again.',
  }

  const heardOptions = isAr ? HEARD_ABOUT_OPTIONS_AR : HEARD_ABOUT_OPTIONS_EN

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/quote-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            country: form.country,
            tourType: tourId,
            startDate: form.startDate,
            groupSize: form.groupSize,
            preferences: form.preferences,
            heardAboutUs: form.heardAboutUs || null,
          }),
        })
        if (!res.ok) throw new Error('failed')
        setSubmitted(true)
      } catch {
        setError(t.failed)
      }
    })
  }

  if (submitted) {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 12, padding: '40px 32px', textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h3 style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '1.4rem', fontWeight: 700, color: '#166534', marginBottom: 8 }}>
          {t.successTitle}
        </h3>
        <p style={{ color: '#166534', fontFamily: 'var(--font-body, sans-serif)' }}>{t.successBody}</p>
      </motion.div>
    )
  }

  const focusVars: FormCSSVars = { '--focus-accent': accentColor }

  return (
    <form onSubmit={handleSubmit} dir={isAr ? 'rtl' : 'ltr'} style={focusVars}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>{t.firstName}</label>
          <input name="firstName" value={form.firstName} onChange={handleChange} required className="enquiry-field" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t.lastName}</label>
          <input name="lastName" value={form.lastName} onChange={handleChange} required className="enquiry-field" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t.email}</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} required className="enquiry-field" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t.phone}</label>
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} required className="enquiry-field" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t.country}</label>
          <input name="country" value={form.country} onChange={handleChange} className="enquiry-field" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t.groupSize}</label>
          <input type="number" name="groupSize" value={form.groupSize} onChange={handleChange} min="1" required className="enquiry-field" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t.startDate}</label>
          <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className="enquiry-field" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t.heardAbout}</label>
          <select name="heardAboutUs" value={form.heardAboutUs} onChange={handleChange} className="enquiry-field" style={inputStyle}>
            {heardOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label style={labelStyle}>{t.preferences}</label>
          <textarea name="preferences" value={form.preferences} onChange={handleChange} rows={4} className="enquiry-field" style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: 14, fontFamily: 'var(--font-body, sans-serif)' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <motion.button
          type="submit"
          disabled={isPending}
          className="enquiry-field"
          whileHover={reduced || isPending ? {} : { scale: 1.01 }}
          whileTap={reduced || isPending ? {} : { scale: 0.99 }}
          style={{
            width: '100%', padding: '14px 24px', borderRadius: 8,
            background: isPending ? '#a0a0a0' : accentColor,
            color: '#fff', fontWeight: 700, fontSize: '1rem',
            border: 'none', cursor: isPending ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body, sans-serif)',
            transition: 'background 0.2s',
          }}
        >
          {isPending ? t.sending : t.submit}
        </motion.button>
      </div>
    </form>
  )
}
