import type { MetadataRoute } from 'next'
import { site } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /dashboard is bilingual, so its Arabic address needs excluding too —
        // the rest are single-language and have no /ar form.
        disallow: ['/admin/', '/api/', '/dashboard', '/ar/dashboard', '/quote/'],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  }
}
