import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import PrintButton from '@/components/public/print-button'
import type { BookingTraveller } from '@/lib/types'

const G = '#7A9A4A'

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Get booking details
  const { data: booking } = await admin
    .from('bookings')
    .select(`
      *,
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

  // Payment records (group_25). Sum what's been paid vs the booking total.
  const { data: payments } = await admin
    .from('booking_payments')
    .select('amount_usd, status, method, created_at')
    .eq('booking_id', id)
    .order('created_at', { ascending: true })

  const totalPrice = Number(booking.total_price_usd) || 0
  const paidAmount = (payments ?? [])
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (Number(p.amount_usd) || 0), 0)
  const paidPct = totalPrice > 0 ? Math.min(100, Math.round((paidAmount / totalPrice) * 100)) : 0
  const balanceDue = Math.max(0, totalPrice - paidAmount)

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
  const depositDue = depositPercent > 0 ? Math.round(totalPrice * depositPercent) / 100 : 0

  // Countdown to departure.
  const startDate = departure?.start_date ? new Date(departure.start_date) : null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysToGo = startDate
    ? Math.ceil((startDate.getTime() - today.getTime()) / 86400000)
    : null

  const bookingStatus = (booking.status as string) || 'pending'
  const isCancelled = bookingStatus === 'cancelled'

  // Status timeline steps. Mark progress based on the booking status.
  const currentStep = bookingStatus === 'completed' ? 2 : bookingStatus === 'confirmed' ? 1 : 0
  const timeline = [
    { key: 'pending', label: 'Booked', desc: 'Request received' },
    { key: 'confirmed', label: 'Confirmed', desc: 'Spot secured' },
    { key: 'completed', label: 'Completed', desc: 'Trip finished' },
  ]

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
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 inline-block">
              ← Back to Dashboard
            </Link>
            <PrintButton />
          </div>

          {/* Countdown banner */}
          {!isCancelled && daysToGo !== null && daysToGo >= 0 && (
            <div className="rounded-lg p-5 mb-6 text-white text-center" style={{ backgroundColor: G }}>
              {daysToGo === 0 ? (
                <p className="text-xl font-bold">Your safari starts today! 🦁</p>
              ) : (
                <p className="text-xl font-bold">
                  {daysToGo} {daysToGo === 1 ? 'day' : 'days'} until your safari
                </p>
              )}
              <p className="text-sm opacity-90 mt-1">
                Departing {startDate ? startDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </p>
            </div>
          )}

          {/* Booking Summary */}
          <div className={`rounded-lg border border-gray-200 p-6 mb-6 ${status.bg}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{tour?.title_en}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Reference: {booking.reference || id}
                </p>
              </div>
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${status.badge}`}>
                {bookingStatus}
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
              <p className="text-sm font-medium text-red-700 mt-2">This booking has been cancelled.</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-300">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Start Date</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {departure?.start_date ? new Date(departure.start_date).toLocaleDateString('en-GB') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">End Date</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {departure?.end_date ? new Date(departure.end_date).toLocaleDateString('en-GB') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Travellers</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{booking.number_of_travellers}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Total Price</p>
                <p className="text-lg font-bold mt-1" style={{ color: G }}>
                  ${totalPrice.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Payment progress */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Payment</h2>
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                paidPct >= 100 ? 'bg-green-100 text-green-700' : paidAmount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {paidPct >= 100 ? 'Paid in full' : paidAmount > 0 ? 'Partially paid' : 'Awaiting payment'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full transition-all" style={{ width: `${paidPct}%`, backgroundColor: G }} />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-gray-600">Paid: <span className="font-semibold text-gray-900">${paidAmount.toLocaleString()}</span></span>
              {balanceDue > 0 && (
                <span className="text-gray-600">Balance due: <span className="font-semibold text-gray-900">${balanceDue.toLocaleString()}</span></span>
              )}
            </div>
            {payments && payments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-500">
                    <span>
                      {new Date(p.created_at).toLocaleDateString('en-GB')}
                      {p.method ? ` · ${p.method}` : ''}
                    </span>
                    <span className="font-medium text-gray-700">
                      ${Number(p.amount_usd).toLocaleString()} · {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How to pay — bank transfer details, shown while a balance is outstanding */}
          {balanceDue > 0 && hasBankDetails && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">How to pay</h2>
              <p className="text-sm text-gray-600 mb-4">
                Pay by bank transfer using the details below, then send us your transfer
                confirmation so we can update your booking.
                {depositDue > 0 && paidAmount === 0 && (
                  <> A deposit of <span className="font-semibold text-gray-900">${depositDue.toLocaleString()}</span> ({depositPercent}%) secures your booking.</>
                )}
              </p>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {settings?.bank_name && (
                  <div>
                    <dt className="text-gray-600">Bank</dt>
                    <dd className="font-semibold text-gray-900">{settings.bank_name}</dd>
                  </div>
                )}
                {settings?.bank_account_name && (
                  <div>
                    <dt className="text-gray-600">Account name</dt>
                    <dd className="font-semibold text-gray-900">{settings.bank_account_name}</dd>
                  </div>
                )}
                {settings?.bank_account_number && (
                  <div>
                    <dt className="text-gray-600">Account number</dt>
                    <dd className="font-semibold text-gray-900 tabular-nums">{settings.bank_account_number}</dd>
                  </div>
                )}
                {settings?.bank_account_type && (
                  <div>
                    <dt className="text-gray-600">Account type</dt>
                    <dd className="font-semibold text-gray-900">{settings.bank_account_type}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-600">Amount due</dt>
                  <dd className="font-semibold" style={{ color: G }}>${balanceDue.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">Reference</dt>
                  <dd className="font-semibold text-gray-900">Booking {String(booking.id).slice(0, 8).toUpperCase()}</dd>
                </div>
              </dl>
              {(settings?.email || settings?.whatsapp) && (
                <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
                  Send your transfer confirmation to{' '}
                  {settings.email && <span className="font-medium text-gray-700">{settings.email}</span>}
                  {settings.email && settings.whatsapp && ' or '}
                  {settings.whatsapp && <span className="font-medium text-gray-700">WhatsApp {settings.whatsapp}</span>}.
                </p>
              )}
            </div>
          )}

          {/* Traveller Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Traveller Information</h2>
            <div className="space-y-6">
              {travellers.map((traveller, index) => (
                <div key={traveller.id} className="pb-6 border-b border-gray-200 last:border-b-0">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Traveller {index + 1}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Name</p>
                      <p className="font-medium text-gray-900">{traveller.first_name} {traveller.last_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{traveller.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">{traveller.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Date of Birth</p>
                      <p className="font-medium text-gray-900">
                        {traveller.date_of_birth ? new Date(traveller.date_of_birth).toLocaleDateString('en-GB') : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Nationality</p>
                      <p className="font-medium text-gray-900">{traveller.nationality}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Passport Number</p>
                      <p className="font-medium text-gray-900">{traveller.passport_number}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Booking Date */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600">Booking Confirmation Date</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {new Date(booking.created_at).toLocaleString('en-GB')}
            </p>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  )
}
