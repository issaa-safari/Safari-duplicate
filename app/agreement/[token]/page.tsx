import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { site } from '@/lib/site'
import SignForm from './sign-form'

function fmtDate(d: string | null, ar: boolean) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(ar ? 'ar' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function AgreementSignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: agreement } = await admin
    .from('traveller_agreements')
    .select(`
      id, status, title_snapshot, body_snapshot, language_snapshot, signed_name, signed_at,
      booking_travellers ( first_name, last_name ),
      departures ( start_date, end_date, tours ( title_en ) )
    `)
    .eq('access_token', token)
    .maybeSingle()

  if (!agreement) notFound()

  const ar = (agreement as any).language_snapshot === 'ar'
  const traveller = (agreement as any).booking_travellers
  const travellerName = traveller ? `${traveller.first_name ?? ''} ${traveller.last_name ?? ''}`.trim() : 'Traveller'
  const departure = (agreement as any).departures
  const tourTitle = departure?.tours?.title_en ?? null
  const isSigned = agreement.status === 'signed'

  const L = ar
    ? { for: 'أُعدّت لصالح', signedTitle: '✓ تم توقيع الاتفاقية', signedBy: (n: string, d: string) => `وقّعها ${n} بتاريخ ${d}.`, pdf: 'تنزيل نسخة PDF' }
    : { for: 'Prepared for', signedTitle: '✓ Agreement signed', signedBy: (n: string, d: string) => `Signed by ${n} on ${d}.`, pdf: 'Download PDF copy' }

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50 py-8 px-4">
      {ar && <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" />}
      <div className="mx-auto max-w-2xl" style={ar ? { fontFamily: "'Cairo', sans-serif" } : undefined}>
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">{site.name}</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{agreement.title_snapshot ?? 'Traveller Agreement'}</h1>
          {tourTitle && (
            <p className="mt-1 text-sm text-gray-600">
              {tourTitle}
              {departure?.start_date ? ` · ${fmtDate(departure.start_date, ar)} – ${fmtDate(departure.end_date, ar)}` : ''}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-600">{L.for} <strong>{travellerName}</strong></p>
        </div>

        {isSigned ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <p className="text-lg font-semibold text-green-800">{L.signedTitle}</p>
            <p className="mt-1 text-sm text-green-700">
              {L.signedBy(agreement.signed_name ?? '', fmtDate(agreement.signed_at, ar))}
            </p>
            <a href={`/agreement/${token}/print`} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-medium text-green-800 underline">
              {L.pdf}
            </a>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {agreement.body_snapshot}
              </div>
            </div>
            <div className="mt-6">
              <SignForm token={token} defaultName={travellerName} ar={ar} />
            </div>
          </>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          {site.name} · {site.email}
        </p>
      </div>
    </div>
  )
}
