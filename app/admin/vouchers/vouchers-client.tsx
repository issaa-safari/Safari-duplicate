'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { VoucherWithContext } from './page'
import {
  generateDepartureVouchers, generateBookingVouchers,
  updateVoucher, sendVoucher, markVoucherConfirmed, deleteVoucher,
} from './actions'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
}

type Scope = { kind: 'departure' | 'booking'; id: string } | null

export default function VouchersClient({
  vouchers,
  departureOptions,
  statusFilters,
  activeStatus,
  scope,
  baseUrl,
}: {
  vouchers: VoucherWithContext[]
  departureOptions: Array<{ id: string; label: string }>
  statusFilters: Array<{ value: string; label: string }>
  activeStatus: string
  scope: Scope
  baseUrl: string
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  // Preserve the current scope (departure/booking) when switching status filter.
  function statusHref(value: string) {
    const params = new URLSearchParams()
    if (value !== 'all') params.set('status', value)
    if (scope?.kind === 'departure') params.set('departure', scope.id)
    if (scope?.kind === 'booking') params.set('booking', scope.id)
    const qs = params.toString()
    return qs ? `/admin/vouchers?${qs}` : '/admin/vouchers'
  }

  return (
    <div className="space-y-5">
      {/* Generator — scoped to one trip, or a departure picker for the global view. */}
      <div className="rounded-xl border border-border bg-card p-4">
        {scope?.kind === 'booking' ? (
          <form action={generateBookingVouchers} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="bookingId" value={scope.id} />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Generate vouchers for this booking
            </button>
            <span className="text-xs text-muted-foreground">
              One voucher per hotel stay, with this booking’s travellers as guests. Re-running only fills gaps.
            </span>
          </form>
        ) : scope?.kind === 'departure' ? (
          <form action={generateDepartureVouchers} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="departureId" value={scope.id} />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Generate vouchers from itinerary
            </button>
            <span className="text-xs text-muted-foreground">
              One voucher per hotel stay for the whole group. Re-running only fills gaps.
            </span>
          </form>
        ) : (
          <form action={generateDepartureVouchers} className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-foreground">Generate from a departure</span>
              <select
                name="departureId"
                required
                defaultValue=""
                className="w-full min-w-64 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>Choose a departure…</option>
                {departureOptions.map(d => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Generate
            </button>
          </form>
        )}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map(f => {
          const active = f.value === activeStatus
          return (
            <Link
              key={f.value}
              href={statusHref(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      {vouchers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No vouchers here yet. Generate them from a trip’s itinerary above.
        </p>
      ) : (
        <ul className="space-y-3">
          {vouchers.map(v => {
            const isOpen = openId === v.id
            const tourTitle = v.departures?.tours?.title_en ?? null
            return (
              <li key={v.id} className="rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{v.hotel_name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[v.status] ?? 'bg-muted'}`}>
                        {v.status}
                      </span>
                      <span className="text-xs font-medium uppercase text-muted-foreground">{v.language}</span>
                      {v.booking_id && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-brand-ink">
                          Per booking
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {v.check_in} → {v.check_out} · {v.nights} night{v.nights === 1 ? '' : 's'} ·{' '}
                      {v.num_rooms} room{v.num_rooms === 1 ? '' : 's'} · {v.num_guests} guest{v.num_guests === 1 ? '' : 's'}
                      {v.room_type ? ` · ${v.room_type}` : ''}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {v.voucher_number}
                      {tourTitle ? ` · ${tourTitle}` : ''}
                      {v.hotel_email ? ` · ${v.hotel_email}` : ' · no hotel email set'}
                      {v.hotel_confirmation_ref ? ` · ref ${v.hotel_confirmation_ref}` : ''}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs">
                      {v.departure_id && (
                        <Link href={`/admin/departures/${v.departure_id}`} className="text-primary hover:underline">
                          Open departure →
                        </Link>
                      )}
                      {v.booking_id && (
                        <Link href={`/admin/bookings/${v.booking_id}`} className="text-primary hover:underline">
                          Open booking →
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`${baseUrl}/voucher/${v.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      View / print
                    </a>
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : v.id)}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      {isOpen ? 'Close' : 'Edit'}
                    </button>
                    <form action={sendVoucher}>
                      <input type="hidden" name="id" value={v.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                      >
                        {v.status === 'draft' ? 'Send to hotel' : 'Resend'}
                      </button>
                    </form>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border p-4">
                    <form action={updateVoucher} className="grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="id" value={v.id} />
                      <TextField name="hotelName" label="Hotel name" defaultValue={v.hotel_name} />
                      <TextField name="hotelEmail" label="Hotel email" type="email" defaultValue={v.hotel_email ?? ''} />
                      <TextField name="checkIn" label="Check-in" type="date" defaultValue={v.check_in} />
                      <TextField name="checkOut" label="Check-out" type="date" defaultValue={v.check_out} />
                      <TextField name="numRooms" label="Rooms" type="number" defaultValue={String(v.num_rooms)} />
                      <TextField name="numGuests" label="Guests" type="number" defaultValue={String(v.num_guests)} />
                      <TextField name="roomType" label="Room type" defaultValue={v.room_type ?? ''} />
                      <TextField name="mealPlan" label="Meal plan" defaultValue={v.meal_plan ?? ''} />
                      <label className="text-sm sm:col-span-2">
                        <span className="mb-1 block font-medium text-foreground">Guest names (one per line)</span>
                        <textarea
                          name="guestNames"
                          rows={Math.max(2, v.guest_names?.length ?? 2)}
                          defaultValue={(v.guest_names ?? []).join('\n')}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-sm sm:col-span-2">
                        <span className="mb-1 block font-medium text-foreground">Special requests</span>
                        <textarea
                          name="specialRequests"
                          rows={2}
                          defaultValue={v.special_requests ?? ''}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-sm sm:col-span-2">
                        <span className="mb-1 block font-medium text-foreground">Internal notes (not shown to hotel)</span>
                        <textarea
                          name="internalNotes"
                          rows={2}
                          defaultValue={v.internal_notes ?? ''}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-sm">
                        <span className="mb-1 block font-medium text-foreground">Voucher language</span>
                        <select
                          name="language"
                          defaultValue={v.language}
                          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        >
                          <option value="en">English</option>
                          <option value="ar">العربية</option>
                        </select>
                      </label>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                        >
                          Save changes
                        </button>
                      </div>
                    </form>

                    <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                      <form action={markVoucherConfirmed} className="flex items-end gap-2">
                        <input type="hidden" name="id" value={v.id} />
                        <label className="text-sm">
                          <span className="mb-1 block font-medium text-foreground">Hotel confirmation ref</span>
                          <input
                            name="confirmationRef"
                            defaultValue={v.hotel_confirmation_ref ?? ''}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          />
                        </label>
                        <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                          Mark confirmed
                        </button>
                      </form>
                      <form action={deleteVoucher}>
                        <input type="hidden" name="id" value={v.id} />
                        <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-red-600 hover:bg-muted">
                          Delete voucher
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function TextField({
  name, label, defaultValue, type = 'text',
}: {
  name: string
  label: string
  defaultValue: string
  type?: string
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium text-foreground">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  )
}
