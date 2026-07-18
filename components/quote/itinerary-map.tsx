// Tour itinerary map — numbered day pins over OpenStreetMap tiles.
//
// Deliberately dependency-free and key-free: tiles are plain <img> elements
// (CSP img-src already allows https:) laid out with the Web-Mercator math in
// lib/geo.ts, with an SVG polyline + absolutely-positioned pins on top. Pure
// server-rendered markup with inline styles, so the same component works in
// the styled proposal and the print document, and prints correctly.

import { fitZoom, mercatorPx, type LatLng } from '@/lib/geo'

const OLIVE = '#7A9A4A'
const BUSH = '#20271A'

export type MapStop = LatLng & {
  /** Pin label, e.g. the day number ("1", "2") — kept to 1–2 characters. */
  label: string
  name: string
}

const TILE = 256

export default function ItineraryMap({
  stops,
  width = 720,
  height = 400,
}: {
  stops: MapStop[]
  width?: number
  height?: number
}) {
  if (stops.length < 2) return null

  const zoom = fitZoom(stops, width, height)
  const pts = stops.map(s => mercatorPx(s, zoom))
  const cx = (Math.min(...pts.map(p => p.x)) + Math.max(...pts.map(p => p.x))) / 2
  const cy = (Math.min(...pts.map(p => p.y)) + Math.max(...pts.map(p => p.y))) / 2
  const originX = cx - width / 2
  const originY = cy - height / 2

  const maxTile = 2 ** zoom
  const txStart = Math.floor(originX / TILE)
  const txEnd = Math.floor((originX + width) / TILE)
  const tyStart = Math.floor(originY / TILE)
  const tyEnd = Math.floor((originY + height) / TILE)

  const tiles: { key: string; x: number; y: number; left: number; top: number }[] = []
  for (let tx = txStart; tx <= txEnd; tx++) {
    for (let ty = tyStart; ty <= tyEnd; ty++) {
      if (ty < 0 || ty >= maxTile) continue // outside the mercator square
      const wrappedX = ((tx % maxTile) + maxTile) % maxTile
      tiles.push({ key: `${tx}/${ty}`, x: wrappedX, y: ty, left: tx * TILE - originX, top: ty * TILE - originY })
    }
  }

  const local = pts.map(p => ({ x: p.x - originX, y: p.y - originY }))
  const path = local.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <div dir="ltr" style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <div
        style={{
          position: 'relative',
          width,
          maxWidth: '100%',
          height,
          overflow: 'hidden',
          borderRadius: 12,
          border: `1px solid ${OLIVE}44`,
          background: '#E8ECDF',
        }}
      >
        {tiles.map(t => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={t.key}
            src={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`}
            alt=""
            width={TILE}
            height={TILE}
            loading="lazy"
            style={{ position: 'absolute', left: t.left, top: t.top, width: TILE, height: TILE, maxWidth: 'none' }}
          />
        ))}

        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          aria-hidden="true"
        >
          <path d={path} fill="none" stroke={BUSH} strokeWidth={2.5} strokeDasharray="6 5" strokeLinejoin="round" opacity={0.75} />
        </svg>

        {local.map((p, i) => {
          const stop = stops[i]
          const isEdge = i === 0 || i === stops.length - 1
          return (
            <div
              key={i}
              title={stop.name}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                transform: 'translate(-50%, -50%)',
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: isEdge ? BUSH : OLIVE,
                color: '#fff',
                border: '2px solid #fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'Arial, sans-serif',
              }}
            >
              {stop.label}
            </div>
          )
        })}

        <span
          style={{
            position: 'absolute',
            right: 4,
            bottom: 2,
            fontSize: 9,
            color: '#333',
            background: '#ffffffcc',
            padding: '1px 5px',
            borderRadius: 4,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          © <a href="https://www.openstreetmap.org/copyright" style={{ color: '#333' }}>OpenStreetMap</a> contributors
        </span>
      </div>
    </div>
  )
}
