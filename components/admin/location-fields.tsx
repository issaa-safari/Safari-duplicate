'use client'

// Shared "Location" inputs for the content-library forms (destinations /
// accommodations / parks). Field names match lib/geo.ts geoColumnsFromForm,
// which the server actions use to persist them. Pasting a Google Maps link
// fills lat/lng immediately (client-side parse); the server re-parses on save
// as a fallback, so a plain paste-and-submit also works.
//
// The "Search Google Maps" box on top calls the admin-only proxy
// /api/admin/places-search (Places API New — the key stays server-side).
// Selecting a result fills the URL (place_id form), coordinates, and the
// hidden googlePlaceId; name/rating are offered to the parent form via
// onPlaceSelected so it can fill its own inputs when they're still empty.

import { useState } from 'react'
import { parseLatLngFromMapsUrl } from '@/lib/geo'

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

type PlaceResult = {
  placeId: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  rating: number | null
}

export default function LocationFields({
  googleMapsUrl,
  latitude,
  longitude,
  googlePlaceId,
  onPlaceSelected,
}: {
  googleMapsUrl?: string | null
  latitude?: number | null
  longitude?: number | null
  googlePlaceId?: string | null
  /** Lets the parent form fill its own fields (e.g. name/rating) from the picked place. */
  onPlaceSelected?: (place: { name: string; rating: number | null }) => void
}) {
  const [url, setUrl] = useState(googleMapsUrl ?? '')
  const [lat, setLat] = useState(latitude != null ? String(latitude) : '')
  const [lng, setLng] = useState(longitude != null ? String(longitude) : '')
  const [placeId, setPlaceId] = useState(googlePlaceId ?? '')

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<PlaceResult[] | null>(null)
  const [searchError, setSearchError] = useState('')
  const [filledFrom, setFilledFrom] = useState('')

  function onUrlChange(nextUrl: string) {
    setUrl(nextUrl)
    const parsed = parseLatLngFromMapsUrl(nextUrl)
    if (parsed) {
      setLat(String(parsed.lat))
      setLng(String(parsed.lng))
    }
  }

  async function runSearch() {
    const q = query.trim()
    if (!q || searching) return
    setSearching(true)
    setSearchError('')
    setResults(null)
    setFilledFrom('')
    try {
      const res = await fetch('/api/admin/places-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Search failed')
      setResults(json.results ?? [])
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed — enter the location manually.')
    } finally {
      setSearching(false)
    }
  }

  function pickResult(r: PlaceResult) {
    if (r.lat != null && r.lng != null) {
      setLat(String(r.lat))
      setLng(String(r.lng))
    }
    setUrl(`https://www.google.com/maps/place/?q=place_id:${r.placeId}`)
    setPlaceId(r.placeId)
    setResults(null)
    setFilledFrom(r.name)
    onPlaceSelected?.({ name: r.name, rating: r.rating })
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="placesSearch" className="block text-sm font-medium text-foreground mb-1">Search Google Maps</label>
        <div className="flex gap-2">
          <input
            id="placesSearch"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch() } }}
            placeholder="Search property on Google Maps…"
            className={inputCls}
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={searching || !query.trim()}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40 whitespace-nowrap"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
        {searchError && (
          <p className="mt-1 text-xs text-warning-foreground">{searchError}</p>
        )}
        {results && results.length === 0 && (
          <p className="mt-1 text-xs text-muted-foreground">No matches — try a different name or fill the fields manually.</p>
        )}
        {results && results.length > 0 && (
          <ul className="mt-2 rounded-md border border-border divide-y divide-border overflow-hidden">
            {results.map(r => (
              <li key={r.placeId}>
                <button
                  type="button"
                  onClick={() => pickResult(r)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                >
                  <span className="font-medium text-foreground">{r.name}</span>
                  {r.rating != null && <span className="ml-2 text-xs text-muted-foreground">★ {r.rating}</span>}
                  {r.address && <span className="block text-xs text-muted-foreground">{r.address}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {filledFrom && (
          <p className="mt-1 text-xs text-brand-ink">✓ Filled from Google Maps ({filledFrom}) — all fields stay editable.</p>
        )}
      </div>

      <input type="hidden" name="googlePlaceId" value={placeId} />

      <div>
        <label htmlFor="googleMapsUrl" className="block text-sm font-medium text-foreground mb-1">Google Maps link</label>
        <input
          id="googleMapsUrl"
          type="url"
          name="googleMapsUrl"
          value={url}
          placeholder="https://www.google.com/maps/place/…"
          onChange={e => onUrlChange(e.target.value)}
          className={inputCls}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Paste the place&apos;s Google Maps URL — coordinates are read from the link automatically. They power the proposal&apos;s itinerary map and distances.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="latitude" className="block text-sm font-medium text-foreground mb-1">Latitude</label>
          <input
            id="latitude"
            type="number"
            step="any"
            min={-90}
            max={90}
            name="latitude"
            value={lat}
            onChange={e => setLat(e.target.value)}
            placeholder="-1.2921"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="longitude" className="block text-sm font-medium text-foreground mb-1">Longitude</label>
          <input
            id="longitude"
            type="number"
            step="any"
            min={-180}
            max={180}
            name="longitude"
            value={lng}
            onChange={e => setLng(e.target.value)}
            placeholder="36.8219"
            className={inputCls}
          />
        </div>
      </div>
    </div>
  )
}
