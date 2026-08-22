import Link from 'next/link'
import { localePath, type Locale } from '@/lib/locale'

export type BreadcrumbItem = {
  label: string
  href?: string
}

export default function Breadcrumbs({
  items,
  locale,
  dark = false,
}: {
  items: BreadcrumbItem[]
  locale: Locale
  dark?: boolean
}) {
  return (
    <nav aria-label={locale === 'ar' ? 'مسار التنقل' : 'Breadcrumb'}>
      <ol
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          margin: 0,
          padding: 0,
          listStyle: 'none',
          fontSize: '0.85rem',
          lineHeight: 1.5,
          color: dark ? 'rgba(234,227,210,0.75)' : '#6E6A59',
        }}
      >
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {index > 0 && <span aria-hidden="true" style={{ opacity: 0.55 }}>›</span>}
              {item.href && !last ? (
                <Link href={localePath(item.href, locale)} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} style={{ color: last && dark ? '#fff' : 'inherit' }}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
