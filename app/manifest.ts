import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Safari Adventure Riders',
    short_name: 'Safari Riders',
    description: 'Booking, quoting and trip management for Safari Adventure Riders.',
    id: '/',
    start_url: '/admin/dashboard',
    scope: '/',
    lang: 'en',
    dir: 'ltr',
    categories: ['business', 'productivity', 'travel'],
    display: 'standalone',
    // Prefer the most immersive shell the platform supports, degrading
    // gracefully (window-controls-overlay → standalone → minimal-ui).
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#F5F0E8',
    theme_color: '#7A9A4A',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Admin dashboard', url: '/admin/dashboard' },
      { name: 'My trips', url: '/dashboard' },
    ],
  }
}
