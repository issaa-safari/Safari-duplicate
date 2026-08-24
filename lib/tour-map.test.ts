import { describe, expect, it } from 'vitest'
import { buildTourMap } from './tour-map'

describe('buildTourMap', () => {
  it('shows a multi-day range on the route-map stop', () => {
    const result = buildTourMap(
      [
        { id: 'day-1', day_number: 1, destination_id: 'a', distance_km: null, road_distance_km: null },
        { id: 'day-5', day_number: 5, day_number_end: 6, destination_id: 'b', distance_km: null, road_distance_km: null },
      ],
      { a: { lat: -1.286, lng: 36.817 }, b: { lat: -0.303, lng: 36.08 } },
      { a: 'Nairobi', b: 'Nakuru' },
    )

    expect(result.mapStops.map(stop => stop.label)).toEqual(['1', '5–6'])
  })
})
