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
    cancelled: { bg: 'bg-red-50', text: 'text-red-900', badge: 'bg-red-100 text-red-700' },
  }

  const status = statusMap[booking.status as string] || { bg: 'bg-gray-50', text: 'text-gray-900', badge: 'bg-gray-100 text-gray-600' }
  const statusBgColor = status.bg
  const statusTextColor = status.text
  const statusBadgeColor = status.badge

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/bookings" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Bookings
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Booking Details</h1>
      </div>

      <div className="space-y-6">
        {/* Booking Summary */}
        <div className={`rounded-lg border border-gray-200 p-6 ${statusBgColor}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{tour?.title_en}</h2>
              <p className="text-sm text-gray-600 mt-1">Booking ID: {bookingId}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusBadgeColor}`}>
              {booking.status}
            </span>
          </div>

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
              <p className="text-lg font-bold text-gray-900 mt-1">
                ${Number(booking.total_price_usd).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Traveller Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Traveller Information</h3>
          <div className="space-y-4">
            {travellers.map((traveller, index) => (
              <div key={traveller.id} className="pb-4 border-b border-gray-200 last:border-b-0">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Traveller {index + 1}
                </h4>
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

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/admin/bookings"
            className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to List
          </Link>
        </div>
      </div>
    </div>
  )
}
