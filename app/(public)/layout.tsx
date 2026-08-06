import type { Metadata } from 'next'

// This layout used to render its own <html> and <body> inside the root
// layout's, so every page in the group shipped two of each — the live site
// served nested <html> tags, and the outer (root) one is what the browser and
// crawlers actually read, which made the lang/dir set here dead markup.
// The four fonts it also declared are already loaded by the root layout, so
// dropping the wrapper loses nothing.

// A plain string title would replace the root layout's title *object*, dropping
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
  return <div className="bg-white">{children}</div>
}
