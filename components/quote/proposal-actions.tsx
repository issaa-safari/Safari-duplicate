'use client'

import { useEffect, useState, type ReactNode } from 'react'

// The proposal's action bar: pinned to the top once the cover scrolls past, so
// the price, the PDF and the booking button stay one tap away however far down
// the reader is.
//
// The price panel is the same markup the Pricing section renders further down —
// it is passed in as children rather than duplicated, so the two can never
// disagree.

const OLIVE = '#7A9A4A'
const OLIVE_DK = '#63803B'
const BUSH = '#20271A'

type Labels = {
  priceDetails: string
  downloadPdf: string
  confirmBooking: string
  share: string
  shareWhatsApp: string
  copyLink: string
  copied: string
  close: string
}

export default function ProposalActions({
  printHref,
  totalLabel,
  showConfirm,
  labels,
  isArabic,
  pricePanel,
}: {
  printHref: string
  totalLabel: string
  /** Hidden once the quote is accepted or declined — nothing left to confirm. */
  showConfirm: boolean
  labels: Labels
  isArabic: boolean
  pricePanel: ReactNode
}) {
  const [stuck, setStuck] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)

  // The bar appears only after the cover is out of the way; at the very top the
  // hero already carries the price and the page should feel uncluttered.
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 320)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Esc closes the panel, and the page behind it must not scroll while it is up.
  useEffect(() => {
    if (!priceOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPriceOpen(false) }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [priceOpen])

  function goToBooking() {
    document.getElementById('proposal-accept')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <>
      {/* ── Sticky bar ─────────────────────────────────────────── */}
      <div
        className="no-print fixed inset-x-0 top-0 z-40 transition-transform duration-200"
        style={{ transform: stuck ? 'translateY(0)' : 'translateY(-110%)' }}
      >
        <div className="border-b bg-white/95 backdrop-blur" style={{ borderColor: '#0000000f' }}>
          <div className="mx-auto flex max-w-[820px] items-center gap-2 px-3 py-2.5 sm:px-4">
            <span className="me-auto hidden text-sm font-semibold sm:block" style={{ color: BUSH }}>
              {totalLabel}
            </span>
            <button
              type="button"
              onClick={() => setPriceOpen(true)}
              className="rounded-full border px-3.5 py-2 text-xs font-semibold sm:text-sm"
              style={{ borderColor: OLIVE, color: OLIVE_DK }}
            >
              {labels.priceDetails}
            </button>
            <a
              href={printHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border px-3.5 py-2 text-xs font-semibold sm:text-sm"
              style={{ borderColor: OLIVE, color: OLIVE_DK }}
            >
              {labels.downloadPdf}
            </a>
            {showConfirm && (
              <button
                type="button"
                onClick={goToBooking}
                className="rounded-full px-3.5 py-2 text-xs font-semibold text-white sm:text-sm"
                style={{ background: OLIVE }}
              >
                {labels.confirmBooking}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Price details panel ────────────────────────────────── */}
      {priceOpen && (
        <div
          className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          style={{ background: '#00000066' }}
          onClick={() => setPriceOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={labels.priceDetails}
            dir={isArabic ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-[820px] overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl"
          >
            <div
              className="sticky top-0 flex items-center justify-between px-5 py-4"
              style={{ background: OLIVE }}
            >
              <h2 className="text-base font-bold text-white">{labels.priceDetails}</h2>
              <button
                type="button"
                onClick={() => setPriceOpen(false)}
                aria-label={labels.close}
                className="text-2xl leading-none text-white"
              >
                ×
              </button>
            </div>
            <div className="p-5 sm:p-6">{pricePanel}</div>
          </div>
        </div>
      )}
    </>
  )
}

/** Share row — rendered near the foot of the proposal, not in the sticky bar. */
export function ProposalShare({
  shareUrl, shareText, labels,
}: {
  shareUrl: string
  shareText: string
  labels: Pick<Labels, 'share' | 'shareWhatsApp' | 'copyLink' | 'copied'>
}) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // See above — silently ignore a blocked clipboard.
    }
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-3">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
        style={{ background: '#25D366' }}
      >
        <span aria-hidden="true">✆</span> {labels.shareWhatsApp}
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
        style={{ borderColor: `${OLIVE}66`, color: OLIVE_DK }}
      >
        <span aria-hidden="true">🔗</span> {copied ? labels.copied : labels.copyLink}
      </button>
    </div>
  )
}
