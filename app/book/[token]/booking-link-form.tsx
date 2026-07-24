'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

const G = '#7A9A4A'

interface Traveller {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  nationality: string
  passportNumber: string
}

function emptyTraveller(): Traveller {
  return { firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', nationality: '', passportNumber: '' }
}

export default function BookingLinkForm({
  token,
  locale,
  pricePerPerson,
  seatsLeft,
}: {
  token: string
  locale: 'en' | 'ar'
  pricePerPerson: number
  seatsLeft: number
}) {
  const ar = locale === 'ar'
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [groupSize, setGroupSize] = useState(1)
  const [createAccount, setCreateAccount] = useState(false)
  const [accountNote, setAccountNote] = useState('')
  const [travellers, setTravellers] = useState<Traveller[]>([emptyTraveller()])

  const maxGroup = Math.min(8, Math.max(1, seatsLeft))
  const totalPrice = pricePerPerson * groupSize

  const t = ar ? {
    groupSize: 'عدد المسافرين',
    travellersInfo: 'معلومات المسافرين',
    traveller: 'المسافر',
    firstName: 'الاسم الأول',
    lastName: 'الاسم الأخير',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    dateOfBirth: 'تاريخ الميلاد',
    nationality: 'الجنسية',
    passportNumber: 'رقم جواز السفر',
    pricePerPerson: 'السعر للفرد',
    totalPrice: 'السعر الإجمالي',
    confirmBooking: 'تأكيد الحجز',
    processing: 'جاري المعالجة...',
    bookingConfirmed: 'تم تأكيد الحجز!',
    confirmationMessage: 'شكراً لحجزك! سيتواصل معك فريقنا قريباً لتفاصيل الدفع والتحضير.',
    createAccount: 'أنشئ حساباً في البوابة لمتابعة حجزي (اختياري)',
    accountCreated: 'تم إرسال رابط لتفعيل حسابك إلى بريدك الإلكتروني.',
    seatsLeft: (n: number) => `${n} مقعد متبقٍ`,
  } : {
    groupSize: 'Number of Travellers',
    travellersInfo: 'Traveller Information',
    traveller: 'Traveller',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    dateOfBirth: 'Date of Birth',
    nationality: 'Nationality',
    passportNumber: 'Passport Number',
    pricePerPerson: 'Price per Person',
    totalPrice: 'Total Price',
    confirmBooking: 'Confirm Booking',
    processing: 'Processing...',
    bookingConfirmed: 'Booking Confirmed!',
    confirmationMessage: 'Thank you for your booking! Our team will contact you soon with payment and preparation details.',
    createAccount: 'Create a portal account to track my booking (optional)',
    accountCreated: 'A link to activate your account has been sent to your email.',
    seatsLeft: (n: number) => `${n} seat${n === 1 ? '' : 's'} left`,
  }

  const handleGroupSizeChange = (size: number) => {
    setGroupSize(size)
    setTravellers(Array.from({ length: size }, (_, i) => travellers[i] || emptyTraveller()))
  }

  const handleTravellerChange = (index: number, field: keyof Traveller, value: string) => {
    const next = [...travellers]
    next[index] = { ...next[index], [field]: value }
    setTravellers(next)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        const res = await fetch(`/api/book/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ travellers, totalPrice, currency: 'USD' }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Failed to complete booking. Please try again.')

        // Optional: create a portal account for the lead traveller (best-effort).
        if (createAccount && travellers[0]?.email) {
          try {
            const supabase = createClient()
            const origin = typeof window !== 'undefined' ? window.location.origin : ''
            const { error: signUpError } = await supabase.auth.signUp({
              email: travellers[0].email,
              password: crypto.randomUUID(),
              options: {
                emailRedirectTo: `${origin}/auth/callback`,
                data: {
                  first_name: travellers[0].firstName,
                  last_name: travellers[0].lastName,
                  phone: travellers[0].phone,
                },
              },
            })
            if (!signUpError) setAccountNote(t.accountCreated)
          } catch { /* account creation is optional */ }
        }

        setSubmitted(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete booking. Please try again.')
      }
    })
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-green-900 mb-3">{t.bookingConfirmed}</h2>
        <p className="text-green-700">{t.confirmationMessage}</p>
        {accountNote && <p className="mt-4 text-sm text-green-800">{accountNote}</p>}
      </div>
    )
  }

  const groupChoices = Array.from({ length: maxGroup }, (_, i) => i + 1)

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-semibold text-gray-900">{t.groupSize} *</label>
          <span className="text-xs font-medium text-gray-500">{t.seatsLeft(seatsLeft)}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {groupChoices.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => handleGroupSizeChange(size)}
              className={`p-3 rounded-lg font-semibold transition ${
                groupSize === size ? 'text-white' : 'bg-white border-2 border-gray-300 text-gray-900 hover:border-gray-400'
              }`}
              style={{ backgroundColor: groupSize === size ? G : undefined }}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">{t.travellersInfo}</h3>
        <div className="space-y-8">
          {travellers.map((traveller, index) => (
            <div key={index} className="pb-8 border-b border-gray-200 last:border-b-0">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">{t.traveller} {index + 1}</h4>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <Field label={`${t.firstName} *`} value={traveller.firstName} onChange={v => handleTravellerChange(index, 'firstName', v)} required />
                <Field label={`${t.lastName} *`} value={traveller.lastName} onChange={v => handleTravellerChange(index, 'lastName', v)} required />
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <Field type="email" label={`${t.email} *`} value={traveller.email} onChange={v => handleTravellerChange(index, 'email', v)} required />
                <Field type="tel" label={`${t.phone} *`} value={traveller.phone} onChange={v => handleTravellerChange(index, 'phone', v)} required />
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <Field type="date" label={t.dateOfBirth} value={traveller.dateOfBirth} onChange={v => handleTravellerChange(index, 'dateOfBirth', v)} />
                <Field label={t.nationality} value={traveller.nationality} onChange={v => handleTravellerChange(index, 'nationality', v)} />
              </div>
              <Field label={t.passportNumber} value={traveller.passportNumber} onChange={v => handleTravellerChange(index, 'passportNumber', v)} />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 p-6 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-600">{t.pricePerPerson}:</span>
          <span className="text-xl font-bold" style={{ color: G }}>${pricePerPerson.toLocaleString()}</span>
        </div>
        <div className="border-t border-gray-300 pt-3 flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">{t.totalPrice}:</span>
          <span className="text-3xl font-bold" style={{ color: G }}>${totalPrice.toLocaleString()}</span>
        </div>
      </div>

      <label className="mb-6 flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={createAccount} onChange={e => setCreateAccount(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>{t.createAccount}</span>
      </label>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full px-6 py-3 rounded-lg font-semibold text-white transition disabled:opacity-50"
        style={{ backgroundColor: G }}
      >
        {isPending ? t.processing : t.confirmBooking}
      </button>
    </form>
  )
}

function Field({
  label, value, onChange, type = 'text', required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  )
}
