'use client'

import { ReactNode, useEffect, useId, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface DialogProps {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  /** Rendered in a right-aligned footer bar when provided. */
  footer?: ReactNode
  /** Tailwind max-width class for the panel. */
  maxWidth?: string
  /** Tailwind classes for stacking/vertical offset — nested dialogs need a higher z. */
  overlayClass?: string
  /** Extra classes on the title element (e.g. 'text-lg' for large headers). */
  titleClass?: string
}

// Accessible modal primitive shared by the admin dialogs: role="dialog",
// aria-modal, labelled title, Escape-to-close, Tab focus trap, focus restore
// on unmount, and overlay click-to-close. Dialogs may nest (activities modal
// opens a lookup dialog); key events stop at the innermost open dialog so
// Escape and Tab never leak to the one underneath.
export default function Dialog({
  title,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-md',
  overlayClass = 'z-[60] pt-20',
  titleClass = 'text-sm',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    // Respect an autoFocus already inside the panel; otherwise focus the
    // first control so keyboard users land in the dialog.
    if (panel && !panel.contains(document.activeElement)) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel).focus()
    }
    return () => prev?.focus()
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    e.stopPropagation()
    const panel = panelRef.current
    if (!panel) return
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className={`fixed inset-0 flex items-start justify-center px-4 ${overlayClass}`}
      style={{ backgroundColor: 'rgba(26,46,19,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full ${maxWidth} rounded-xl bg-white shadow-2xl overflow-hidden outline-none`}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 id={titleId} className={`font-semibold text-gray-900 ${titleClass}`}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ×
          </button>
        </div>
        {children}
        {footer && (
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
