'use client'

import { useState } from 'react'
import Link from 'next/link'
import PaymentForm from '@/app/admin/finance/payment-form'
import PaymentActions from '@/app/admin/finance/payment-actions'
import { Alert } from '@/components/ui/alert'
import { useAction } from '@/lib/hooks/use-action'
import { updateBookingDates } from './actions'
import TripServicesPanel from '@/app/admin/finance/trip-services/panel'
import TripInvoicesPanel from '@/app/admin/finance/invoices/trip-panel'
import SecurityDepositsPanel from './security-deposits-panel'
import BookingEditPanel from './booking-edit-panel'
import type { TripBalance } from '@/lib/server/accounting'
import { resolveTripDates } from '@/lib/trip-dates'
import type { InvoiceDisplayStatus, SecurityDeposit, Service } from '@/lib/types'

interface BookingDetailFormProps {
  booking: any
  bookingId: string
  balance: TripBalance
  catalogue: Service[]
  invoices: { id: string; invoice_number: string | null; displayStatus: InvoiceDisplayStatus }[]
  deposits: SecurityDeposit[]
  depositPerSeat: number
}

export default function BookingDetailForm({
  booking,
  bookingId,
  balance,
  catalogue,
  invoices,
  deposits,
  depositPerSeat,
}: BookingDetailFormProps) {
  const departure = booking.departures as any
  const tour = departure?.tours as any
  const tripTitle = tour?.title_en
    ?? departure?.operation_title
    ?? (departure ? 'Private trip' : 'Private trip — no departure')
  const client = booking.clients as any
  const request = booking.requests as any
  const travellers = (booking.booking_travellers as any[]) ?? []
  const dates = resolveTripDates(booking)
  const [paying, setPaying] = useState(false)
  const { pending: datesPending, run: runDates } = useAction()
  const [datesError, setDatesError] = useState('')
  const [datesSaved, setDatesSaved] = useState(false)

  // One shared calculation, so this page, the client dashboard and Finance can
  // never disagree about what a trip is owed.
  const { invoicedUsd: totalPrice, receivedUsd: paidAmount, balanceUsd: balanceDue, paidPercent: paidPct, payments } = balance

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
              {/* A booking without a departure has no tour to name itself after
                  (group_78), so it says what it is rather than rendering blank. */}
              <h2 className="text-xl font-bold text-foreground">
                {tripTitle}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Booking ID: {bookingId}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {client && (
                  <Link href={`/admin/clients/${client.id}`} className="text-brand-text hover:underline">
                    {`${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || client.email}
                  </Link>
                )}
                {request && (
                  <Link href={`/admin/requests/${request.id}`} className="text-brand-text hover:underline">
                    {request.reference}
                  </Link>
                )}
                {departure && (
                  <Link href={`/admin/departures/${departure.id}`} className="text-brand-text hover:underline">
                    Open trip operations →
                  </Link>
                )}
                {!client && !request && !departure && (
                  <span className="text-muted-foreground">Not linked to a client, request or departure yet.</span>
                )}
              </div>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusBadgeColor}`}>
              {booking.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Start Date</p>
              <p className="text-lg font-bold text-foreground mt-1">
                {dates.startDate ? new Date(dates.startDate).toLocaleDateString('en-GB') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">End Date</p>
              <p className="text-lg font-bold text-foreground mt-1">
                {dates.endDate ? new Date(dates.endDate).toLocaleDateString('en-GB') : '—'}
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

          <BookingEditPanel
            bookingId={bookingId}
            status={booking.status}
            numberOfTravellers={Number(booking.number_of_travellers)}
            totalPriceUsd={Number(booking.total_price_usd)}
            hasDeparture={!!departure}
            needsCommercialCorrection={departure?.kind === 'private_custom' && Number(booking.total_price_usd) <= 0}
            hasPayments={payments.length > 0}
            heldDepositsUsd={deposits.filter((d) => !d.returned_at).reduce((sum, d) => sum + Number(d.amount_usd), 0)}
          />
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
              {payments.map((p) => (
                <div key={p.id} className="text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span>
                      {new Date(p.received_at).toLocaleDateString('en-GB')}
                      {p.method ? ` · ${p.method}` : ''}
                      {p.reference ? ` · ${p.reference}` : ''}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="font-medium text-foreground">
                        ${Number(p.amount_usd).toLocaleString()}{p.payment_type ? ` · ${p.payment_type}` : ''}
                      </span>
                      <PaymentActions
                        payment={p}
                        bookingId={bookingId}
                        label={tripTitle}
                        totalSelling={totalPrice}
                        alreadyReceived={paidAmount}
                      />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
              No payments recorded yet.
            </p>
          )}

          {/* Recording a payment used to be possible only against a quote, which
              is why a booking made on the website could never be settled. */}
          <div className="mt-4 pt-4 border-t border-border">
            {paying ? (
              <div className="max-w-md">
                <PaymentForm
                  bookingId={bookingId}
                  label={tripTitle}
                  totalSelling={totalPrice}
                  alreadyReceived={paidAmount}
                  onDone={() => { setPaying(false); window.location.reload() }}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPaying(true)}
                className="text-sm font-medium text-olive hover:underline"
              >
                + Record payment
              </button>
            )}
          </div>
        </div>

        {/* A booking with no departure carries its own dates, and they are
            usually agreed after the booking is taken (group_79). */}
        {!departure && (
          <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
            <h3 className="text-lg font-bold text-foreground">Trip dates</h3>
            <p className="mt-0.5 mb-4 text-xs text-muted-foreground">
              {dates.source === 'none'
                ? 'Not agreed yet. Set them here once they are — the client sees these on their booking.'
                : 'Shown to the client on their booking. Clear both to mark the dates as not yet agreed.'}
            </p>
            {datesError && <Alert variant="error">{datesError}</Alert>}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setDatesError('')
                const fd = new FormData(e.currentTarget)
                runDates(async () => {
                  try {
                    await updateBookingDates(fd)
                    setDatesSaved(true)
                  } catch (err) {
                    setDatesError(err instanceof Error ? err.message : 'Could not save the dates.')
                  }
                })
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="id" value={bookingId} />
              <div>
                <label htmlFor="startDate" className="block text-xs font-medium text-muted-foreground mb-1">Start</label>
                <input id="startDate" name="startDate" type="date" defaultValue={booking.start_date ?? ''}
                  className="rounded-md border border-border px-3 py-2 text-sm bg-surface" />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-xs font-medium text-muted-foreground mb-1">End</label>
                <input id="endDate" name="endDate" type="date" defaultValue={booking.end_date ?? ''}
                  className="rounded-md border border-border px-3 py-2 text-sm bg-surface" />
              </div>
              <button type="submit" disabled={datesPending}
                className="rounded bg-olive px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {datesPending ? 'Saving…' : 'Save dates'}
              </button>
              {datesSaved && !datesPending && (
                <span className="text-xs text-green-700">Saved.</span>
              )}
            </form>
          </div>
        )}

        <TripServicesPanel
          bookingId={bookingId}
          catalogue={catalogue}
          attached={balance.services}
          travellerCount={Number(booking.number_of_travellers) || 1}
        />

        <TripInvoicesPanel bookingId={bookingId} invoices={invoices} />

        <SecurityDepositsPanel
          bookingId={bookingId}
          depositDueUsd={Number(booking.deposit_due_usd) || 0}
          deposits={deposits}
          depositPerSeat={depositPerSeat}
          travellers={travellers
            .filter((t: any) => t.is_rider !== false)
            .map((t: any) => ({
              id: t.id,
              name: `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || 'Unnamed traveller',
              motorbikeId: t.motorbike_id ?? null,
            }))}
        />

        {/* Traveller Information */}
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Traveller Information</h3>
          {travellers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No names on file yet — the booking is sized at {booking.number_of_travellers} traveller
              {booking.number_of_travellers !== 1 ? 's' : ''}.
            </p>
          )}
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
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/bookings"
            className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Back to List
          </Link>
          <Link
            href={`/admin/vouchers?booking=${bookingId}`}
            className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Hotel vouchers →
          </Link>
        </div>
      </div>
    </div>
  )
}
