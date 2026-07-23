// Tour itinerary map — numbered day pins over OpenStreetMap tiles.
//
// Deliberately dependency-free and key-free: tiles, the route line and the pins
// are all drawn inside a single responsive <svg> using the Web-Mercator math in
// lib/geo.ts. The SVG carries a fixed viewBox but renders at width:100%, so the
// whole map scales down to fit narrow (mobile) containers instead of being
// clipped — while never exceeding its natural size on desktop and in print.
// Pure server-rendered markup, so the same component works in the styled
// proposal and the print document.

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
    // dir=ltr: map coordinates are always left-to-right, even on Arabic (RTL)
    // proposal pages. width:100% + maxWidth caps the size on desktop/print and
    // lets the whole map shrink to fit on phones.
    <div dir="ltr" style={{ position: 'relative', width: '100%', maxWidth: width, margin: '0 auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Tour itinerary route map"
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          borderRadius: 12,
          border: `1px solid ${OLIVE}44`,
          background: '#E8ECDF',
        }}
      >
        <defs>
          <filter id="itineraryPinShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.4" floodColor="#000" floodOpacity="0.35" />
          </filter>
        </defs>

        {tiles.map(t => (
          <image
            key={t.key}
            href={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`}
            x={t.left}
            y={t.top}
            width={TILE}
            height={TILE}
          />
        ))}

        <path
          d={path}
          fill="none"
          stroke={BUSH}
          strokeWidth={2.5}
          strokeDasharray="6 5"
          strokeLinejoin="round"
          opacity={0.75}
        />

        {local.map((p, i) => {
          const stop = stops[i]
          const isEdge = i === 0 || i === stops.length - 1
          return (
            <g key={i}>
              <title>{stop.name}</title>
              <circle
                cx={p.x}
                cy={p.y}
                r={13}
                fill={isEdge ? BUSH : OLIVE}
                stroke="#fff"
                strokeWidth={2}
                filter="url(#itineraryPinShadow)"
              />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize={12}
                fontWeight={700}
                fontFamily="Arial, sans-serif"
              >
                {stop.label}
              </text>
            </g>
          )
        })}
      </svg>

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
  )
}
