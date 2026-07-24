import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { site } from '@/lib/site'
import PrintToolbar from './print-toolbar'

const G = '#7A9A4A'

function fmtDate(d: string | null, ar: boolean) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(ar ? 'ar' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; font-size: 13px; }
.page { max-width: 780px; margin: 0 auto; padding: 40px 48px; }
.brand { text-align: center; margin-bottom: 28px; }
.brand .name { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #666; font-family: 'Helvetica Neue', Arial, sans-serif; }
.brand h1 { font-size: 22px; margin: 8px 0 4px; }
.brand .sub { font-size: 13px; color: #555; }
.rule { height: 3px; background: ${G}; width: 60px; margin: 14px auto 0; border-radius: 2px; }
.body { white-space: pre-wrap; line-height: 1.8; margin: 24px 0; }
.sig { border: 1px solid #ccc; border-radius: 8px; padding: 18px 22px; background: #f8fdf0; margin-top: 28px; }
.sig h2 { font-size: 14px; margin: 0 0 12px; font-family: 'Helvetica Neue', Arial, sans-serif; }
.sig table { border-collapse: collapse; font-size: 13px; width: 100%; }
.sig td { padding: 5px 10px 5px 0; vertical-align: top; }
.sig .lbl { color: #666; white-space: nowrap; width: 140px; font-family: 'Helvetica Neue', Arial, sans-serif; }
.pending { color: #b45309; font-weight: 600; }
.foot { margin-top: 32px; text-align: center; font-size: 11px; color: #999; font-family: 'Helvetica Neue', Arial, sans-serif; }
@media print { .no-print { display: none !important; } .page { padding: 0; } }
`

export default async function AgreementPrintPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: agreement } = await admin
    .from('traveller_agreements')
    .select(`
      status, title_snapshot, body_snapshot, language_snapshot,
      signed_name, signed_at, ip_address, user_agent,
      booking_travellers ( first_name, last_name ),
      departures ( start_date, end_date, tours ( title_en ) )
    `)
    .eq('access_token', token)
    .maybeSingle()

  if (!agreement) notFound()

  const ar = (agreement as any).language_snapshot === 'ar'
  const traveller = (agreement as any).booking_travellers
  const travellerName = traveller ? `${traveller.first_name ?? ''} ${traveller.last_name ?? ''}`.trim() : '—'
  const departure = (agreement as any).departures
  const tourTitle = departure?.tours?.title_en ?? null
  const isSigned = agreement.status === 'signed'

  const L = ar
    ? { for: 'أُعدّت لصالح', signed: 'التوقيع الإلكتروني', name: 'الاسم', date: 'التاريخ', ip: 'عنوان IP', device: 'الجهاز', pending: 'لم تُوقّع بعد', trip: 'الرحلة' }
    : { for: 'Prepared for', signed: 'Electronic signature', name: 'Name', date: 'Date', ip: 'IP address', device: 'Device', pending: 'Not yet signed', trip: 'Trip' }

  return (
    <>
      <style>{CSS + (ar ? `[dir="rtl"], [dir="rtl"] * { font-family: 'Cairo', var(--font-arabic), Arial, sans-serif !important; }` : '')}</style>
      {ar && (
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" />
      )}
      <PrintToolbar ar={ar} />
      <div dir={ar ? 'rtl' : 'ltr'}>
        <div className="page">
          <div className="brand">
            <div className="name">{site.name}</div>
            <h1>{agreement.title_snapshot ?? 'Traveller Agreement'}</h1>
            {tourTitle && (
              <div className="sub">
                {L.trip}: {tourTitle}
                {departure?.start_date ? ` · ${fmtDate(departure.start_date, ar)} – ${fmtDate(departure.end_date, ar)}` : ''}
              </div>
            )}
            <div className="sub">{L.for}: <strong>{travellerName}</strong></div>
            <div className="rule" />
          </div>

          <div className="body">{agreement.body_snapshot}</div>

          <div className="sig">
            <h2>{L.signed}</h2>
            {isSigned ? (
              <table>
                <tbody>
                  <tr><td className="lbl">{L.name}</td><td>{agreement.signed_name}</td></tr>
                  <tr><td className="lbl">{L.date}</td><td>{fmtDate(agreement.signed_at, ar)}</td></tr>
                  {agreement.ip_address && <tr><td className="lbl">{L.ip}</td><td>{agreement.ip_address}</td></tr>}
                  {agreement.user_agent && <tr><td className="lbl">{L.device}</td><td>{agreement.user_agent}</td></tr>}
                </tbody>
              </table>
            ) : (
              <p className="pending">{L.pending}</p>
            )}
          </div>

          <div className="foot">{site.name} · {site.email} · {site.url}</div>
        </div>
      </div>
    </>
  )
}
