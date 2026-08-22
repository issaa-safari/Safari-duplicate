import type { Metadata } from 'next'
import { getPathLocale } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

// The quote-request page is a client component, so its metadata lives here.
// The locale comes from the x-locale header proxy.ts sets on every request
// (the same source getServerLocale reads) rather than searchParams, which
// layouts don't receive — so /ar/quote-request gets its own canonical and
// title instead of silently pointing back at the English page.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPathLocale()
  return pageMetadata({
    path: '/quote-request',
    locale,
    title: {
      en: 'Request a Custom Safari Quote',
      ar: 'اطلب عرض سعر مخصص للسفاري',
    },
    description: {
      en: "Tell us your dates, group size, and interests, and we'll build a custom Kenya or Tanzania safari itinerary with per-person pricing.",
      ar: 'أخبرنا بمواعيدك وعدد أفراد مجموعتك واهتماماتك، وسنُعد لك برنامج سفاري مخصص في كينيا أو تنزانيا مع الأسعار للفرد الواحد.',
    },
  })
}

export default function QuoteRequestLayout({ children }: { children: React.ReactNode }) {
  return children
}
