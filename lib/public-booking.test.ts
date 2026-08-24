import { describe, expect, it } from 'vitest'
import { buildLeadOnlyTravellerRoster } from './public-booking'

const lead = { firstName: 'Issa', lastName: 'Client', email: 'client@example.com', phone: '+254700000000' }

describe('buildLeadOnlyTravellerRoster', () => {
  it('keeps personal details only on the lead row', () => {
    expect(buildLeadOnlyTravellerRoster(lead, 3)).toEqual([lead, {}, {}])
  })

  it('always creates at least one and at most fifty roster rows', () => {
    expect(buildLeadOnlyTravellerRoster(lead, 0)).toHaveLength(1)
    expect(buildLeadOnlyTravellerRoster(lead, 80)).toHaveLength(50)
  })
})
