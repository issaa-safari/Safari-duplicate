'use client'

// Shared "Location" inputs for the content-library forms (destinations /
// accommodations / parks). Field names match lib/geo.ts geoColumnsFromForm,
// which the server actions use to persist them. Pasting a Google Maps link
// fills lat/lng immediately (client-side parse); the server re-parses on save
// as a fallback, so a plain paste-and-submit also works.

import { useState } from 'react'
import { parseLatLngFromMapsUrl } from '@/lib/geo'

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

export default function LocationFields({
  googleMapsUrl,
  latitude,
  longitude,
}: {
  googleMapsUrl?: string | null
  latitude?: number | null
  longitude?: number | null
}) {
  const [lat, setLat] = useState(latitude != null ? String(latitude) : '')
  const [lng, setLng] = useState(longitude != null ? String(longitude) : '')

  function onUrlChange(url: string) {
    const parsed = parseLatLngFromMapsUrl(url)
    if (parsed) {
      setLat(String(parsed.lat))
      setLng(String(parsed.lng))
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="googleMapsUrl" className="block text-sm font-medium text-foreground mb-1">Google Maps link</label>
        <input
          id="googleMapsUrl"
          type="url"
          name="googleMapsUrl"
          defaultValue={googleMapsUrl ?? ''}
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
