'use client'

import { useState } from 'react'
import { useAction } from '@/lib/hooks/use-action'
import { Alert } from '@/components/ui/alert'
import { addTripService, removeTripService } from './actions'
import type { Service, TripService } from '@/lib/types'

function money(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Add-ons sold alongside a trip: visas, medical and travel insurance, anything
 * else in the catalogue.
 *
 * They are priced outside the itinerary — see group_74 for why they cannot ride
 * on quote_price_lines — so they are summed alongside the trip price everywhere
 * money is shown, and they become their own lines on a generated invoice.
 */
export default function TripServicesPanel({
  quoteId,
  bookingId,
  catalogue,
  attached,
  travellerCount,
}: {
  quoteId?: string | null
  bookingId?: string | null
  catalogue: Service[]
  attached: Pick<TripService, 'id' | 'name_en' | 'name_ar' | 'unit_price_usd' | 'quantity' | 'total_usd'>[]
  /** Pre-fills the quantity for a per-person service. */
  travellerCount?: number
}) {
  const { pending, run } = useAction()
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState(catalogue[0]?.id ?? '')

  const chosen = catalogue.find((s) => s.id === selected)
  const total = attached.reduce((sum, s) => sum + Number(s.total_usd || 0), 0)

  function submit(action: (fd: FormData) => Promise<void>, form: HTMLFormElement, done?: () => void) {
    setError('')
    const fd = new FormData(form)
    run(async () => {
      try {
        await action(fd)
        done?.()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong.'
        if (!message.includes('NEXT_REDIRECT')) setError(message)
      }
    })
  }

  const field =
    'w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring/50'
  const label = 'block text-xs font-medium text-muted-foreground mb-1'

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Add-on services</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Visas, insurance and anything else sold with this trip but priced outside the itinerary.
          </p>
        </div>
        {total > 0 && (
          <p className="shrink-0 text-lg font-semibold tabular-nums text-foreground">${money(total)}</p>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {attached.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing added yet.</p>
      ) : (
        <div className="space-y-1.5">
          {attached.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <span className="text-foreground">{s.name_en}</span>
                <span className="text-muted-foreground">
                  {' '}
                  · {Number(s.quantity)} × ${money(Number(s.unit_price_usd))}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-medium tabular-nums text-foreground">${money(Number(s.total_usd))}</span>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    submit(removeTripService, e.currentTarget)
                  }}
                >
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" disabled={pending}
                    className="text-xs text-destructive hover:underline disabled:opacity-50">
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        {catalogue.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No services in the catalogue yet — add some under Content → Add-on Services.
          </p>
        ) : adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(addTripService, e.currentTarget, () => setAdding(false))
            }}
            className="space-y-3"
          >
            {quoteId && <input type="hidden" name="quoteId" value={quoteId} />}
            {bookingId && <input type="hidden" name="bookingId" value={bookingId} />}

            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <div>
                <label htmlFor="serviceId" className={label}>Service</label>
                <select id="serviceId" name="serviceId" value={selected}
                  onChange={(e) => setSelected(e.target.value)} className={field}>
                  {catalogue.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name_en} — ${money(Number(s.default_price_usd))} {s.pricing_unit === 'person' ? 'pp' : 'per booking'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="quantity" className={label}>Quantity</label>
                <input id="quantity" name="quantity" type="number" step="0.01" min="0.01"
                  key={`${selected}-${travellerCount ?? 1}`}
                  defaultValue={chosen?.pricing_unit === 'person' ? (travellerCount ?? 1) : 1}
                  className={field} />
              </div>
              <div>
                <label htmlFor="unitPrice" className={label}>Unit price</label>
                <input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0"
                  key={selected}
                  defaultValue={chosen ? Number(chosen.default_price_usd).toFixed(2) : ''}
                  className={field} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={pending}
                className="rounded bg-olive px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {pending ? 'Adding…' : 'Add to trip'}
              </button>
              <button type="button" onClick={() => setAdding(false)}
                className="text-sm text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <p className="text-xs text-muted-foreground">
                The price is copied onto the trip — editing the catalogue later leaves this one alone.
              </p>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="text-sm font-medium text-olive hover:underline">
            + Add a service
          </button>
        )}
      </div>
    </div>
  )
}
