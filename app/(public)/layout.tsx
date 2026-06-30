import type { Metadata } from 'next'
import { Readex_Pro, IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google'

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

export const metadata: Metadata = {
  title: 'Safari Adventure Riders - East African Safari Tours',
  description: 'Experience the ultimate East African safari. Custom wildlife tours, expert guides, and unforgettable adventures.',
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${readexPro.variable} ${ibmPlexSans.variable} ${ibmPlexSansAr.variable}`}>
      <body className="bg-white" style={{ fontFamily: "var(--font-body, 'IBM Plex Sans', sans-serif)" }}>
        {children}
      </body>
    </html>
  )
}
