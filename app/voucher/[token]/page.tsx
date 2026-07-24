import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { site } from '@/lib/site'
import type { HotelVoucher } from '@/lib/types'
import PrintToolbar from './print-toolbar'

export const dynamic = 'force-dynamic'

const G = '#7A9A4A'

function fmtDate(d: string | null, ar: boolean) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00Z').toLocaleDateString(ar ? 'ar-SA-u-ca-gregory' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

const CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #f3f4f6; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; font-size: 14px; }
.page { max-width: 720px; margin: 0 auto; padding: 40px 20px; }
.card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.head { background: #20271A; color: #fff; padding: 24px 32px; }
.head .name { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #cbd5c0; }
.head h1 { font-size: 20px; margin: 6px 0 2px; }
.head .vno { font-size: 13px; color: #cbd5c0; }
.status { display: inline-block; margin-top: 10px; padding: 3px 12px; border-radius: 99px; font-size: 12px; font-weight: 600; }
.status.draft { background: #4b5563; color: #fff; }
.status.sent { background: #2563eb; color: #fff; }
.status.confirmed { background: ${G}; color: #fff; }
.status.cancelled { background: #b91c1c; color: #fff; }
.section { padding: 24px 32px; border-top: 1px solid #eee; }
.section h2 { font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #888; margin: 0 0 12px; }
table.kv { border-collapse: collapse; width: 100%; font-size: 14px; }
table.kv td { padding: 7px 12px 7px 0; vertical-align: top; }
table.kv .lbl { color: #666; white-space: nowrap; width: 150px; }
table.kv .val { font-weight: 600; }
ul.guests { margin: 0; padding-inline-start: 18px; line-height: 1.9; }
.notes { background: #f8fdf0; border: 1px solid #e3eccf; border-radius: 8px; padding: 12px 16px; line-height: 1.6; }
.foot { margin-top: 20px; text-align: center; font-size: 11px; color: #999; }
[dir="rtl"] table.kv .lbl { width: 150px; }
@media print {
  body { background: #fff; }
  .no-print { display: none !important; }
  .page { padding: 0; }
  .card { box-shadow: none; border-radius: 0; }
}
`

export default async function VoucherPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data } = await admin
    .from('hotel_vouchers')
    .select('*, departures ( tours ( title_en, title_ar ) )')
    .eq('token', token)
    .maybeSingle()

  if (!data) notFound()
  const v = data as HotelVoucher & { departures?: { tours?: { title_en?: string; title_ar?: string } } }
  const ar = v.language === 'ar'
  const tour = v.departures?.tours
  const tourTitle = (ar ? tour?.title_ar : tour?.title_en) || tour?.title_en || null
  const guests = v.guest_names ?? []

  const L = ar ? {
    doc: 'قسيمة حجز فندق',
    voucherNo: 'رقم القسيمة',
    status: { draft: 'مسودة', sent: 'مُرسلة', confirmed: 'مؤكّدة', cancelled: 'ملغاة' } as Record<string, string>,
    stay: 'تفاصيل الإقامة',
    hotel: 'الفندق',
    checkIn: 'تاريخ الوصول',
    checkOut: 'تاريخ المغادرة',
    nights: 'عدد الليالي',
    rooms: 'عدد الغرف',
    roomType: 'نوع الغرفة',
    mealPlan: 'خطة الوجبات',
    numGuests: 'عدد الضيوف',
    guestList: 'الضيوف',
    special: 'طلبات خاصة',
    trip: 'الرحلة',
    confRef: 'رقم تأكيد الفندق',
    issuedBy: 'صادرة عن',
  } : {
    doc: 'Hotel Booking Voucher',
    voucherNo: 'Voucher No.',
    status: { draft: 'Draft', sent: 'Sent', confirmed: 'Confirmed', cancelled: 'Cancelled' } as Record<string, string>,
    stay: 'Stay details',
    hotel: 'Hotel',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    nights: 'Nights',
    rooms: 'Rooms',
    roomType: 'Room type',
    mealPlan: 'Meal plan',
    numGuests: 'Guests',
    guestList: 'Guest names',
    special: 'Special requests',
    trip: 'Trip',
    confRef: 'Hotel confirmation ref',
    issuedBy: 'Issued by',
  }

  const kv = (label: string, value: string | number | null | undefined) =>
    value === null || value === undefined || value === '' ? '' : (
      <tr key={label}>
        <td className="lbl">{label}</td>
        <td className="val">{value}</td>
      </tr>
    )

  return (
    <>
      <style>{CSS + (ar ? `[dir="rtl"], [dir="rtl"] * { font-family: 'Cairo', Arial, sans-serif !important; }` : '')}</style>
      {ar && <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" />}
      <PrintToolbar ar={ar} />
      <div dir={ar ? 'rtl' : 'ltr'}>
        <div className="page">
          <div className="card">
            <div className="head">
              <div className="name">{site.name}</div>
              <h1>{L.doc}</h1>
              <div className="vno">{L.voucherNo} {v.voucher_number}</div>
              <span className={`status ${v.status}`}>{L.status[v.status] ?? v.status}</span>
            </div>

            <div className="section">
              <h2>{L.stay}</h2>
              <table className="kv">
                <tbody>
                  {kv(L.hotel, v.hotel_name)}
                  {tourTitle ? kv(L.trip, tourTitle) : null}
                  {kv(L.checkIn, fmtDate(v.check_in, ar))}
                  {kv(L.checkOut, fmtDate(v.check_out, ar))}
                  {kv(L.nights, v.nights)}
                  {kv(L.rooms, v.num_rooms)}
                  {kv(L.roomType, v.room_type)}
                  {kv(L.mealPlan, v.meal_plan)}
                  {kv(L.numGuests, v.num_guests)}
                  {kv(L.confRef, v.hotel_confirmation_ref)}
                </tbody>
              </table>
            </div>

            {guests.length > 0 && (
              <div className="section">
                <h2>{L.guestList}</h2>
                <ul className="guests">
                  {guests.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </div>
            )}

            {v.special_requests && (
              <div className="section">
                <h2>{L.special}</h2>
                <div className="notes">{v.special_requests}</div>
              </div>
            )}

            <div className="section">
              <h2>{L.issuedBy}</h2>
              <table className="kv">
                <tbody>
                  {kv(site.name, site.email)}
                  {kv('', site.phoneDisplay)}
                </tbody>
              </table>
            </div>
          </div>
          <div className="foot">{site.name} — {site.url}</div>
        </div>
      </div>
    </>
  )
}
