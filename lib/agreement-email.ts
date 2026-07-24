// Bilingual (EN/AR) email for the traveller agreement signing link, used both
// by the manual "send link" action and the daily reminder cron.

import { emailShell, escapeHtml } from './email'
import { site } from './site'

type AgreementEmailInput = {
  travellerName: string
  tourTitle: string | null
  url: string
  language?: string | null
  isReminder?: boolean
}

export function buildAgreementEmail({
  travellerName, tourTitle, url, language, isReminder,
}: AgreementEmailInput): { subject: string; html: string } {
  const ar = language === 'ar'
  const name = escapeHtml(travellerName)
  const tour = tourTitle ? escapeHtml(tourTitle) : null
  const safeUrl = escapeHtml(url)

  if (ar) {
    const subject = isReminder
      ? `تذكير: يرجى توقيع اتفاقية الرحلة — ${site.name}`
      : `يرجى توقيع اتفاقية الرحلة — ${site.name}`
    const dir = 'dir="rtl" style="text-align:right"'
    const html = emailShell(subject,
      `<div ${dir}>
        <p style="font-size:14px;line-height:1.7">مرحباً ${name}،</p>
        <p style="font-size:14px;line-height:1.7">
          ${isReminder ? 'نذكّرك بتوقيع' : 'يرجى مراجعة وتوقيع'} اتفاقية الرحلة والسياسات
          ${tour ? `الخاصة برحلة <strong>${tour}</strong>` : ''} قبل الانطلاق.
        </p>
        <p style="margin:20px 0">
          <a href="${safeUrl}" style="background:#7A9A4A;color:#fff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:600">مراجعة وتوقيع الاتفاقية</a>
        </p>
        <p style="font-size:12px;color:#6E6A59">أو انسخ هذا الرابط: ${safeUrl}</p>
      </div>`)
    return { subject, html }
  }

  const subject = isReminder
    ? `Reminder: please sign your trip agreement — ${site.name}`
    : `Please sign your trip agreement — ${site.name}`
  const html = emailShell(subject,
    `<p style="font-size:14px;line-height:1.7">Hi ${name},</p>
     <p style="font-size:14px;line-height:1.7">
       ${isReminder ? 'This is a friendly reminder to sign' : 'Please review and sign'} the rider
       agreement and tour policies${tour ? ` for <strong>${tour}</strong>` : ''} before departure.
     </p>
     <p style="margin:20px 0">
       <a href="${safeUrl}" style="background:#7A9A4A;color:#fff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:600">Review &amp; sign agreement</a>
     </p>
     <p style="font-size:12px;color:#6E6A59">Or paste this link into your browser: ${safeUrl}</p>`)
  return { subject, html }
}
