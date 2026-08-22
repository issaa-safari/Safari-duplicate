'use client'

import { useState, useTransition, useEffect, useId, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import WhatsAppButton from '@/components/public/whatsapp-button'
import { useLocale } from '@/lib/use-locale'
import { localePath } from '@/lib/locale'
import { COUNTRIES_SORTED, dialCodeFor, countryByName } from '@/lib/countries'

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
  budgetBasis: string
  dateFlexibility: string
  preferences: string
}

type TourOption = { id: string; title_en: string; title_ar: string | null }

function QuoteRequestFormContent({ initialTours }: { initialTours: TourOption[] }) {
  const searchParams = useSearchParams()
  const locale = useLocale()
  const isAr = locale === 'ar'
  const tourId = searchParams.get('tour')
  // Where the link was shared, so outreach can be told apart from organic
  // traffic. Clamped to a known set server-side.
  const source = searchParams.get('src')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const submissionId = `quote-${useId()}`
  // Kenya, first in COUNTRIES_SORTED, is a sensible default dial code for a
  // Kenya/Tanzania operator — the visitor can still change it independently.
  const [phoneCountryCode, setPhoneCountryCode] = useState('KE')
  const [isPending, startTransition] = useTransition()
  const [tours, setTours] = useState<TourOption[]>(initialTours)

  // Load real tours so the dropdown matches the actual catalogue, not static strings.
  useEffect(() => {
    let active = true
    if (initialTours.length > 0) return
    fetch('/api/tours')
      .then((r) => r.json())
      .then((d) => { if (active) setTours(d.tours ?? []) })
      .catch(() => { if (active) setTours([]) })
    return () => { active = false }
  }, [initialTours.length])
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
    budgetBasis: 'per_person',
    dateFlexibility: 'flexible_few_days',
    preferences: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  // Picking a country also syncs the phone country-code dropdown, so the
  // visitor doesn't have to set the dial code separately — they can still
  // override it afterwards.
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value
    setFormData(prev => ({ ...prev, country: name }))
    const found = countryByName(name)
    if (found) setPhoneCountryCode(found.code)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        const dial = dialCodeFor(phoneCountryCode)
        const phone = dial ? `+${dial}${formData.phone.trim()}` : formData.phone.trim()
        const response = await fetch('/api/quote-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            phone,
            source,
            submissionId,
            language: isAr ? 'ar' : 'en',
            channel: 'website_quote',
          }),
        })
        if (!response.ok) throw new Error('Failed to submit quote request')
        setSubmitted(true)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t.failed)
      }
    })
  }

  const t = isAr ? {
    title: 'اطلب عرض السعر', subtitle: 'أخبرنا عن رحلة السفاري التي تحلم بها وسننشئ عرضاً مخصصاً لك.',
    submitted: 'تم إرسال طلب عرض السعر!', thanks: 'شكراً! لقد استلمنا طلبك وسيتواصل معك فريقنا خلال 24 ساعة بعرض سعر مخصص.',
    backHome: 'العودة للرئيسية',
    firstName: 'الاسم الأول', lastName: 'اسم العائلة', email: 'البريد الإلكتروني', phone: 'الهاتف',
    phoneCode: 'رمز الدولة', country: 'الدولة', selectCountry: 'اختر بلدك', tourType: 'نوع الرحلة',
    selectTour: 'اختر جولة أو حدد مخصصة', custom: 'سفاري مخصص', guided: 'جولة جماعية بمرشد', luxury: 'رحلة فاخرة', adventure: 'سفاري مغامرة',
    startDate: 'تاريخ البدء المفضل', duration: 'المدة (أيام)', groupSize: 'حجم المجموعة', budget: 'الميزانية (دولار)',
    preferences: 'تفضيلات خاصة', preferencesPh: 'أخبرنا عن اهتماماتك أو ميزانيتك أو احتياجاتك الغذائية أو أي طلبات خاصة...',
    budgetBasis: 'نوع الميزانية', perPerson: 'لكل شخص', totalTrip: 'إجمالي الرحلة',
    dateFlexibility: 'مرونة التواريخ', exactDates: 'تواريخ محددة', fewDays: 'مرن بضعة أيام', flexibleMonth: 'مرن خلال الشهر',
    stepTrip: '١. تفاصيل الرحلة', stepContact: '٢. معلومات التواصل', next: 'متابعة', back: 'رجوع',
    sending: 'جارٍ الإرسال...', requestQuote: 'اطلب عرض السعر', cancel: 'إلغاء',
    failed: 'فشل الإرسال. حاول مرة أخرى.',
  } : {
    title: 'Request Your Quote', subtitle: "Tell us about your dream safari and we'll create a personalized proposal just for you.",
    submitted: 'Quote Request Submitted!', thanks: "Thank you! We've received your request and our team will be in touch within 24 hours with a personalized quote.",
    backHome: 'Back to Home',
    firstName: 'First Name', lastName: 'Last Name', email: 'Email', phone: 'Phone',
    phoneCode: 'Country code', country: 'Country', selectCountry: 'Select your country', tourType: 'Tour Type',
    selectTour: 'Select a tour or choose custom', custom: 'Custom Safari', guided: 'Guided Group Tour', luxury: 'Luxury Escape', adventure: 'Adventure Safari',
    startDate: 'Preferred Start Date', duration: 'Duration (days)', groupSize: 'Group Size', budget: 'Budget (USD)',
    preferences: 'Special Preferences', preferencesPh: 'Tell us about your interests, budget, dietary needs, or any special requests...',
    budgetBasis: 'Budget basis', perPerson: 'Per person', totalTrip: 'Total trip',
    dateFlexibility: 'Date flexibility', exactDates: 'Exact dates', fewDays: 'Flexible by a few days', flexibleMonth: 'Flexible within the month',
    stepTrip: '1. Trip basics', stepContact: '2. Contact details', next: 'Continue', back: 'Back',
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
                href={localePath('/', locale)}
                className="px-8 py-3 rounded-lg font-semibold text-white transition inline-block"
                style={{ backgroundColor: G }}
              >
                {t.backHome}
              </Link>
            </div>
          ) : (
            <form method="post" action="/api/quote-request" onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-8 border border-gray-200">
              <input type="hidden" name="submissionId" value={submissionId} />
              <input type="hidden" name="language" value={isAr ? 'ar' : 'en'} />
              <input type="hidden" name="channel" value="website_quote" />
              <div className="mb-8 grid grid-cols-2 gap-2 rounded-lg bg-white p-1 text-sm font-semibold">
                <span className={`rounded-md px-3 py-2 text-center ${step === 1 ? 'bg-[#7A9A4A] text-white' : 'text-gray-500'}`}>{t.stepTrip}</span>
                <span className={`rounded-md px-3 py-2 text-center ${step === 2 ? 'bg-[#7A9A4A] text-white' : 'text-gray-500'}`}>{t.stepContact}</span>
              </div>

              <div className={`${step === 2 ? 'grid' : 'hidden'} md:grid-cols-2 gap-6 mb-6`}>
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

              <div className={`${step === 2 ? 'grid' : 'hidden'} md:grid-cols-2 gap-6 mb-6`}>
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
                  <div className="flex gap-2">
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      aria-label={t.phoneCode}
                      className="w-24 shrink-0 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {COUNTRIES_SORTED.map((c) => (
                        <option key={c.code} value={c.code}>+{c.dial}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              <div className={`${step === 1 ? 'grid' : 'hidden'} md:grid-cols-2 gap-6 mb-6`}>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t.country}</label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleCountryChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">{t.selectCountry}</option>
                    {COUNTRIES_SORTED.map((c) => (
                      <option key={c.code} value={c.name}>{c.name}</option>
                    ))}
                  </select>
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

              <div className={`${step === 1 ? 'grid' : 'hidden'} md:grid-cols-2 gap-6 mb-6`}>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">{t.startDate}</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    name="dateFlexibility"
                    value={formData.dateFlexibility}
                    onChange={handleChange}
                    aria-label={t.dateFlexibility}
                    className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="exact">{t.exactDates}</option>
                    <option value="flexible_few_days">{t.fewDays}</option>
                    <option value="flexible_month">{t.flexibleMonth}</option>
                  </select>
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

              <div className={`${step === 1 ? 'grid' : 'hidden'} md:grid-cols-2 gap-6 mb-6`}>
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
                  <select
                    name="budgetBasis"
                    value={formData.budgetBasis}
                    onChange={handleChange}
                    aria-label={t.budgetBasis}
                    className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="per_person">{t.perPerson}</option>
                    <option value="total">{t.totalTrip}</option>
                  </select>
                </div>
              </div>

              <div className={`${step === 1 ? 'block' : 'hidden'} mb-6`}>
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
                {step === 1 ? <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold text-white transition"
                  style={{ backgroundColor: G }}
                >
                  {t.next}
                </button> : <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold text-white transition disabled:opacity-50"
                  style={{ backgroundColor: G }}
                >
                  {isPending ? t.sending : t.requestQuote}
                </button>}
                {step === 2 ? <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-900 hover:bg-gray-100 transition"
                >
                  {t.back}
                </button> : <Link
                  href={localePath('/tours', locale)}
                  className="px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-900 hover:bg-gray-100 transition"
                >
                  {t.cancel}
                </Link>}
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}

export default function QuoteRequestForm({ initialTours }: { initialTours: TourOption[] }) {
  return (
    <>
      <Suspense>
        <PublicHeader />
      </Suspense>
      <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
        <QuoteRequestFormContent initialTours={initialTours} />
      </Suspense>
      <PublicFooter />
      <WhatsAppButton />
    </>
  )
}
