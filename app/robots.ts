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
        //
        // /quote, /book, /voucher and /agreement (token-scoped client
        // documents, see UNLOCALISED_PREFIXES in lib/locale.ts) are
        // deliberately NOT disallowed here even though they're private: each
        // of those pages carries its own `robots: { index: false }`
        // metadata, and a Disallow rule would stop crawlers from ever
        // fetching the page to see that tag. Per Google's own guidance,
        // combining Disallow with noindex is counterproductive — a
        // disallowed-but-linked URL can still surface as a bare, description-
        // less result, whereas an allowed page carrying noindex is
        // reliably kept out. noindex alone is the correct tool here.
        disallow: ['/admin/', '/api/', '/dashboard', '/ar/dashboard'],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  }
}
