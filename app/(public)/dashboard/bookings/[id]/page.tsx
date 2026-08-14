import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import PrintButton from '@/components/public/print-button'
import type { BookingTraveller } from '@/lib/types'
import { getServerLocale } from '@/lib/i18n'
import { localePath } from '@/lib/locale'
import { resolveTripDates } from '@/lib/trip-dates'
import { getTripBalance } from '@/lib/server/accounting'

const G = '#7A9A4A'

// Same convention as the departures list: Gregorian months in Arabic script,
// so a date reads naturally without changing calendar under the client.
const fmtDate = (value: string | Date | null | undefined, isAr: boolean, withTime = false) => {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  const tag = isAr ? 'ar-SA-u-ca-gregory' : 'en-GB'
  return withTime ? d.toLocaleString(tag) : d.toLocaleDateString(tag)
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const locale = await getServerLocale()
  const isAr = locale === 'ar'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(localePath('/login', locale))

  const admin = createAdminClient()

  // Get booking details
  const { data: booking } = await admin
    .from('bookings')
    .select(`
      *,
      start_date,
      end_date,
      departures (
        id,
        start_date,
        end_date,
        tours (
          id,
          title_en,
          title_ar
        )
      ),
      booking_travellers (
        id,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        nationality,
        passport_number
      )
    `)
    .eq('id', id)
    .single()

  if (!booking) notFound()

  // Authorise: the booking must include a traveller whose email matches the account.
  const userEmail = (user.email ?? '').toLowerCase()
  const ownsBooking = (booking.booking_travellers as any[])?.some(
    (t) => (t.email ?? '').toLowerCase() === userEmail
  )
  if (!ownsBooking) notFound()

  const departure = booking.departures as any
  const tour = departure?.tours as any
  const travellers = (booking.booking_travellers ?? []) as BookingTraveller[]

  // What this trip owes, from the one shared calculation — so the figure a
  // client reads here is the same one the back office sees.
  const {
    invoicedUsd: totalPrice,
    receivedUsd: paidAmount,
    balanceUsd: balanceDue,
    paidPercent: paidPct,
    depositDueUsd: depositDue,
    payments,
  } = await getTripBalance(admin, { bookingId: id })

  // Bank-transfer details so the client knows how to pay the balance. Pulled
  // from company_settings; when an online payment gateway is added later a pay
  // button can slot into this same section.
  const { data: settings } = await admin
    .from('company_settings')
    .select('bank_account_name, bank_account_number, bank_name, bank_account_type, email, whatsapp, deposit_percent')
    .limit(1)
    .maybeSingle()
  const hasBankDetails = !!(settings?.bank_account_number || settings?.bank_name)
  const depositPercent = Number(settings?.deposit_percent) || 0

  // Countdown to the trip. Dates come from the departure, or from the booking's
  // own columns when it is a private trip (lib/trip-dates.ts).
  const dates = resolveTripDates(booking as any)
  const startDate = dates.startDate ? new Date(dates.startDate) : null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysToGo = startDate
    ? Math.ceil((startDate.getTime() - today.getTime()) / 86400000)
    : null

  const bookingStatus = (booking.status as string) || 'pending'
  const isCancelled = bookingStatus === 'cancelled'

  // Status timeline steps. Mark progress based on the booking status.
  const currentStep = bookingStatus === 'completed' ? 2 : bookingStatus === 'confirmed' ? 1 : 0
  const timeline = isAr ? [
    { key: 'pending', label: 'تم الحجز', desc: 'استلمنا طلبك' },
    { key: 'confirmed', label: 'مؤكد', desc: 'تم تأمين مقعدك' },
    { key: 'completed', label: 'مكتملة', desc: 'انتهت الرحلة' },
  ] : [
    { key: 'pending', label: 'Booked', desc: 'Request received' },
    { key: 'confirmed', label: 'Confirmed', desc: 'Spot secured' },
    { key: 'completed', label: 'Completed', desc: 'Trip finished' },
  ]

  const t = isAr ? {
    back: 'العودة إلى لوحة التحكم', startsToday: 'تبدأ رحلتك اليوم! 🦁',
    day: 'يوم', days: 'أيام', untilSafari: 'حتى موعد رحلتك', departing: 'الانطلاق',
    reference: 'الرقم المرجعي', cancelled: 'تم إلغاء هذا الحجز.',
    startDate: 'تاريخ البداية', endDate: 'تاريخ النهاية',
    travellers: 'المسافرون', totalPrice: 'السعر الإجمالي',
    payment: 'الدفع', paidInFull: 'مدفوع بالكامل', partiallyPaid: 'مدفوع جزئياً',
    awaitingPayment: 'بانتظار الدفع', paid: 'المدفوع', balanceDue: 'المبلغ المتبقي',
    howToPay: 'طريقة الدفع',
    payIntro: 'ادفع عبر التحويل البنكي باستخدام البيانات أدناه، ثم أرسل لنا إشعار التحويل لنحدّث حجزك.',
    depositA: 'دفعة مقدمة قدرها', depositB: 'تؤكد حجزك.',
    bank: 'البنك', accountName: 'اسم الحساب', accountNumber: 'رقم الحساب',
    accountType: 'نوع الحساب', amountDue: 'المبلغ المستحق',
    bookingRef: 'حجز', sendConfirmationTo: 'أرسل إشعار التحويل إلى', or: ' أو ',
    travellerInfo: 'بيانات المسافرين', traveller: 'المسافر',
    name: 'الاسم', email: 'البريد الإلكتروني', phone: 'الهاتف',
    dob: 'تاريخ الميلاد', nationality: 'الجنسية', passport: 'رقم جواز السفر',
    confirmedOn: 'تاريخ تأكيد الحجز',
    statuses: { pending: 'قيد الانتظار', confirmed: 'مؤكد', completed: 'مكتمل', cancelled: 'ملغي' } as Record<string, string>,
  } : {
    back: 'Back to Dashboard', startsToday: 'Your safari starts today! 🦁',
    day: 'day', days: 'days', untilSafari: 'until your safari', departing: 'Departing',
    reference: 'Reference', cancelled: 'This booking has been cancelled.',
    startDate: 'Start Date', endDate: 'End Date',
    travellers: 'Travellers', totalPrice: 'Total Price',
    payment: 'Payment', paidInFull: 'Paid in full', partiallyPaid: 'Partially paid',
    awaitingPayment: 'Awaiting payment', paid: 'Paid', balanceDue: 'Balance due',
    howToPay: 'How to pay',
    payIntro: 'Pay by bank transfer using the details below, then send us your transfer confirmation so we can update your booking.',
    depositA: 'A deposit of', depositB: 'secures your booking.',
    bank: 'Bank', accountName: 'Account name', accountNumber: 'Account number',
    accountType: 'Account type', amountDue: 'Amount due',
    bookingRef: 'Booking', sendConfirmationTo: 'Send your transfer confirmation to', or: ' or ',
    travellerInfo: 'Traveller Information', traveller: 'Traveller',
    name: 'Name', email: 'Email', phone: 'Phone',
    dob: 'Date of Birth', nationality: 'Nationality', passport: 'Passport Number',
    confirmedOn: 'Booking Confirmation Date',
    statuses: {} as Record<string, string>,
  }

  const statusMap: Record<string, { bg: string; text: string; badge: string }> = {
    confirmed: { bg: 'bg-green-50', text: 'text-green-900', badge: 'bg-green-100 text-green-700' },
    completed: { bg: 'bg-green-50', text: 'text-green-900', badge: 'bg-green-100 text-green-700' },
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-900', badge: 'bg-yellow-100 text-yellow-700' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-900', badge: 'bg-red-100 text-red-700' },
  }

  const status = statusMap[bookingStatus] || { bg: 'bg-gray-50', text: 'text-gray-900', badge: 'bg-gray-100 text-gray-600' }

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6 print:hidden">
            <Link href={localePath('/dashboard', locale)} className="text-sm text-gray-600 hover:text-gray-900 inline-block">
              {isAr ? '→' : '←'} {t.back}
            </Link>
            <PrintButton />
          </div>

          {/* Countdown banner */}
          {!isCancelled && daysToGo !== null && daysToGo >= 0 && (
            <div className="rounded-lg p-5 mb-6 text-white text-center" style={{ backgroundColor: G }}>
              {daysToGo === 0 ? (
                <p className="text-xl font-bold">{t.startsToday}</p>
              ) : (
                <p className="text-xl font-bold">
                  {daysToGo} {daysToGo === 1 ? t.day : t.days} {t.untilSafari}
                </p>
              )}
              <p className="text-sm opacity-90 mt-1">
                {t.departing}{' '}
                {startDate
                  ? startDate.toLocaleDateString(isAr ? 'ar-SA-u-ca-gregory' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          )}

          {/* Booking Summary */}
          <div className={`rounded-lg border border-gray-200 p-6 mb-6 ${status.bg}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 dir="auto" className="text-2xl font-bold text-gray-900">
                  {(isAr ? tour?.title_ar || tour?.title_en : tour?.title_en)
                    || (isAr ? 'رحلة خاصة' : 'Private trip')}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {t.reference}: {booking.reference || id}
                </p>
              </div>
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${status.badge}`}>
                {t.statuses[bookingStatus] ?? bookingStatus}
              </span>
            </div>

            {/* Status timeline */}
            {!isCancelled ? (
              <div className="flex items-center mt-2 mb-2">
                {timeline.map((step, i) => {
                  const done = i <= currentStep
                  return (
                    <div key={step.key} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center text-center">
                        <div
                          className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold ${
                            done ? 'text-white' : 'bg-gray-200 text-gray-400'
                          }`}
                          style={done ? { backgroundColor: G } : undefined}
                        >
                          {i < currentStep ? '✓' : i + 1}
                        </div>
                        <p className={`text-xs font-semibold mt-1.5 ${done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                        <p className="text-[10px] text-gray-400">{step.desc}</p>
                      </div>
                      {i < timeline.length - 1 && (
                        <div className={`flex-1 h-1 mx-1 rounded ${i < currentStep ? '' : 'bg-gray-200'}`} style={i < currentStep ? { backgroundColor: G } : undefined} />
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm font-medium text-red-700 mt-2">{t.cancelled}</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-300">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">{t.startDate}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{fmtDate(dates.startDate, isAr)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">{t.endDate}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{fmtDate(dates.endDate, isAr)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">{t.travellers}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{booking.number_of_travellers}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">{t.totalPrice}</p>
                <p className="text-lg font-bold mt-1" style={{ color: G }}>
                  ${totalPrice.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Payment progress */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">{t.payment}</h2>
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                paidPct >= 100 ? 'bg-green-100 text-green-700' : paidAmount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {paidPct >= 100 ? t.paidInFull : paidAmount > 0 ? t.partiallyPaid : t.awaitingPayment}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full transition-all" style={{ width: `${paidPct}%`, backgroundColor: G }} />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-gray-600">{t.paid}: <span className="font-semibold text-gray-900">${paidAmount.toLocaleString()}</span></span>
              {balanceDue > 0 && (
                <span className="text-gray-600">{t.balanceDue}: <span className="font-semibold text-gray-900">${balanceDue.toLocaleString()}</span></span>
              )}
            </div>
            {payments && payments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-xs text-gray-500">
                    <span>
                      {fmtDate(p.received_at, isAr)}
                      {p.method ? ` · ${p.method}` : ''}
                    </span>
                    <span className="font-medium text-gray-700">
                      ${Number(p.amount_usd).toLocaleString()}{p.payment_type ? ` · ${p.payment_type}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How to pay — bank transfer details, shown while a balance is outstanding */}
          {balanceDue > 0 && hasBankDetails && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">{t.howToPay}</h2>
              <p className="text-sm text-gray-600 mb-4">
                {t.payIntro}
                {depositDue > 0 && paidAmount === 0 && (
                  <> {t.depositA} <span className="font-semibold text-gray-900">${depositDue.toLocaleString()}</span> ({depositPercent}%) {t.depositB}</>
                )}
              </p>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {settings?.bank_name && (
                  <div>
                    <dt className="text-gray-600">{t.bank}</dt>
                    <dd className="font-semibold text-gray-900">{settings.bank_name}</dd>
                  </div>
                )}
                {settings?.bank_account_name && (
                  <div>
                    <dt className="text-gray-600">{t.accountName}</dt>
                    <dd className="font-semibold text-gray-900">{settings.bank_account_name}</dd>
                  </div>
                )}
                {settings?.bank_account_number && (
                  <div>
                    <dt className="text-gray-600">{t.accountNumber}</dt>
                    <dd className="font-semibold text-gray-900 tabular-nums">{settings.bank_account_number}</dd>
                  </div>
                )}
                {settings?.bank_account_type && (
                  <div>
                    <dt className="text-gray-600">{t.accountType}</dt>
                    <dd className="font-semibold text-gray-900">{settings.bank_account_type}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-600">{t.amountDue}</dt>
                  <dd className="font-semibold" style={{ color: G }}>${balanceDue.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">{t.reference}</dt>
                  <dd className="font-semibold text-gray-900">{t.bookingRef} {String(booking.id).slice(0, 8).toUpperCase()}</dd>
                </div>
              </dl>
              {(settings?.email || settings?.whatsapp) && (
                <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
                  {t.sendConfirmationTo}{' '}
                  {settings.email && <span className="font-medium text-gray-700">{settings.email}</span>}
                  {settings.email && settings.whatsapp && t.or}
                  {settings.whatsapp && <span className="font-medium text-gray-700">WhatsApp {settings.whatsapp}</span>}.
                </p>
              )}
            </div>
          )}

          {/* Traveller Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">{t.travellerInfo}</h2>
            <div className="space-y-6">
              {travellers.map((traveller, index) => (
                <div key={traveller.id} className="pb-6 border-b border-gray-200 last:border-b-0">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {t.traveller} {index + 1}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">{t.name}</p>
                      <p className="font-medium text-gray-900">{traveller.first_name} {traveller.last_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">{t.email}</p>
                      <p className="font-medium text-gray-900">{traveller.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">{t.phone}</p>
                      <p className="font-medium text-gray-900">{traveller.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">{t.dob}</p>
                      <p className="font-medium text-gray-900">{fmtDate(traveller.date_of_birth, isAr)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">{t.nationality}</p>
                      <p className="font-medium text-gray-900">{traveller.nationality}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">{t.passport}</p>
                      <p className="font-medium text-gray-900">{traveller.passport_number}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Booking Date */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600">{t.confirmedOn}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{fmtDate(booking.created_at, isAr, true)}</p>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  )
}
