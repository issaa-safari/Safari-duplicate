'use client'

import { useState } from 'react'
import type { HotelVoucher } from '@/lib/types'
import {
  generateVouchers, updateVoucher, sendVoucher, markVoucherConfirmed, deleteVoucher,
} from './actions'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
}

export default function VouchersClient({
  departureId,
  vouchers,
  baseUrl,
}: {
  departureId: string
  vouchers: HotelVoucher[]
  baseUrl: string
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <form action={generateVouchers}>
        <input type="hidden" name="departureId" value={departureId} />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Generate vouchers from itinerary
        </button>
        <span className="ml-3 text-xs text-muted-foreground">
          Re-running only adds vouchers for hotels that don&rsquo;t have one yet.
        </span>
      </form>

      {vouchers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No vouchers yet. Generate them from the itinerary above.
        </p>
      ) : (
        <ul className="space-y-3">
          {vouchers.map(v => {
            const isOpen = openId === v.id
            return (
              <li key={v.id} className="rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{v.hotel_name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[v.status] ?? 'bg-muted'}`}>
                        {v.status}
                      </span>
                      <span className="text-xs font-medium uppercase text-muted-foreground">{v.language}</span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {v.check_in} → {v.check_out} · {v.nights} night{v.nights === 1 ? '' : 's'} ·{' '}
                      {v.num_rooms} room{v.num_rooms === 1 ? '' : 's'} · {v.num_guests} guest{v.num_guests === 1 ? '' : 's'}
                      {v.room_type ? ` · ${v.room_type}` : ''}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {v.voucher_number}
                      {v.hotel_email ? ` · ${v.hotel_email}` : ' · no hotel email set'}
                      {v.hotel_confirmation_ref ? ` · ref ${v.hotel_confirmation_ref}` : ''}
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
                      <input type="hidden" name="departureId" value={departureId} />
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
                      <input type="hidden" name="departureId" value={departureId} />
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
                        <input type="hidden" name="departureId" value={departureId} />
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
                        <input type="hidden" name="departureId" value={departureId} />
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
