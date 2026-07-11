import type { Metadata } from 'next'
import { getServerLocale } from '@/lib/i18n'
import { site } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Terms of Service — Safari Adventure Riders',
}

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const sp = await searchParams
  const locale = await getServerLocale(sp)
  const isAr = locale === 'ar'
  const updated = isAr ? '11 يوليو 2026' : 'July 11, 2026'

  const t = isAr ? {
    title: 'شروط الخدمة',
    updated: 'آخر تحديث:',
    intro: `تحكم هذه الشروط استخدامك لموقع ${site.name} وخدمات الاستفسار والحجز الخاصة بنا. باستخدامك للموقع أو تواصلك معنا، فإنك توافق على هذه الشروط.`,
    sections: [
      {
        heading: '1. عروض الأسعار والحجوزات',
        body: 'جميع عروض الأسعار غير ملزمة حتى يتم تأكيد الحجز كتابياً. تفاصيل السعر والمواعيد وما يشمله البرنامج موضحة في عرض السعر المرسل إليك، وهو المرجع في حال أي اختلاف.',
      },
      {
        heading: '2. الدفع والإلغاء',
        body: 'تُحدد شروط الدفع والإلغاء لكل رحلة في عرض السعر أو تأكيد الحجز الخاص بها. يرجى مراجعتها قبل التأكيد، والتواصل معنا لأي استفسار.',
      },
      {
        heading: '3. السلامة والمسؤولية',
        body: 'تنطوي رحلات السفاري وجولات الدراجات النارية على مخاطر طبيعية. نلتزم بمعايير سلامة صارمة، ويُشترط اتباع تعليمات المرشدين في جميع الأوقات. ننصح بشدة بالحصول على تأمين سفر مناسب.',
      },
      {
        heading: '4. التواصل',
        body: `لأي أسئلة حول هذه الشروط، تواصل معنا عبر البريد الإلكتروني ${site.email} أو الهاتف ${site.phoneDisplay}.`,
      },
    ],
    rights: 'جميع الحقوق محفوظة.',
  } : {
    title: 'Terms of Service',
    updated: 'Last updated:',
    intro: `These terms govern your use of the ${site.name} website and our enquiry and booking services. By using the site or contacting us, you agree to these terms.`,
    sections: [
      {
        heading: '1. Quotes & Bookings',
        body: 'All quotes are no-obligation until a booking is confirmed in writing. Pricing, dates, and inclusions are set out in the quote we send you, which prevails in case of any discrepancy.',
      },
      {
        heading: '2. Payment & Cancellation',
        body: 'Payment and cancellation terms for each trip are specified in its quote or booking confirmation. Please review them before confirming, and contact us with any questions.',
      },
      {
        heading: '3. Safety & Liability',
        body: 'Safaris and motorcycle tours involve inherent risks. We operate to strict safety standards, and following guide instructions at all times is a condition of participation. We strongly recommend appropriate travel insurance.',
      },
      {
        heading: '4. Contact',
        body: `For any questions about these terms, contact us at ${site.email} or ${site.phoneDisplay}.`,
      },
    ],
    rights: 'All rights reserved.',
  }

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-gray-800" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t.title}</h1>
        <p className="mt-2 text-sm text-gray-500">{t.updated} {updated}</p>

        <section className="mt-10 space-y-4">
          <p>{t.intro}</p>
        </section>

        {t.sections.map((s) => (
          <section className="mt-10" key={s.heading}>
            <h2 className="text-xl font-semibold text-gray-900">{s.heading}</h2>
            <p className="mt-4 text-gray-700">{s.body}</p>
          </section>
        ))}

        <p className="mt-16 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} {site.name}. {t.rights}
        </p>
      </div>
    </main>
  )
}
