'use client'

import Link from 'next/link'

interface BookingDetailFormProps {
  booking: any
  bookingId: string
}

export default function BookingDetailForm({ booking, bookingId }: BookingDetailFormProps) {
  const departure = booking.departures as any
  const tour = departure?.tours as any
  const travellers = booking.booking_travellers as any[]

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
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/bookings" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Bookings
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Booking Details</h1>
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
