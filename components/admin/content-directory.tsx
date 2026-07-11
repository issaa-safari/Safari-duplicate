'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { googleMapsSearchUrl } from '@/lib/site'

export type DirectoryBadge = { label: string; className: string }

export type DirectoryItem = {
  id: string
  name: string
  /** Admin detail/edit route. */
  href: string
  imageUrl: string | null
  /** Human place text shown under the name (destination or region). */
  location: string | null
  country: string | null
  /** Parts joined into the Google Maps search query. */
  mapsQuery: string
  badges: DirectoryBadge[]
  rating?: number | null
  active: boolean
  /** facetKey -> value, e.g. { country: 'Kenya', type: 'lodge', class: 'luxury' }. */
  facets: Record<string, string | null>
}

export type FacetDef = { key: string; label: string }

const SORTS = [
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'country', label: 'Country' },
] as const
type SortKey = (typeof SORTS)[number]['key']

function Thumb({ src, alt, icon }: { src: string | null; alt: string; icon: string }) {
  const [failed, setFailed] = useState(false)
  const show = src && !failed
  return (
    <div
      className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md"
      style={{ background: 'linear-gradient(135deg,#2f3b22 0%,#4C5E2A 55%,#7A9A4A 100%)' }}
    >
      {show ? (
        // Plain img: CSP allows any https image and onError degrades to the
        // gradient placeholder; next/image would hard-error on unlisted hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-lg text-white/70" aria-hidden="true">
          {icon}
        </div>
      )}
    </div>
  )
}

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)))
  return (
    <span className="text-xs text-gold" aria-label={`${r} star`}>
      {'★'.repeat(r)}<span className="text-gray-300">{'★'.repeat(5 - r)}</span>
    </span>
  )
}

export default function ContentDirectory({
  items,
  facetDefs,
  noun,
  placeholderIcon = '⌂',
}: {
  items: DirectoryItem[]
  facetDefs: FacetDef[]
  noun: { singular: string; plural: string }
  placeholderIcon?: string
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Record<string, Set<string>>>({})
  const [sort, setSort] = useState<SortKey>('name')
  const [showFilters, setShowFilters] = useState(false)

  const q = query.trim().toLowerCase()

  const matchesSearch = (it: DirectoryItem) =>
    !q ||
    it.name.toLowerCase().includes(q) ||
    (it.location ?? '').toLowerCase().includes(q) ||
    (it.country ?? '').toLowerCase().includes(q)

  // An item passes a facet group if that group has no selection, or the item's
  // value is one of the selected values (OR within a group, AND across groups).
  const matchesFacetsExcept = (it: DirectoryItem, exceptKey?: string) =>
    facetDefs.every(({ key }) => {
      if (key === exceptKey) return true
      const sel = selected[key]
      if (!sel || sel.size === 0) return true
      const v = it.facets[key]
      return v != null && sel.has(v)
    })

  const filtered = useMemo(() => {
    const list = items.filter((it) => matchesSearch(it) && matchesFacetsExcept(it))
    return [...list].sort((a, b) =>
      sort === 'country'
        ? (a.country ?? '').localeCompare(b.country ?? '') || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, q, selected, sort])

  // Per-value counts, computed over the set filtered by search + every OTHER
  // facet group (standard faceted-count behavior).
  const facetGroups = useMemo(() => {
    return facetDefs.map((def) => {
      const base = items.filter((it) => matchesSearch(it) && matchesFacetsExcept(it, def.key))
      const counts = new Map<string, number>()
      for (const it of base) {
        const v = it.facets[def.key]
        if (v == null || v === '') continue
        counts.set(v, (counts.get(v) ?? 0) + 1)
      }
      const values = [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
      return { def, values }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, q, selected])

  const activeCount = Object.values(selected).reduce((n, s) => n + s.size, 0)

  function toggle(key: string, value: string) {
    setSelected((prev) => {
      const next = { ...prev }
      const set = new Set(next[key] ?? [])
      if (set.has(value)) set.delete(value)
      else set.add(value)
      next[key] = set
      return next
    })
  }
  const clearAll = () => setSelected({})

  const activeChips = facetDefs.flatMap(({ key, label }) =>
    [...(selected[key] ?? [])].map((value) => ({ key, label, value })),
  )

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${noun.plural} or destination…`}
          aria-label={`Search ${noun.plural}`}
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--olive)]"
        />
      </div>

      {/* Result count + controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Found <span className="font-semibold text-gray-900">{filtered.length}</span>{' '}
          {filtered.length === 1 ? noun.singular : noun.plural}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="lg:hidden rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="hidden sm:inline">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort"
              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--olive)]"
            >
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key + chip.value}
              type="button"
              onClick={() => toggle(chip.key, chip.value)}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--olive)]/10 px-2.5 py-1 text-xs font-medium text-[var(--olive-dk)] hover:bg-[var(--olive)]/20"
            >
              <span className="capitalize">{chip.value.replace(/_/g, ' ')}</span>
              <span aria-hidden="true">×</span>
              <span className="sr-only">Remove {chip.label} filter {chip.value}</span>
            </button>
          ))}
          <button type="button" onClick={clearAll} className="text-xs font-medium text-gray-500 hover:text-gray-800 hover:underline">
            Remove all filters
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
        {/* Filter rail */}
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          {facetGroups.map(({ def, values }) => (
            values.length === 0 ? null : (
              <div key={def.key} className="mb-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{def.label}</h3>
                <div className="space-y-1">
                  {values.map(({ value, count }) => {
                    const checked = selected[def.key]?.has(value) ?? false
                    return (
                      <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(def.key, value)}
                          className="accent-[var(--olive)]"
                        />
                        <span className="flex-1 capitalize">{value.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-muted-foreground">{count}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          ))}
          {activeCount > 0 && (
            <button type="button" onClick={clearAll} className="text-xs font-medium text-[var(--olive)] hover:underline">
              Remove all filters
            </button>
          )}
        </aside>

        {/* List */}
        <div className="min-w-0">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
              <p className="text-sm text-gray-500">
                {items.length === 0
                  ? `No ${noun.plural} yet.`
                  : `No ${noun.plural} match your search or filters.`}
              </p>
              {activeCount > 0 && (
                <button type="button" onClick={clearAll} className="mt-3 text-sm font-medium text-[var(--olive)] hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
              {filtered.map((it) => (
                <li key={it.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 sm:p-4">
                  <Thumb src={it.imageUrl} alt={it.name} icon={placeholderIcon} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={it.href} className="font-semibold text-gray-900 hover:text-[var(--olive-dk)] hover:underline">
                        {it.name}
                      </Link>
                      {!it.active && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-muted-foreground">Inactive</span>
                      )}
                      {it.badges.map((b) => (
                        <span key={b.label} className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${b.className}`}>
                          {b.label}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
                      {(it.location || it.country) && (
                        <span className="inline-flex items-center gap-1">
                          <span aria-hidden="true" className="text-gray-400">⚲</span>
                          {[it.location, it.country].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      {typeof it.rating === 'number' && it.rating > 0 && <Stars rating={it.rating} />}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <a
                      href={googleMapsSearchUrl(it.mapsQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:inline-flex"
                    >
                      <span aria-hidden="true">⚲</span> Google Maps
                    </a>
                    <Link href={it.href} aria-label={`Edit ${it.name}`} className="text-muted-foreground hover:text-gray-700">→</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
