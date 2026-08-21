'use client'

import { useState, useEffect, useTransition, Suspense } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import { createClient } from '@/lib/supabase/client'
import { localePath } from '@/lib/locale'
import { useLocale } from '@/lib/use-locale'
import { COUNTRIES_SORTED, dialCodeFor } from '@/lib/countries'

const G = '#7A9A4A'

interface Traveller {
  firstName: string
  lastName: string
  email: string
  phone: string
  phoneCountryCode: string
  dateOfBirth: string
  nationality: string
  passportNumber: string
}

function emptyTraveller(): Traveller {
  return { firstName: '', lastName: '', email: '', phone: '', phoneCountryCode: 'KE', dateOfBirth: '', nationality: '', passportNumber: '' }
}

async function submitBooking(departureId: string, formData: { travellers: Traveller[]; roomType: 'sharing' | 'single' }) {
  const response = await fetch(`/api/departures/${departureId}/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  })
  if (!response.ok) throw new Error('Failed to complete booking')
  return response.json()
}

function BookingFormContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const departureId = params.id as string
  // From the path, like every other client page. Reading ?lang= meant the whole
  // booking form — which has a complete Arabic dictionary below — rendered in
  // English at /ar/departures/<id>/book.
  const locale = useLocale()
  // Either room-type price can be absent — that means this departure doesn't
  // offer that category (e.g. sharing-only or single-only trips).
  const sharingPrice = searchParams.get('price') ? parseFloat(searchParams.get('price')!) : null
  const singlePrice = searchParams.get('priceSingle') ? parseFloat(searchParams.get('priceSingle')!) : null
  const depositPerPerson = searchParams.get('deposit') ? parseFloat(searchParams.get('deposit')!) : 0
  const tourTitle = searchParams.get('tour') || ''

  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [groupSize, setGroupSize] = useState(1)
  const [roomType, setRoomType] = useState<'sharing' | 'single'>(sharingPrice != null ? 'sharing' : 'single')
  const pricePerPerson = (roomType === 'single' && singlePrice != null)
    ? singlePrice
    : (sharingPrice ?? singlePrice ?? 0)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [travellers, setTravellers] = useState<Traveller[]>([emptyTraveller()])

  // Auto-fill the first traveller from the signed-in account; otherwise flag that
  // the visitor can sign in to book faster.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (!u) { setSignedIn(false); return }
      setSignedIn(true)
      setTravellers(prev => {
        const copy = [...prev]
        copy[0] = {
          ...copy[0],
          firstName: copy[0].firstName || (u.user_metadata?.first_name ?? ''),
          lastName: copy[0].lastName || (u.user_metadata?.last_name ?? ''),
          email: copy[0].email || (u.email ?? ''),
          phone: copy[0].phone || (u.user_metadata?.phone ?? ''),
        }
        return copy
      })
    })
  }, [])

  const bookingPath = `${localePath(`/departures/${departureId}/book`, locale)}?price=${pricePerPerson}&tour=${encodeURIComponent(tourTitle)}`

  const t = locale === 'ar' ? {
    bookNow: 'احجز الآن',
    roomType: 'نوع الغرفة',
    sharingRoom: 'غرفة مزدوجة (مشتركة)',
    singleRoom: 'غرفة خاصة',
    perPerson: 'للفرد',
    groupSize: 'عدد المسافرين',
    travellersInfo: 'معلومات المسافرين',
    firstName: 'الاسم الأول',
    lastName: 'الاسم الأخير',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    phoneCode: 'رمز الدولة',
    dateOfBirth: 'تاريخ الميلاد',
    nationality: 'الجنسية',
    passportNumber: 'رقم جواز السفر',
    totalPrice: 'السعر الإجمالي',
    securityDeposit: 'تأمين قابل للاسترداد',
    depositNote: 'يُدفع قبل بدء الرحلة ويُعاد كاملاً في حال عدم وجود أضرار بالدراجة.',
    totalDue: 'الإجمالي المطلوب',
    confirmBooking: 'تأكيد الحجز',
    cancel: 'إلغاء',
    bookingConfirmed: 'تم تأكيد الحجز!',
    confirmationMessage: 'شكراً لحجزك! سيتواصل معك فريقنا قريباً للتفاصيل النهائية.',
    backToDepartures: 'العودة إلى الرحلات',
    backToHome: 'العودة إلى الرئيسية',
  } : {
    bookNow: 'Book Now',
    roomType: 'Room Type',
    sharingRoom: 'Twin/double room (sharing)',
    singleRoom: 'Single room',
    perPerson: 'per person',
    groupSize: 'Number of Travellers',
    travellersInfo: 'Traveller Information',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    phoneCode: 'Country code',
    dateOfBirth: 'Date of Birth',
    nationality: 'Nationality',
    passportNumber: 'Passport Number',
    totalPrice: 'Total Price',
    securityDeposit: 'Refundable security deposit',
    depositNote: 'Paid before the trip starts, returned in full if the bike is undamaged.',
    totalDue: 'Total due',
    confirmBooking: 'Confirm Booking',
    cancel: 'Cancel',
    bookingConfirmed: 'Booking Confirmed!',
    confirmationMessage: 'Thank you for your booking! Our team will contact you soon with final details.',
    backToDepartures: 'Back to Departures',
    backToHome: 'Back to Home',
  }

  const totalPrice = pricePerPerson * groupSize
  const totalDeposit = depositPerPerson * groupSize
  const totalDue = totalPrice + totalDeposit

  const handleGroupSizeChange = (size: number) => {
    setGroupSize(size)
    const newTravellers = Array.from({ length: size }, (_, i) => travellers[i] || emptyTraveller())
    setTravellers(newTravellers)
  }

  const handleTravellerChange = (index: number, field: keyof Traveller, value: string) => {
    const newTravellers = [...travellers]
    newTravellers[index] = { ...newTravellers[index], [field]: value }
    setTravellers(newTravellers)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        // Combine each traveller's country-code selection with the digits they
        // typed only at submit time, so the two stay independently editable
        // right up until the request goes out.
        const withDialCodes = travellers.map(t => {
          const dial = dialCodeFor(t.phoneCountryCode)
          return { ...t, phone: dial ? `+${dial}${t.phone.trim()}` : t.phone.trim() }
        })
        await submitBooking(departureId, { travellers: withDialCodes, roomType })
        setSubmitted(true)
      } catch (err: any) {
        setError(err.message || 'Failed to complete booking. Please try again.')
      }
    })
  }

  return (
    <main dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 md:py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.bookNow}</h1>
          <p className="text-lg text-gray-300">
            {tourTitle}
          </p>
        </div>
      </section>

      {/* Booking Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-2xl mx-auto px-4">
          {signedIn === false && !submitted && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-5 py-4">
              <span className="text-sm text-blue-900">
                {locale === 'ar'
                  ? 'لديك حساب؟ سجّل الدخول للحجز بشكل أسرع وتعبئة بياناتك تلقائياً.'
                  : 'Have an account? Sign in to book faster and auto-fill your details.'}
              </span>
              <Link
                href={`${localePath('/login', locale)}?redirect=${encodeURIComponent(bookingPath)}`}
                className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white text-center"
                style={{ backgroundColor: G }}
              >
                {locale === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
              </Link>
            </div>
          )}
          {signedIn === true && !submitted && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-5 py-3 text-sm text-green-800">
              {locale === 'ar'
                ? '✓ تم تسجيل دخولك — تمت تعبئة بيانات المسافر الأول تلقائياً.'
                : "✓ You're signed in — the first traveller has been filled in for you."}
            </div>
          )}
          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-2xl font-bold text-green-900 mb-3">{t.bookingConfirmed}</h2>
              <p className="text-green-700 mb-6">
                {t.confirmationMessage}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href={localePath('/departures', locale)}
                  className="px-8 py-3 rounded-lg font-semibold text-white transition inline-block"
                  style={{ backgroundColor: G }}
                >
                  {t.backToDepartures}
                </Link>
                <Link
                  href={localePath('/', locale)}
                  className="px-8 py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-900 hover:bg-gray-100 transition inline-block"
                >
                  {t.backToHome}
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-8 border border-gray-200">
              {/* Room Type Selection — only when both categories are actually on sale;
                  a departure offering just one room type has nothing to choose. */}
              {sharingPrice != null && singlePrice != null && (
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-gray-900 mb-4">{t.roomType} *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { value: 'sharing' as const, label: t.sharingRoom, price: sharingPrice },
                      { value: 'single' as const, label: t.singleRoom, price: singlePrice },
                    ]).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRoomType(opt.value)}
                        className={`p-4 rounded-lg text-left transition ${
                          roomType === opt.value
                            ? 'text-white'
                            : 'bg-white border-2 border-gray-300 text-gray-900 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: roomType === opt.value ? G : undefined }}
                      >
                        <span className="block font-semibold">{opt.label}</span>
                        <span className={`block text-sm mt-1 ${roomType === opt.value ? 'text-white/80' : 'text-gray-500'}`}>
                          ${opt.price.toLocaleString()} {t.perPerson}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Group Size Selection */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-900 mb-4">{t.groupSize} *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleGroupSizeChange(size)}
                      className={`p-3 rounded-lg font-semibold transition ${
                        groupSize === size
                          ? 'text-white'
                          : 'bg-white border-2 border-gray-300 text-gray-900 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: groupSize === size ? G : undefined }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Traveller Information */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{t.travellersInfo}</h3>
                <div className="space-y-8">
                  {travellers.map((traveller, index) => (
                    <div key={index} className="pb-8 border-b border-gray-300 last:border-b-0">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">
                        {locale === 'ar' ? `المسافر ${index + 1}` : `Traveller ${index + 1}`}
                      </h4>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">{t.firstName} *</label>
                          <input
                            type="text"
                            value={traveller.firstName}
                            onChange={(e) => handleTravellerChange(index, 'firstName', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">{t.lastName} *</label>
                          <input
                            type="text"
                            value={traveller.lastName}
                            onChange={(e) => handleTravellerChange(index, 'lastName', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">{t.email} *</label>
                          <input
                            type="email"
                            value={traveller.email}
                            onChange={(e) => handleTravellerChange(index, 'email', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">{t.phone} *</label>
                          <div className="flex gap-2">
                            <select
                              value={traveller.phoneCountryCode}
                              onChange={(e) => handleTravellerChange(index, 'phoneCountryCode', e.target.value)}
                              aria-label={t.phoneCode}
                              className="w-24 shrink-0 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              {COUNTRIES_SORTED.map((c) => (
                                <option key={c.code} value={c.code}>+{c.dial}</option>
                              ))}
                            </select>
                            <input
                              type="tel"
                              value={traveller.phone}
                              onChange={(e) => handleTravellerChange(index, 'phone', e.target.value)}
                              required
                              className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">{t.dateOfBirth} *</label>
                          <input
                            type="date"
                            value={traveller.dateOfBirth}
                            onChange={(e) => handleTravellerChange(index, 'dateOfBirth', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">{t.nationality} *</label>
                          <input
                            type="text"
                            value={traveller.nationality}
                            onChange={(e) => handleTravellerChange(index, 'nationality', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">{t.passportNumber} *</label>
                        <input
                          type="text"
                          value={traveller.passportNumber}
                          onChange={(e) => handleTravellerChange(index, 'passportNumber', e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Summary */}
              <div className="mb-8 p-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">{locale === 'ar' ? 'السعر للفرد' : 'Price per Person'}:</span>
                  <span className="text-xl font-bold" style={{ color: G }}>${pricePerPerson?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">{locale === 'ar' ? 'عدد المسافرين' : 'Number of Travellers'}:</span>
                  <span className="text-xl font-bold">{groupSize}</span>
                </div>
                <div className="border-t border-gray-300 pt-4 flex justify-between items-center">
                  <span className="text-gray-600">{t.totalPrice}:</span>
                  <span className="text-xl font-bold text-gray-900">${totalPrice.toLocaleString()}</span>
                </div>
                {totalDeposit > 0 && (
                  <>
                    <div className="pt-3 flex justify-between items-center">
                      <span className="text-gray-600">{t.securityDeposit}:</span>
                      <span className="text-xl font-bold text-gray-900">${totalDeposit.toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{t.depositNote}</p>
                  </>
                )}
                <div className="border-t border-gray-300 mt-4 pt-4 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">{t.totalDue}:</span>
                  <span className="text-3xl font-bold" style={{ color: G }}>${totalDue.toLocaleString()}</span>
                </div>
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
                  {isPending ? (locale === 'ar' ? 'جاري المعالجة...' : 'Processing...') : t.confirmBooking}
                </button>
                <Link
                  href={localePath('/departures', locale)}
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

export default function BookingPage() {
  return (
    <>
      <Suspense>
        <PublicHeader />
      </Suspense>
      <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
        <BookingFormContent />
      </Suspense>
      <PublicFooter />
    </>
  )
}
