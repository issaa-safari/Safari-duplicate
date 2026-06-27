'use client'

import { useState, useTransition, Suspense } from 'react'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import { useLocale } from '@/lib/use-locale'

const G = '#7A9A4A'

interface ContactFormData {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

async function submitContactForm(formData: ContactFormData) {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  })
  if (!response.ok) throw new Error('Failed to send message')
  return response.json()
}

export default function ContactPage() {
  return (
    <Suspense>
      <ContactInner />
    </Suspense>
  )
}

function ContactInner() {
  const locale = useLocale()
  const isAr = locale === 'ar'
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })

  const t = isAr ? {
    title: 'تواصل معنا', subtitle: 'هل لديك أسئلة؟ يسعدنا أن نسمع منك. تواصل مع فريقنا في أي وقت.',
    contactInfo: 'معلومات الاتصال', email: 'البريد الإلكتروني', respond: 'نرد خلال 24 ساعة',
    phone: 'الهاتف', hours: 'الاثنين–الجمعة، 8 صباحاً–6 مساءً بتوقيت شرق أفريقيا',
    whatsapp: 'واتساب', quickMsg: 'رسائل وعروض سريعة', office: 'موقع المكتب',
    officeAddr: 'نيروبي، كينيا\nشرق أفريقيا',
    sent: 'تم إرسال الرسالة!', thanks: 'شكراً لتواصلك معنا. سنعود إليك في أقرب وقت ممكن.',
    name: 'الاسم', subject: 'الموضوع', message: 'الرسالة', sending: 'جارٍ الإرسال...', send: 'إرسال الرسالة',
    failed: 'فشل إرسال الرسالة. حاول مرة أخرى.',
  } : {
    title: 'Get in Touch', subtitle: "Have questions? We'd love to hear from you. Reach out to our team anytime.",
    contactInfo: 'Contact Information', email: 'Email', respond: 'We respond within 24 hours',
    phone: 'Phone', hours: 'Monday–Friday, 8am–6pm EAT',
    whatsapp: 'WhatsApp', quickMsg: 'Quick messages & quotes', office: 'Office Location',
    officeAddr: 'Nairobi, Kenya\nEast Africa',
    sent: 'Message Sent!', thanks: "Thank you for contacting us. We'll get back to you as soon as possible.",
    name: 'Name', subject: 'Subject', message: 'Message', sending: 'Sending...', send: 'Send Message',
    failed: 'Failed to send message. Please try again.',
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        await submitContactForm(formData)
        setSubmitted(true)
      } catch (err: any) {
        setError(err.message || t.failed)
      }
    })
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <Suspense>
        <PublicHeader />
      </Suspense>
      <main>
        {/* Page Header */}
        <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.title}</h1>
            <p className="text-lg text-gray-300">{t.subtitle}</p>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Contact Info */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">{t.contactInfo}</h2>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.email}</h3>
                    <a
                      href="mailto:info@safariadventure.com"
                      className="text-lg hover:underline"
                      style={{ color: G }}
                    >
                      info@safariadventure.com
                    </a>
                    <p className="text-gray-600 text-sm mt-1">{t.respond}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.phone}</h3>
                    <a
                      href="tel:+254123456789"
                      className="text-lg hover:underline"
                      style={{ color: G }}
                    >
                      +254 (123) 456-789
                    </a>
                    <p className="text-gray-600 text-sm mt-1">{t.hours}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.whatsapp}</h3>
                    <a
                      href="https://wa.me/254123456789"
                      className="text-lg hover:underline"
                      style={{ color: G }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      +254 (123) 456-789
                    </a>
                    <p className="text-gray-600 text-sm mt-1">{t.quickMsg}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.office}</h3>
                    <p className="text-gray-600 whitespace-pre-line">{t.officeAddr}</p>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div>
                {submitted ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <div className="text-5xl mb-4">✓</div>
                    <h3 className="text-2xl font-bold text-green-900 mb-3">{t.sent}</h3>
                    <p className="text-green-700">{t.thanks}</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-8 border border-gray-200">
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">{t.name} *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">{t.email} *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">{t.phone}</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">{t.subject} *</label>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">{t.message} *</label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    {error && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full px-6 py-3 rounded-lg font-semibold text-white transition disabled:opacity-50"
                      style={{ backgroundColor: G }}
                    >
                      {isPending ? t.sending : t.send}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
