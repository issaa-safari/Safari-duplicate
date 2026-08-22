import type { Metadata } from 'next'
import { site } from '@/lib/site'
import { getPathLocale } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

// The contact page is a client component, so its metadata lives here. The
// locale comes from the x-locale header proxy.ts sets on every request (the
// same source getServerLocale reads) rather than searchParams, which layouts
// don't receive — so /ar/contact gets its own canonical and title instead of
// silently pointing back at the English page.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPathLocale()
  return pageMetadata({
    path: '/contact',
    locale,
    title: { en: 'Contact Us', ar: 'تواصل معنا' },
    description: {
      en: `Get in touch with ${site.name} by WhatsApp, email, or the enquiry form to plan your Kenya or Tanzania safari.`,
      ar: `تواصل مع ${site.name} عبر واتساب أو البريد الإلكتروني أو نموذج الاستفسار لتخطيط رحلة السفاري الخاصة بك في كينيا أو تنزانيا.`,
    },
  })
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
