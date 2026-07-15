'use client'

import Link from 'next/link'

interface Payment {
  amount_usd: number
  status: string
  method: string | null
  reference: string | null
  created_at: string
}

interface BookingDetailFormProps {
  booking: any
  bookingId: string
  payments?: Payment[]
}

export default function BookingDetailForm({ booking, bookingId, payments = [] }: BookingDetailFormProps) {
  const departure = booking.departures as any
  const tour = departure?.tours as any
  const travellers = booking.booking_travellers as any[]

  const totalPrice = Number(booking.total_price_usd) || 0
  const paidAmount = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (Number(p.amount_usd) || 0), 0)
  const balanceDue = Math.max(0, totalPrice - paidAmount)
  const paidPct = totalPrice > 0 ? Math.min(100, Math.round((paidAmount / totalPrice) * 100)) : 0

  const statusMap: Record<string, { bg: string; text: string; badge: string }> = {
    confirmed: { bg: 'bg-green-50', text: 'text-green-900', badge: 'bg-green-100 text-green-700' },
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-900', badge: 'bg-yellow-100 text-yellow-700' },
    cancelled: { bg: 'bg-destructive/10', text: 'text-red-900', badge: 'bg-destructive/10 text-destructive' },
  }

  const status = statusMap[booking.status as string] || { bg: 'bg-surface-alt', text: 'text-foreground', badge: 'bg-muted text-muted-foreground' }
  const statusBgColor = status.bg
  const statusTextColor = status.text
  const statusBadgeColor = status.badge

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/bookings" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Bookings
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Booking Details</h1>
      </div>

      <div className="space-y-6">
        {/* Booking Summary */}
        <div className={`rounded-lg border border-border p-6 ${statusBgColor}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{tour?.title_en}</h2>
              <p className="text-sm text-muted-foreground mt-1">Booking ID: {bookingId}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusBadgeColor}`}>
              {booking.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Start Date</p>
              <p className="text-lg font-bold text-foreground mt-1">
                {departure?.start_date ? new Date(departure.start_date).toLocaleDateString('en-GB') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">End Date</p>
              <p className="text-lg font-bold text-foreground mt-1">
                {departure?.end_date ? new Date(departure.end_date).toLocaleDateString('en-GB') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Travellers</p>
              <p className="text-lg font-bold text-foreground mt-1">{booking.number_of_travellers}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Price</p>
              <p className="text-lg font-bold text-foreground mt-1">
                ${Number(booking.total_price_usd).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-foreground">Payment</h3>
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
              paidPct >= 100 ? 'bg-green-100 text-green-700' : paidAmount > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-muted text-muted-foreground'
            }`}>
              {paidPct >= 100 ? 'Paid in full' : paidAmount > 0 ? 'Partially paid' : 'Awaiting payment'}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div className="h-2.5 rounded-full bg-green-600 transition-all" style={{ width: `${paidPct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-muted-foreground">Paid: <span className="font-semibold text-foreground">${paidAmount.toLocaleString()}</span></span>
            <span className="text-muted-foreground">Balance due: <span className="font-semibold text-foreground">${balanceDue.toLocaleString()}</span></span>
          </div>
          {payments.length > 0 ? (
            <div className="mt-4 pt-4 border-t border-border space-y-1.5">
              {payments.map((p, i) => (
                <div key={i} className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {new Date(p.created_at).toLocaleDateString('en-GB')}
                    {p.method ? ` · ${p.method}` : ''}
                    {p.reference ? ` · ${p.reference}` : ''}
                  </span>
                  <span className="font-medium text-foreground">${Number(p.amount_usd).toLocaleString()} · {p.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
              No payments recorded yet. Record payments in{' '}
              <Link href="/admin/finance" className="underline hover:text-foreground">Finance</Link>.
            </p>
          )}
        </div>

        {/* Traveller Information */}
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Traveller Information</h3>
          <div className="space-y-4">
            {travellers.map((traveller, index) => (
              <div key={traveller.id} className="pb-4 border-b border-border last:border-b-0">
                <h4 className="font-semibold text-foreground mb-3">
                  Traveller {index + 1}
                </h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium text-foreground">{traveller.first_name} {traveller.last_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground">{traveller.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium text-foreground">{traveller.phone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date of Birth</p>
                    <p className="font-medium text-foreground">
                      {traveller.date_of_birth ? new Date(traveller.date_of_birth).toLocaleDateString('en-GB') : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Nationality</p>
                    <p className="font-medium text-foreground">{traveller.nationality}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Passport Number</p>
                    <p className="font-medium text-foreground">{traveller.passport_number}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Date */}
        <div className="bg-surface-alt rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">Booking Confirmation Date</p>
          <p className="text-lg font-bold text-foreground mt-1">
            {new Date(booking.created_at).toLocaleString('en-GB')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/admin/bookings"
            className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Back to List
          </Link>
        </div>
      </div>
    </div>
  )
}
