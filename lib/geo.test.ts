import { describe, expect, it, vi, afterEach } from 'vitest'
import { fitZoom, googleMapsLinkFor, haversineKm, mercatorPx, parseLatLngFromMapsUrl } from './geo'
import { computeRoadKm } from './google-routes'

describe('parseLatLngFromMapsUrl', () => {
  it('parses the place-marker (!3d…!4d…) form and prefers it over the viewport', () => {
    const url = 'https://www.google.com/maps/place/Nairobi/@-1.3032051,36.6825954,11z/data=!3m1!4b1!4m6!3m5!1s0x182f1172d84d49a7:0xf7cf0254b297924c!8m2!3d-1.2920659!4d36.8219462!16zL20vMDVkNDk'
    expect(parseLatLngFromMapsUrl(url)).toEqual({ lat: -1.2920659, lng: 36.8219462 })
  })

  it('parses the viewport (@lat,lng) form', () => {
    expect(parseLatLngFromMapsUrl('https://www.google.com/maps/@-2.153,34.685,9z')).toEqual({ lat: -2.153, lng: 34.685 })
  })

  it('parses q=lat,lng search links', () => {
    expect(parseLatLngFromMapsUrl('https://maps.google.com/?q=-1.406,36.9605')).toEqual({ lat: -1.406, lng: 36.9605 })
  })

  it('parses api=1 query=lat,lng links (with encoded comma)', () => {
    expect(parseLatLngFromMapsUrl('https://www.google.com/maps/search/?api=1&query=-3.0674%2C37.3556')).toEqual({ lat: -3.0674, lng: 37.3556 })
  })

  it('returns null for name-only search links', () => {
    expect(parseLatLngFromMapsUrl('https://www.google.com/maps/search/?api=1&query=Maasai%20Mara')).toBeNull()
  })

  it('returns null for empty input and out-of-range coordinates', () => {
    expect(parseLatLngFromMapsUrl('')).toBeNull()
    expect(parseLatLngFromMapsUrl(null)).toBeNull()
    expect(parseLatLngFromMapsUrl('https://www.google.com/maps/@-91.5,36.8,9z')).toBeNull()
  })
})

describe('googleMapsLinkFor', () => {
  it('prefers the stored URL over the place id', () => {
    expect(googleMapsLinkFor({ google_maps_url: 'https://maps.google.com/x', google_place_id: 'abc' }))
      .toBe('https://maps.google.com/x')
  })

  it('builds a place_id link when only the id is stored', () => {
    expect(googleMapsLinkFor({ google_maps_url: null, google_place_id: 'ChIJx' }))
      .toBe('https://www.google.com/maps/place/?q=place_id:ChIJx')
  })

  it('returns null when nothing is stored', () => {
    expect(googleMapsLinkFor({ google_maps_url: null, google_place_id: null })).toBeNull()
    expect(googleMapsLinkFor(null)).toBeNull()
  })
})

describe('computeRoadKm', () => {
  const a = { lat: -1.2921, lng: 36.8219 }
  const b = { lat: -0.7167, lng: 36.431 }

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns null without an API key (falls back to straight line)', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '')
    vi.stubEnv('GOOGLE_MAPS_API_KEY', '')
    expect(await computeRoadKm(a, b)).toBeNull()
  })

  it('converts distanceMeters to km, and caches per coordinate pair', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [{ distanceMeters: 91_500 }] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    expect(await computeRoadKm(a, b)).toBeCloseTo(91.5)
    expect(await computeRoadKm(a, b)).toBeCloseTo(91.5)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns null on an HTTP failure instead of throwing', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    // Different pair from the cached one above.
    expect(await computeRoadKm(a, { lat: -4.0435, lng: 39.6682 })).toBeNull()
  })
})

describe('haversineKm', () => {
  const nairobi = { lat: -1.2921, lng: 36.8219 }
  const mombasa = { lat: -4.0435, lng: 39.6682 }

  it('matches the known Nairobi–Mombasa straight-line distance (~440 km)', () => {
    const km = haversineKm(nairobi, mombasa)
    expect(km).toBeGreaterThan(430)
    expect(km).toBeLessThan(455)
  })

  it('is zero for identical points and symmetric', () => {
    expect(haversineKm(nairobi, nairobi)).toBe(0)
    expect(haversineKm(nairobi, mombasa)).toBeCloseTo(haversineKm(mombasa, nairobi), 9)
  })
})

describe('mercatorPx / fitZoom', () => {
  it('projects the null island to the centre of the world map', () => {
    const { x, y } = mercatorPx({ lat: 0, lng: 0 }, 0)
    expect(x).toBeCloseTo(128)
    expect(y).toBeCloseTo(128)
  })

  it('picks a zoom that fits all points inside the frame', () => {
    const pts = [
      { lat: -1.2921, lng: 36.8219 }, // Nairobi
      { lat: -0.7167, lng: 36.4310 }, // Naivasha
      { lat: -1.4061, lng: 35.0117 }, // Maasai Mara
    ]
    const z = fitZoom(pts, 640, 400)
    const xs = pts.map(p => mercatorPx(p, z).x)
    const ys = pts.map(p => mercatorPx(p, z).y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(640 - 96)
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(400 - 96)
    expect(z).toBeGreaterThanOrEqual(2)
    expect(z).toBeLessThanOrEqual(12)
  })
})
