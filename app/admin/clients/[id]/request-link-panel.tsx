'use client'

import { useState } from 'react'

/**
 * A link to send a client so they fill in their own enquiry.
 *
 * Deliberately not a tokenised link like the departure booking ones. Those guard
 * a seat — real inventory, real money — so they earn unguessable tokens, expiry
 * and use limits. An enquiry form commits nothing, so the link is just the
 * public form with this client's details prefilled: one form to maintain instead
 * of two, in both languages, and nothing to revoke.
 *
 * Attribution comes from `src=request_link`, which lands on `requests.source`
 * next to the `whatsapp` and `booking_link` values already in use.
 */
export default function RequestLinkPanel({
  baseUrl,
  firstName,
  lastName,
  email,
  phone,
  country,
  whatsapp,
  preferArabic,
}: {
  baseUrl: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  country: string | null
  whatsapp: string | null
  preferArabic: boolean
}) {
  const [arabic, setArabic] = useState(preferArabic)
  const [copied, setCopied] = useState(false)

  const url = (() => {
    const params = new URLSearchParams()
    if (firstName) params.set('first', firstName)
    if (lastName) params.set('last', lastName)
    if (email) params.set('email', email)
    if (phone) params.set('phone', phone)
    if (country) params.set('country', country)
    params.set('src', 'request_link')
    return `${baseUrl}${arabic ? '/ar' : ''}/quote-request?${params.toString()}`
  })()

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard unavailable — the field below is selectable */ }
  }

  const name = [firstName, lastName].filter(Boolean).join(' ')
  const message = arabic
    ? `مرحباً${name ? ` ${name}` : ''}! يرجى تعبئة تفاصيل رحلتك من هنا وسنعود إليك بعرض سعر:\n${url}`
    : `Hello${name ? ` ${name}` : ''}! Please fill in your trip details here and we'll come back to you with a quote:\n${url}`

  // wa.me needs digits only; fall back to a chooser when no number is on file.
  const waNumber = (whatsapp || phone || '').replace(/\D/g, '')
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm p-4">
      <h2 className="text-sm font-semibold text-foreground">Request link</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Send this and they fill in their own enquiry — it lands in Requests as New, with their details
        already filled in.
      </p>

      <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={arabic} onChange={(e) => setArabic(e.target.checked)} />
        Arabic version
      </label>

      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 w-full rounded border border-border bg-surface-alt px-2 py-1.5 text-xs text-muted-foreground"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={copy}
          className="rounded bg-olive px-3 py-1.5 text-xs font-medium text-white">
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <a href={waHref} target="_blank" rel="noopener noreferrer"
          className="rounded border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-alt">
          Send on WhatsApp
        </a>
      </div>

      {!waNumber && (
        <p className="mt-2 text-xs text-muted-foreground">
          No phone or WhatsApp number on file — WhatsApp will ask you to pick a contact.
        </p>
      )}
    </div>
  )
}
