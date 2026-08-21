'use client'

// Full-screen click-to-enlarge viewer, shared by the photo gallery and the
// itinerary's day photos. Shows the image uncropped (object-fit: contain) at
// its own aspect ratio — the inline thumbnails crop to fit their grid/card,
// this is where a client sees the whole photo clearly.

import { useEffect } from 'react'

export default function Lightbox({
  images,
  index,
  isAr,
  onClose,
  onNavigate,
}: {
  images: string[]
  index: number
  isAr: boolean
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  const hasMultiple = images.length > 1

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (!hasMultiple) return
      // Arrow direction follows reading direction, not screen side.
      if (e.key === (isAr ? 'ArrowLeft' : 'ArrowRight')) onNavigate((index + 1) % images.length)
      if (e.key === (isAr ? 'ArrowRight' : 'ArrowLeft')) onNavigate((index - 1 + images.length) % images.length)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [index, images.length, hasMultiple, isAr, onClose, onNavigate])

  const navButtonStyle: React.CSSProperties = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: 48, height: 48, borderRadius: '50%',
    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
    color: '#fff', fontSize: 22, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? 'عرض الصورة' : 'Image viewer'}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(20,25,15,0.94)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(16px, 5vw, 56px)',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={isAr ? 'إغلاق' : 'Close'}
        style={{
          position: 'absolute', top: 16, insetInlineEnd: 16,
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ✕
      </button>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate((index - 1 + images.length) % images.length) }}
            aria-label={isAr ? 'السابق' : 'Previous'}
            style={{ ...navButtonStyle, insetInlineStart: 'clamp(8px, 2vw, 24px)' }}
          >
            {isAr ? '›' : '‹'}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate((index + 1) % images.length) }}
            aria-label={isAr ? 'التالي' : 'Next'}
            style={{ ...navButtonStyle, insetInlineEnd: 'clamp(8px, 2vw, 24px)' }}
          >
            {isAr ? '‹' : '›'}
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element -- full-size original, deliberately not Next/Image's fixed-box `fill` mode */}
      <img
        src={images[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
      />

      {hasMultiple && (
        <div style={{
          position: 'absolute', bottom: 20, left: 0, right: 0,
          textAlign: 'center', color: 'rgba(255,255,255,0.75)',
          fontSize: 13, fontFamily: 'var(--font-body, sans-serif)',
        }}>
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  )
}
