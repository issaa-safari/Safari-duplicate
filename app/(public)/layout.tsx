import type { Metadata } from 'next'
import { Readex_Pro, IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Cairo } from 'next/font/google'

const readexPro = Readex_Pro({
  subsets: ['latin', 'arabic'],
  variable: '--font-display',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
  display: 'swap',
})

const ibmPlexSansAr = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-body-ar',
  weight: ['400', '500', '600'],
  display: 'swap',
})

// Arabic/RTL type: unified to Cairo for headings + body via the [dir="rtl"]
// variable swap in globals.css.
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-arabic',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

// A plain string here would replace the root layout's title *object*, dropping
// its template for every page in this group — which is why these pages used to
// render without the brand suffix. Restate the template so page titles keep it.
export const metadata: Metadata = {
  title: {
    default: 'Safari Adventure Riders - East African Safari Tours',
    template: '%s | Safari Adventure Riders',
  },
  description: 'Experience the ultimate East African safari. Custom wildlife tours, expert guides, and unforgettable adventures.',
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${readexPro.variable} ${ibmPlexSans.variable} ${ibmPlexSansAr.variable} ${cairo.variable}`}>
      <body className="bg-white" style={{ fontFamily: "var(--font-body, 'IBM Plex Sans', sans-serif)" }}>
        {children}
      </body>
    </html>
  )
}
