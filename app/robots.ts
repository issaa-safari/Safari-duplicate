import type { MetadataRoute } from 'next'
import { site } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /dashboard is bilingual, so its Arabic address needs excluding too —
        // the rest are single-language and have no /ar form. /book, /voucher
        // and /agreement are token-scoped client documents just like /quote
        // (see UNLOCALISED_PREFIXES in lib/locale.ts) and belong here too.
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard',
          '/ar/dashboard',
          '/quote/',
          '/book/',
          '/voucher/',
          '/agreement/',
        ],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  }
}
