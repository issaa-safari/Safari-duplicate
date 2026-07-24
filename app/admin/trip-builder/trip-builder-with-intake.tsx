'use client'

import { useState, useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import TripBuilderForm, { type AccommodationOption, type LookupOption } from './trip-builder-form'
import { draftTripFromEnquiry } from './actions'
import type { TripBuilderState } from './types'

/**
 * Wraps the Trip Builder with an optional AI intake box: paste an enquiry, the
 * model drafts a trip skeleton from the content library, and the form mounts
 * pre-filled for review + pricing. The form is remounted (via `key`) when a
 * draft is applied so its initial-state hooks pick up the new values. Skipping
 * the box and building by hand is unchanged.
 */
export default function TripBuilderWithIntake(props: {
  destinations: LookupOption[]
  accommodations: AccommodationOption[]
  vehicles: LookupOption[]
  parks: LookupOption[]
  usdToKes: number
}) {
  const [text, setText] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [notConfigured, setNotConfigured] = useState(false)
  const [seed, setSeed] = useState<TripBuilderState | null>(null)
  const [formKey, setFormKey] = useState(0)

  function draft() {
    setError('')
    setNotes('')
    startTransition(async () => {
      const result = await draftTripFromEnquiry(text)
      if (!result.ok) {
        if (result.reason === 'not_configured') setNotConfigured(true)
        setError(result.message)
        return
      }
      setSeed(result.state)
      setFormKey(k => k + 1)
      setNotes(result.notes)
    })
  }

  return (
    <div className="space-y-5">
      {!notConfigured && (
        <section className="rounded-lg border border-border bg-surface-alt/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-primary-strong text-white shadow-sm">
              <Sparkles className="h-3 w-3" />
            </span>
            <h2 className="font-display text-[15px] font-semibold leading-tight text-foreground">
              Describe the trip
            </h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary-strong">
              AI draft
            </span>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Paste or type the enquiry in plain language. The draft fills guest details, hotels, transport and
            park rows from your content library — you review and price it. Nothing is saved until you Save.
          </p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            disabled={pending}
            placeholder="e.g. Couple from Riyadh, 8 days late July, Masai Mara then Amboseli, midrange lodges, honeymoon. Non-residents."
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:bg-surface-alt disabled:text-muted-foreground"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={draft}
              disabled={pending || text.trim().length < 3}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary-strong px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {pending ? 'Drafting…' : 'Draft with AI'}
            </button>
            {seed && !pending && (
              <span className="text-xs text-success-foreground">Draft applied below — review and price it.</span>
            )}
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          {notes && (
            <p className="mt-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
              <span className="font-medium">Notes: </span>{notes}
            </p>
          )}
        </section>
      )}
      {notConfigured && error && (
        <p className="rounded-md border border-border bg-surface-alt/50 px-3 py-2 text-xs text-muted-foreground">
          {error}
        </p>
      )}

      <TripBuilderForm key={formKey} {...props} initialState={seed} />
    </div>
  )
}
