import { describe, expect, it } from 'vitest'
import { departureBookHref } from './departure-booking-link'

const base = {
  departureId: 'dep-1',
  locale: 'en' as const,
  tourTitle: 'Kenya Bike Tour',
}

describe('departureBookHref', () => {
  it('carries sharing price, single price, and deposit when all three exist', () => {
    const href = departureBookHref({ ...base, priceUsd: 1890, priceSingleUsd: 2150, depositUsd: 300 })
    expect(href).toBe('/departures/dep-1/book?price=1890&priceSingle=2150&deposit=300&tour=Kenya%20Bike%20Tour')
  })

  it('omits the deposit param when there is no deposit, rather than emitting deposit=0 or deposit=null', () => {
    const href = departureBookHref({ ...base, priceUsd: 1890, priceSingleUsd: null, depositUsd: null })
    expect(href).toBe('/departures/dep-1/book?price=1890&tour=Kenya%20Bike%20Tour')
  })

  it('omits the sharing price when the departure only sells single rooms', () => {
    const href = departureBookHref({ ...base, priceUsd: null, priceSingleUsd: 2150, depositUsd: undefined })
    expect(href).toBe('/departures/dep-1/book?priceSingle=2150&tour=Kenya%20Bike%20Tour')
  })

  it('routes through the /ar prefix for the Arabic locale', () => {
    const href = departureBookHref({ ...base, locale: 'ar', priceUsd: 1890, priceSingleUsd: null, depositUsd: null })
    expect(href).toBe('/ar/departures/dep-1/book?price=1890&tour=Kenya%20Bike%20Tour')
  })
})
