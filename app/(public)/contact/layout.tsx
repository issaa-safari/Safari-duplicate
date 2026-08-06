import type { Metadata } from 'next'
import { site } from '@/lib/site'

// The contact page is a client component, so its metadata lives here. Layouts
// do not receive searchParams, which means no ?lang= aware variant — English
// is what crawlers see today either way.
export const metadata: Metadata = {
  title: 'Contact Us',
  description: `Get in touch with ${site.name} by WhatsApp, email, or the enquiry form to plan your Kenya or Tanzania safari.`,
  alternates: { canonical: '/contact' },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
