'use client'

import { useState, useTransition, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import WhatsAppButton from '@/components/public/whatsapp-button'
import { useLocale } from '@/lib/use-locale'

const G = '#7A9A4A'

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  tourType: string
  startDate: string
  duration: string
  groupSize: string
  budget: string
  preferences: string
}

async function submitQuoteRequest(formData: FormData) {
  const response = await fetch('/api/quote-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  })
  if (!response.ok) throw new Error('Failed to submit quote request')
  return response.json()
}

function QuoteRequestFormContent() {
  const searchParams = useSearchParams()
  const locale = useLocale()
  const isAr = locale === 'ar'
  const tourId = searchParams.get('tour')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [tours, setTours] = useState<{ id: string; title_en: string; title_ar: string | null }[]>([])

  // Load real tours so the dropdown matches the actual catalogue, not static strings.
  useEffect(() => {
    let active = true
    fetch('/api/tours')
      .then((r) => r.json())
      .then((d) => { if (active) setTours(d.tours ?? []) })
      .catch(() => { if (active) setTours([]) })
    return () => { active = false }
  }, [])
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    tourType: tourId || '',
    startDate: '',
    duration: '',
    groupSize: '',
    budget: '',
    preferences: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
        await submitQuoteRequest(formData)
        setSubmitted(true)
      } catch (err: any) {
        setError(err.message || t.failed)
      }
    })
  }

  const t = isAr ? {
    title: 'اطلب عرض السعر', subtitle: 'أخبرنا عن رحلة السفاري التي تحلم بها وسننشئ عرضاً مخصصاً لك.',
    submitted: 'تم إرسال طلب عرض السعر!', thanks: 'شكراً! لقد استلمنا طلبك وسيتواصل معك فريقنا خلال 24 ساعة بعرض سعر مخصص.',
    backHome: 'العودة للرئيسية',
    firstName: 'الاسم الأول', lastName: 'اسم العائلة', email: 'البريد الإلكتروني', phone: 'الهاتف',
    country: 'الدولة', tourType: 'نوع الرحلة',
    selectTour: 'اختر جولة أو حدد مخصصة', custom: 'سفاري مخصص', guided: 'جولة جماعية بمرشد', luxury: 'رحلة فاخرة', adventure: 'سفاري مغامرة',
    startDate: 'تاريخ البدء المفضل', duration: 'المدة (أيام)', groupSize: 'حجم المجموعة', budget: 'الميزانية (دولار)',
    preferences: 'تفضيلات خاصة', preferencesPh: 'أخبرنا عن اهتماماتك أو ميزانيتك أو احتياجاتك الغذائية أو أي طلبات خاصة...',
    sending: 'جارٍ الإرسال...', requestQuote: 'اطلب عرض السعر', cancel: 'إلغاء',
    failed: 'فشل الإرسال. حاول مرة أخرى.',
  } : {
    title: 'Request Your Quote', subtitle: "Tell us about your dream safari and we'll create a personalized proposal just for you.",
    submitted: 'Quote Request Submitted!', thanks: "Thank you! We've received your request and our team will be in touch within 24 hours with a personalized quote.",
    backHome: 'Back to Home',
    firstName: 'First Name', lastName: 'Last Name', email: 'Email', phone: 'Phone',
    country: 'Country', tourType: 'Tour Type',
    selectTour: 'Select a tour or choose custom', custom: 'Custom Safari', guided: 'Guided Group Tour', luxury: 'Luxury Escape', adventure: 'Adventure Safari',
    startDate: 'Preferred Start Date', duration: 'Duration (days)', groupSize: 'Group Size', budget: 'Budget (USD)',
    preferences: 'Special Preferences', preferencesPh: 'Tell us about your interests, budget, dietary needs, or any special requests...',
    sending: 'Sending...', requestQuote: 'Request Quote', cancel: 'Cancel',
    failed: 'Failed to submit. Please try again.',
  }

  return (
    <main dir={isAr ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 md:py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.title}</h1>
          <p className="text-lg text-gray-300">{t.subtitle}</p>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-2xl mx-auto px-4">
          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-2xl font-bold text-green-900 mb-3">{t.submitted}</h2>
              <p className="text-green-700 mb-6">{t.thanks}</p>
              <Link
                href={`/?lang=${locale}`}
                className="px-8 py-3 rounded-lg font-semibold text-white transition inline-block"
                style={{ backgroundColor: G }}
              >
                {t.backHome}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-8 border border-gray-200">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t.firstName} *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t.lastName} *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
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
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t.phone} *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t.country}</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t.tourType}</label>
                  <select
                    name="tourType"
                    value={formData.tourType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">{t.selectTour}</option>
                    {tours.map((tour) => (
                      <option key={tour.id} value={tour.id}>
                        {isAr ? (tour.title_ar || tour.title_en) : tour.title_en}
                      </option>
                    ))}
                    <option value="custom">{t.custom}</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t.startDate}</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t.duration}</label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t.groupSize}</label>
                  <input
                    type="number"
                    name="groupSize"
                    value={formData.groupSize}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t.budget}</label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">{t.preferences}</label>
                <textarea
                  name="preferences"
                  value={formData.preferences}
                  onChange={handleChange}
                  rows={5}
                  placeholder={t.preferencesPh}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold text-white transition disabled:opacity-50"
                  style={{ backgroundColor: G }}
                >
                  {isPending ? t.sending : t.requestQuote}
                </button>
                <Link
                  href={`/tours?lang=${locale}`}
                  className="px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-900 hover:bg-gray-100 transition"
                >
                  {t.cancel}
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}

export default function QuoteRequestPage() {
  return (
    <>
      <Suspense>
        <PublicHeader />
      </Suspense>
      <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
        <QuoteRequestFormContent />
      </Suspense>
      <PublicFooter />
      <WhatsAppButton />
    </>
  )
}
