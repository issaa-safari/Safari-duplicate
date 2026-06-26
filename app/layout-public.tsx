import type { Metadata } from 'next'
import './globals.css'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'

export const metadata: Metadata = {
  title: 'Safari Adventure Riders - East African Safari Tours',
  description: 'Experience the ultimate East African safari. Custom wildlife tours, expert guides, and unforgettable adventures.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white">
        <PublicHeader />
        <main>{children}</main>
        <PublicFooter />
      </body>
    </html>
  )
}
