'use client'

import { useActionState, useState } from 'react'
import { updateBooking, cancelBooking, correctLegacyTripValue } from './actions'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
]

/**
 * Edit a booking's status, headcount and price, and cancel it. The one place
 * on the booking screen that touches seat accounting — see the note on
 * updateBooking/cancelBooking in ./actions.ts for why cancelling is a separate
 * action from editing rather than a status option in this form.
 */
export default function BookingEditPanel({
  bookingId,
  status,
  numberOfTravellers,
  totalPriceUsd,
  hasDeparture,
  needsCommercialCorrection,
  hasPayments,
  heldDepositsUsd,
}: {
  bookingId: string
  status: string
  numberOfTravellers: number
  totalPriceUsd: number
  hasDeparture: boolean
  needsCommercialCorrection: boolean
  /** Whether cancelling should warn about money already on the ledger. */
  hasPayments: boolean
  /** Security deposits still held (not yet returned) — warned about the same way. */
  heldDepositsUsd: number
}) {
  const [editing, setEditing] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [updateState, updateAction, updatePending] = useActionState(updateBooking, null)
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelBooking, null)
  const [correctionState, correctionAction, correctionPending] = useActionState(correctLegacyTripValue, null)

  if (status === 'cancelled') {
    return (
      <div className="mt-4 pt-4 border-t border-border/60">
        <p className="text-sm text-muted-foreground mb-2">This booking is cancelled.</p>
        <form action={updateAction}>
          <input type="hidden" name="id" value={bookingId} />
          <input type="hidden" name="status" value="confirmed" />
          <input type="hidden" name="numberOfTravellers" value={numberOfTravellers} />
          <input type="hidden" name="totalPriceUsd" value={totalPriceUsd} />
          <button type="submit" disabled={updatePending}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
            {updatePending
              ? 'Reactivating…'
              : hasDeparture
                ? `Reactivate as confirmed (reserves ${numberOfTravellers} seat${numberOfTravellers !== 1 ? 's' : ''})`
                : 'Reactivate as confirmed'}
          </button>
        </form>
        {updateState?.error && <p className="mt-2 text-xs text-destructive">{updateState.error}</p>}
      </div>
    )
  }

  return (
    <div className="mt-4 pt-4 border-t border-border/60">
      {needsCommercialCorrection && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <p className="text-sm font-semibold">Complete commercial handover</p>
          <p className="mt-1 text-xs text-amber-900">
            This legacy accepted safari has no commercial value. Saving here updates the accepted proposal,
            booking, private operation, deposit schedule, Finance, and the urgent task together.
          </p>
          <form action={correctionAction} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={bookingId} />
            <div>
              <label className="mb-1 block text-xs font-medium">Confirmed trip value (USD)</label>
              <input
                type="number"
                name="totalPriceUsd"
                min="0.01"
                step="0.01"
                required
                className="w-48 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-foreground"
              />
            </div>
            <button
              type="submit"
              disabled={correctionPending}
              className="rounded-md bg-amber-800 px-4 py-2 text-sm font-medium text-white hover:bg-amber-900 disabled:opacity-50"
            >
              {correctionPending ? 'Synchronizing…' : 'Confirm value & synchronize'}
            </button>
          </form>
          {correctionState?.error && <p className="mt-2 text-xs text-destructive">{correctionState.error}</p>}
        </div>
      )}

      {editing ? (
        <form action={updateAction} className="space-y-3">
          <input type="hidden" name="id" value={bookingId} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
              <select name="status" defaultValue={status}
                className="w-full rounded border border-border px-2 py-1.5 text-sm">
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Travellers</label>
              <input type="number" name="numberOfTravellers" min={1} defaultValue={numberOfTravellers}
                className="w-full rounded border border-border px-2 py-1.5 text-sm" />
            </div>
            {needsCommercialCorrection ? (
              <div>
                <input type="hidden" name="totalPriceUsd" value={totalPriceUsd} />
                <p className="block text-xs font-medium text-muted-foreground mb-1">Total price (USD)</p>
                <p className="rounded border border-border bg-muted px-2 py-1.5 text-sm text-muted-foreground">
                  Use commercial handover above
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Total price (USD)</label>
                <input type="number" name="totalPriceUsd" min={0} step="0.01" defaultValue={totalPriceUsd}
                  className="w-full rounded border border-border px-2 py-1.5 text-sm" />
              </div>
            )}
          </div>
          {hasDeparture && (
            <p className="text-xs text-muted-foreground">
              Raising the traveller count reserves more seats on the departure; lowering it releases them.
            </p>
          )}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={updatePending}
              className="rounded bg-olive px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {updatePending ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="text-sm text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
          {updateState?.error && <p className="text-xs text-destructive">{updateState.error}</p>}
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => setEditing(true)}
            className="text-sm font-medium text-olive hover:underline">
            Edit booking
          </button>

          {confirmingCancel ? (
            <form action={cancelAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={bookingId} />
              <span className="text-xs text-muted-foreground">
                {[
                  hasDeparture
                    ? `This frees ${numberOfTravellers} seat${numberOfTravellers !== 1 ? 's' : ''} on the departure.`
                    : null,
                  hasPayments ? 'It has payments recorded — cancelling does not refund them.' : null,
                  heldDepositsUsd > 0
                    ? `$${heldDepositsUsd.toLocaleString()} in security deposits is still held — return it separately.`
                    : null,
                  'Are you sure?',
                ].filter(Boolean).join(' ')}
              </span>
              <button type="submit" disabled={cancelPending}
                className="text-sm font-medium text-destructive hover:underline disabled:opacity-50">
                {cancelPending ? 'Cancelling…' : 'Yes, cancel booking'}
              </button>
              <button type="button" onClick={() => setConfirmingCancel(false)}
                className="text-sm text-muted-foreground hover:text-foreground">
                Never mind
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setConfirmingCancel(true)}
              className="text-sm font-medium text-destructive hover:underline">
              Cancel booking
            </button>
          )}
        </div>
      )}
      {cancelState?.error && <p className="mt-2 text-xs text-destructive">{cancelState.error}</p>}
    </div>
  )
}
