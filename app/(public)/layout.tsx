import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Safari Adventure Riders - East African Safari Tours',
  description: 'Experience the ultimate East African safari. Custom wildlife tours, expert guides, and unforgettable adventures.',
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white">{children}</body>
    </html>
  )
}
