'use client'

import { whatsappLink } from '@/lib/site'

// Floating WhatsApp CTA — high-converting, especially for Arabic-speaking markets.
export default function WhatsAppButton({ lang = 'en' }: { lang?: string }) {
  const label = lang === 'ar' ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'
  const greeting =
    lang === 'ar'
      ? 'مرحباً، أود الاستفسار عن رحلات السفاري.'
      : "Hello! I'd like to ask about your safari tours."

  return (
    <a
      href={whatsappLink(greeting)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="fixed right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg hover:scale-105 hover:shadow-xl"
      style={{
        // Sit above the sticky enquiry bar when it is visible (tour pages).
        bottom: 'calc(var(--sticky-bar-h, 0px) + 24px)',
        transition: 'bottom 0.35s cubic-bezier(0.22, 1, 0.36, 1), transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-white" aria-hidden="true">
        <path d="M16.003 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.6 4.46 1.74 6.4L3.2 28.8l6.57-1.72a12.74 12.74 0 0 0 6.23 1.6h.01c7.06 0 12.8-5.74 12.8-12.8 0-3.42-1.33-6.63-3.75-9.05A12.7 12.7 0 0 0 16.003 3.2Zm0 23.07h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4.03 1.06 1.08-3.93-.25-.4a10.55 10.55 0 0 1-1.62-5.63c0-5.86 4.77-10.62 10.63-10.62 2.84 0 5.5 1.1 7.51 3.11a10.55 10.55 0 0 1 3.11 7.52c0 5.86-4.77 10.63-10.63 10.63Zm5.83-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.71.16-.21.32-.82 1.04-1 1.25-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54l-.6-.01c-.21 0-.55.08-.83.4-.29.32-1.09 1.07-1.09 2.61 0 1.54 1.12 3.03 1.28 3.24.16.21 2.2 3.36 5.33 4.71.74.32 1.32.51 1.78.65.75.24 1.43.21 1.97.13.6-.09 1.89-.77 2.16-1.52.27-.74.27-1.38.18-1.52-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  )
}
