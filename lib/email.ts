// Transactional email via the Resend HTTP API (no SDK dependency).
//
// Configuration (all optional — email silently no-ops when unset, so local
// dev and preview deployments work without keys):
//   RESEND_API_KEY            — Resend secret key
//   EMAIL_FROM                — verified sender, e.g. "Safari Adventure Riders <no-reply@safariadventureriders.com>"
//   ADMIN_NOTIFICATION_EMAIL  — where admin alerts go (defaults to site.email)
//
// All sends are fire-and-forget from the caller's perspective: failures are
// logged, never thrown, so a broken email provider can't fail a booking.

import { site } from './site'

type SendEmailInput = {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${subject}" to ${to}`)
    return false
  }

  const from = process.env.EMAIL_FROM ?? `${site.name} <no-reply@${site.domain}>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })

    if (!res.ok) {
      console.error(`[email] send failed (${res.status}) for "${subject}"`, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error(`[email] send threw for "${subject}"`, err)
    return false
  }
}

export async function notifyAdmin(subject: string, html: string, replyTo?: string): Promise<boolean> {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL ?? site.email
  return sendEmail({ to, subject: `[${site.name}] ${subject}`, html, replyTo })
}

// ── Shared minimal template helpers ──────────────────────────────────────────

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function detailRows(rows: Array<[label: string, value: unknown]>): string {
  const tr = rows
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6E6A59;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`
    )
    .join('')
  return `<table style="border-collapse:collapse;font-size:14px">${tr}</table>`
}

export function emailShell(heading: string, bodyHtml: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#20271A">
  <h2 style="margin:0 0 16px;font-size:18px">${escapeHtml(heading)}</h2>
  ${bodyHtml}
  <p style="margin:24px 0 0;font-size:12px;color:#6E6A59">${escapeHtml(site.name)} — ${escapeHtml(site.url)}</p>
</div>`
}
