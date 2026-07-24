'use client'

import { useState } from 'react'
import type { BookingLink } from '@/lib/types'
import { createBookingLink, toggleBookingLink, deleteBookingLink } from './share-actions'

export default function BookingLinkPanel({
  departureId,
  links,
  baseUrl,
  tourTitle,
}: {
  departureId: string
  links: BookingLink[]
  baseUrl: string
  tourTitle: string
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const urlFor = (token: string) => `${baseUrl}/book/${token}`

  const copy = async (token: string, id: string) => {
    try {
      await navigator.clipboard.writeText(urlFor(token))
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1800)
    } catch { /* clipboard unavailable */ }
  }

  const whatsappHref = (token: string) => {
    const msg = `Hello! Here is your booking link for ${tourTitle}. Please fill in your traveller details to confirm:\n${urlFor(token)}`
    return `https://wa.me/?text=${encodeURIComponent(msg)}`
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-base font-semibold text-foreground">Self-service booking links</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Generate a link to send over WhatsApp. Travellers fill their own details and the booking lands
        here automatically — no manual entry.
      </p>

      <form action={createBookingLink} className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <input type="hidden" name="departureId" value={departureId} />
        <label className="text-sm">
          <span className="mb-1 block font-medium text-foreground">Label (optional)</span>
          <input
            name="label"
            placeholder="e.g. WhatsApp — Ahmed"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-foreground">Language</span>
          <select name="language" className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-foreground">Max bookings</span>
          <input
            name="maxBookings"
            type="number"
            min={1}
            placeholder="∞"
            className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Generate link
        </button>
      </form>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No links yet.</p>
      ) : (
        <ul className="space-y-3">
          {links.map(link => {
            const disabled = !link.is_active
            const expired = !!(link.expires_at && new Date(link.expires_at) < new Date())
            return (
              <li key={link.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {link.language === 'ar' ? 'AR' : 'EN'}
                  </span>
                  {link.label && <span className="text-sm font-medium text-foreground">{link.label}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    disabled || expired ? 'bg-muted text-muted-foreground' : 'bg-green-100 text-green-800'
                  }`}>
                    {disabled ? 'Disabled' : expired ? 'Expired' : 'Active'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {link.use_count} booking{link.use_count === 1 ? '' : 's'}
                    {link.max_bookings != null ? ` / ${link.max_bookings}` : ''}
                  </span>
                </div>

                <div className="mt-2 break-all rounded bg-muted px-2 py-1.5 font-mono text-xs text-foreground">
                  {urlFor(link.token)}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copy(link.token, link.id)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    {copiedId === link.id ? 'Copied ✓' : 'Copy link'}
                  </button>
                  <a
                    href={whatsappHref(link.token)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-muted"
                  >
                    Share on WhatsApp
                  </a>
                  <a
                    href={urlFor(link.token)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    Preview
                  </a>
                  <form action={toggleBookingLink}>
                    <input type="hidden" name="departureId" value={departureId} />
                    <input type="hidden" name="id" value={link.id} />
                    <input type="hidden" name="active" value={(!link.is_active).toString()} />
                    <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                      {link.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </form>
                  <form action={deleteBookingLink}>
                    <input type="hidden" name="departureId" value={departureId} />
                    <input type="hidden" name="id" value={link.id} />
                    <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-muted">
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
