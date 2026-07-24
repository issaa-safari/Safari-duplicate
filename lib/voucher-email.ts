// Bilingual (EN/AR) hotel-booking-voucher email, sent to the hotel when an
// admin presses "Send confirmation" on a voucher.

import { emailShell, escapeHtml } from './email'
import type { HotelVoucher } from './types'

function fmtDate(d: string | null, ar: boolean): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00Z').toLocaleDateString(ar ? 'ar-SA-u-ca-gregory' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

export function buildVoucherEmail(
  voucher: HotelVoucher,
  opts: { viewUrl: string },
): { subject: string; html: string } {
  const ar = voucher.language === 'ar'
  const guests = (voucher.guest_names ?? []).map(escapeHtml)
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#6E6A59;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:600">${value}</td></tr>`

  if (ar) {
    const subject = `تأكيد حجز فندق — ${voucher.hotel_name} — ${voucher.voucher_number}`
    const body = `<div dir="rtl" style="text-align:right">
      <p style="font-size:14px;line-height:1.7">إلى فريق حجوزات <strong>${escapeHtml(voucher.hotel_name)}</strong>،</p>
      <p style="font-size:14px;line-height:1.7">يرجى تأكيد الحجز التالي نيابةً عن ضيوفنا:</p>
      <table style="border-collapse:collapse;font-size:14px;margin:8px 0 16px">
        ${row('رقم القسيمة', escapeHtml(voucher.voucher_number))}
        ${row('تاريخ الوصول', fmtDate(voucher.check_in, true))}
        ${row('تاريخ المغادرة', fmtDate(voucher.check_out, true))}
        ${row('عدد الليالي', String(voucher.nights))}
        ${row('عدد الغرف', String(voucher.num_rooms))}
        ${voucher.room_type ? row('نوع الغرفة', escapeHtml(voucher.room_type)) : ''}
        ${voucher.meal_plan ? row('خطة الوجبات', escapeHtml(voucher.meal_plan)) : ''}
        ${row('عدد الضيوف', String(voucher.num_guests))}
      </table>
      ${guests.length ? `<p style="font-size:14px;margin:0 0 6px;font-weight:600">الضيوف:</p><ul style="font-size:14px;margin:0 0 16px;padding-right:18px">${guests.map(g => `<li>${g}</li>`).join('')}</ul>` : ''}
      ${voucher.special_requests ? `<p style="font-size:14px;line-height:1.7"><strong>طلبات خاصة:</strong> ${escapeHtml(voucher.special_requests)}</p>` : ''}
      <p style="margin:20px 0">
        <a href="${escapeHtml(opts.viewUrl)}" style="background:#7A9A4A;color:#fff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:600">عرض القسيمة</a>
      </p>
      <p style="font-size:14px;line-height:1.7">يرجى الرد بتأكيد الحجز ورقم التأكيد الخاص بكم. شكراً لكم.</p>
    </div>`
    return { subject, html: emailShell(subject, body) }
  }

  const subject = `Hotel booking voucher — ${voucher.hotel_name} — ${voucher.voucher_number}`
  const body = `
    <p style="font-size:14px;line-height:1.7">Dear <strong>${escapeHtml(voucher.hotel_name)}</strong> reservations team,</p>
    <p style="font-size:14px;line-height:1.7">Please confirm the following booking on behalf of our guests:</p>
    <table style="border-collapse:collapse;font-size:14px;margin:8px 0 16px">
      ${row('Voucher number', escapeHtml(voucher.voucher_number))}
      ${row('Check-in', fmtDate(voucher.check_in, false))}
      ${row('Check-out', fmtDate(voucher.check_out, false))}
      ${row('Nights', String(voucher.nights))}
      ${row('Rooms', String(voucher.num_rooms))}
      ${voucher.room_type ? row('Room type', escapeHtml(voucher.room_type)) : ''}
      ${voucher.meal_plan ? row('Meal plan', escapeHtml(voucher.meal_plan)) : ''}
      ${row('Guests', String(voucher.num_guests))}
    </table>
    ${guests.length ? `<p style="font-size:14px;margin:0 0 6px;font-weight:600">Guest names:</p><ul style="font-size:14px;margin:0 0 16px;padding-left:18px">${guests.map(g => `<li>${g}</li>`).join('')}</ul>` : ''}
    ${voucher.special_requests ? `<p style="font-size:14px;line-height:1.7"><strong>Special requests:</strong> ${escapeHtml(voucher.special_requests)}</p>` : ''}
    <p style="margin:20px 0">
      <a href="${escapeHtml(opts.viewUrl)}" style="background:#7A9A4A;color:#fff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:600">View voucher</a>
    </p>
    <p style="font-size:14px;line-height:1.7">Kindly reply to confirm the reservation and share your confirmation reference. Thank you.</p>`
  return { subject, html: emailShell(subject, body) }
}
