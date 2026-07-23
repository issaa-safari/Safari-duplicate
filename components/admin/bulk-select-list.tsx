'use client'

import { type ReactNode, useState } from 'react'
import { useAction } from '@/lib/hooks/use-action'
import { useRouter } from 'next/navigation'

export interface StatusOption {
  value: string
  label: string
}

/**
 * Generic checkbox-select wrapper for admin card lists — adds a sticky
 * action bar (bulk delete + optional bulk status change) around a list the
 * caller still renders itself via `renderItem`. Selection is local UI state;
 * mutations go through the server actions passed in, followed by
 * `router.refresh()` to reload the underlying (server-fetched) list.
 */
export default function BulkSelectableList<T>({
  items,
  getId,
  renderItem,
  onDelete,
  deleteConfirm,
  statusOptions,
  onSetStatus,
  gridClassName,
}: {
  items: T[]
  getId: (item: T) => string
  renderItem: (item: T) => ReactNode
  onDelete?: (ids: string[]) => Promise<{ error: string | null }>
  deleteConfirm?: (count: number) => string
  statusOptions?: StatusOption[]
  onSetStatus?: (ids: string[], status: string) => Promise<{ error: string | null }>
  /** Render items in a card grid (checkbox overlaid top-left) instead of the default stacked list. */
  gridClassName?: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const { pending, run } = useAction()
  const [error, setError] = useState('')
  const [statusChoice, setStatusChoice] = useState(statusOptions?.[0]?.value ?? '')

  const allIds = items.map(getId)
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id))

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds))
  }

  function runDelete() {
    if (!onDelete) return
    const ids = [...selected]
    if (ids.length === 0) return
    if (deleteConfirm && !window.confirm(deleteConfirm(ids.length))) return
    setError('')
    run(async () => {
      const result = await onDelete(ids)
      if (result.error) setError(result.error)
      setSelected(new Set())
      router.refresh()
    })
  }

  function runSetStatus() {
    if (!onSetStatus || !statusChoice) return
    const ids = [...selected]
    if (ids.length === 0) return
    setError('')
    run(async () => {
      // Bulk status changes can partially succeed (some rows locked or
      // ineligible) — always refresh so any that did move show up, while the
      // error message (if any) explains what was skipped and why.
      const result = await onSetStatus(ids, statusChoice)
      if (result.error) setError(result.error)
      setSelected(new Set())
      router.refresh()
    })
  }

  return (
    <div>
      {selected.size > 0 && (
        // Stick *below* the sticky app chrome, not at viewport top — otherwise
        // the bar (and its Delete / Change-status buttons) hides behind the
        // mobile top bar (h-14 + notch inset) or the desktop header (~108px),
        // which made bulk actions unreachable on a phone.
        <div className="sticky top-[calc(env(safe-area-inset-top)+3.75rem)] z-20 mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 shadow-sm lg:top-[7rem]">
          <span className="text-sm font-medium text-foreground">{selected.size} selected</span>

          {statusOptions && onSetStatus && (
            <div className="flex items-center gap-1.5">
              <select
                value={statusChoice}
                onChange={e => setStatusChoice(e.target.value)}
                className="rounded-md border border-border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                {statusOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending}
                onClick={runSetStatus}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
              >
                {pending ? 'Applying…' : 'Change status'}
              </button>
            </div>
          )}

          {onDelete && (
            <button
              type="button"
              disabled={pending}
              onClick={runDelete}
              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-red-50 disabled:opacity-50"
            >
              {pending ? 'Deleting…' : 'Delete'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {items.length > 0 && (
        <label className="mb-2 flex w-fit cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-border"
          />
          Select all
        </label>
      )}

      {gridClassName ? (
        <div className={gridClassName}>
          {items.map(item => {
            const id = getId(item)
            return (
              <div key={id} className="relative">
                <input
                  type="checkbox"
                  className="absolute left-2 top-2 z-10 h-4 w-4 rounded border-border bg-white"
                  checked={selected.has(id)}
                  onChange={() => toggle(id)}
                  aria-label="Select item"
                />
                {renderItem(item)}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const id = getId(item)
            return (
              <div key={id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-4 h-4 w-4 shrink-0 rounded border-border"
                  checked={selected.has(id)}
                  onChange={() => toggle(id)}
                  aria-label="Select row"
                />
                <div className="min-w-0 flex-1">{renderItem(item)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
