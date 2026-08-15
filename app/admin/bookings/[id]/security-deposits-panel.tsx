'use client'

import { useActionState, useState } from 'react'
import { takeDeposit, returnDeposit } from './deposit-actions'
import { depositState, retainedUsd, summariseDeposits } from '@/lib/security-deposit'
import type { SecurityDeposit } from '@/lib/types'

function money(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface TravellerOption {
  id: string
  name: string
  motorbikeId: string | null
}

const STATE_BADGE: Record<string, string> = {
  held: 'bg-amber-50 text-warning-foreground',
  returned: 'bg-green-100 text-green-700',
  'part-retained': 'bg-destructive/10 text-destructive',
}
const STATE_LABEL: Record<string, string> = {
  held: 'Held',
  returned: 'Returned',
  'part-retained': 'Part retained',
}

function DepositRow({ deposit }: { deposit: SecurityDeposit }) {
  const [returning, setReturning] = useState(false)
  const [state, action, pending] = useActionState(returnDeposit, null)
  const status = depositState(deposit)
  const retained = retainedUsd(deposit)

  return (
    <div className="border-b border-border/60 last:border-0 py-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="min-w-0">
          <span className="font-medium text-foreground">{deposit.rider_name ?? 'Unnamed rider'}</span>
          <span className="text-muted-foreground"> · taken {new Date(deposit.taken_at).toLocaleDateString('en-GB')}</span>
          {deposit.method && <span className="text-muted-foreground"> · {deposit.method}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_BADGE[status]}`}>
            {STATE_LABEL[status]}
          </span>
          <span className="font-medium tabular-nums text-foreground">${money(Number(deposit.amount_usd))}</span>
        </div>
      </div>

      {status === 'part-retained' && (
        <p className="mt-1 text-xs text-muted-foreground">
          Kept ${money(retained)} — {deposit.retained_reason}
        </p>
      )}

      {status === 'held' && (
        returning ? (
          <form action={action} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-surface-alt p-3">
            <input type="hidden" name="id" value={deposit.id} />
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Returning (USD)</label>
              <input
                type="number" name="returnedAmountUsd" min="0" step="0.01"
                defaultValue={Number(deposit.amount_usd).toFixed(2)}
                className="w-28 rounded border border-border px-2 py-1 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[10rem]">
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Reason kept (if less than the full amount)
              </label>
              <input
                type="text" name="retainedReason" placeholder="e.g. cracked mirror"
                className="w-full rounded border border-border px-2 py-1 text-sm"
              />
            </div>
            <button type="submit" disabled={pending}
              className="rounded bg-olive px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              {pending ? 'Saving…' : 'Confirm return'}
            </button>
            <button type="button" onClick={() => setReturning(false)}
              className="text-xs text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            {state?.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
          </form>
        ) : (
          <button type="button" onClick={() => setReturning(true)}
            className="mt-1 text-xs font-medium text-olive hover:underline">
            Return this deposit
          </button>
        )
      )}
    </div>
  )
}

/**
 * Riders' refundable security deposits — money held against damaging the bike,
 * not part of what the trip is owed. `depositDueUsd` is what the departure asks
 * for (group_82, snapshotted at booking time); the rows below are what has
 * actually been taken and, eventually, given back (group_81).
 */
export default function SecurityDepositsPanel({
  bookingId,
  depositDueUsd,
  deposits,
  travellers,
  depositPerSeat,
}: {
  bookingId: string
  depositDueUsd: number
  deposits: SecurityDeposit[]
  travellers: TravellerOption[]
  depositPerSeat: number
}) {
  const [adding, setAdding] = useState(false)
  const [addState, addAction, addPending] = useActionState(takeDeposit, null)
  const [selectedTravellerId, setSelectedTravellerId] = useState('')

  const summary = summariseDeposits(deposits)
  const selected = travellers.find((t) => t.id === selectedTravellerId)

  if (depositDueUsd <= 0 && deposits.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Security deposits</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Refundable, held against damage to the bike — separate from the trip balance.
          </p>
        </div>
        {depositDueUsd > 0 && (
          <p className="shrink-0 text-right text-sm">
            <span className="block text-xs text-muted-foreground">Expected</span>
            <span className="font-semibold tabular-nums text-foreground">${money(depositDueUsd)}</span>
          </p>
        )}
      </div>

      {deposits.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-3 rounded-lg bg-surface-alt p-3 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Held</p>
            <p className="font-semibold text-foreground">${money(summary.heldUsd)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Returned</p>
            <p className="font-semibold text-foreground">${money(summary.returnedUsd)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Retained</p>
            <p className="font-semibold text-foreground">${money(summary.retainedUsd)}</p>
          </div>
        </div>
      )}

      {deposits.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing taken yet.</p>
      ) : (
        <div>{deposits.map((d) => <DepositRow key={d.id} deposit={d} />)}</div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        {adding ? (
          <form action={addAction} className="space-y-3">
            <input type="hidden" name="bookingId" value={bookingId} />
            <input type="hidden" name="motorbikeId" value={selected?.motorbikeId ?? ''} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Rider</label>
                {travellers.length > 0 ? (
                  <select
                    name="bookingTravellerId"
                    value={selectedTravellerId}
                    onChange={(e) => setSelectedTravellerId(e.target.value)}
                    className="w-full rounded border border-border px-3 py-2 text-sm"
                  >
                    <option value="">Other / type below</option>
                    {travellers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                ) : (
                  <input type="hidden" name="bookingTravellerId" value="" />
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Rider name</label>
                <input
                  type="text" name="riderName" required
                  defaultValue={selected?.name ?? ''}
                  key={selectedTravellerId}
                  className="w-full rounded border border-border px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount (USD)</label>
                <input
                  type="number" name="amountUsd" min="0.01" step="0.01" required
                  defaultValue={depositPerSeat > 0 ? depositPerSeat.toFixed(2) : ''}
                  className="w-full rounded border border-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Method</label>
                <input type="text" name="method" placeholder="Cash, transfer…"
                  className="w-full rounded border border-border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Reference</label>
                <input type="text" name="reference"
                  className="w-full rounded border border-border px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={addPending}
                className="rounded bg-olive px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {addPending ? 'Saving…' : 'Record deposit'}
              </button>
              <button type="button" onClick={() => setAdding(false)}
                className="text-sm text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
            {addState?.error && <p className="text-xs text-destructive">{addState.error}</p>}
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="text-sm font-medium text-olive hover:underline">
            + Take a deposit
          </button>
        )}
      </div>
    </div>
  )
}
