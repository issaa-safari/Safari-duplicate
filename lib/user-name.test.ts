import { describe, it, expect } from 'vitest'
import { deriveName } from './user-name'

describe('deriveName', () => {
  it('uses explicit first_name/last_name (email/password sign-up)', () => {
    expect(deriveName({ first_name: 'Ada', last_name: 'Lovelace' }))
      .toEqual({ firstName: 'Ada', lastName: 'Lovelace' })
  })

  it('falls back to Google given_name/family_name', () => {
    expect(deriveName({ given_name: 'Grace', family_name: 'Hopper' }))
      .toEqual({ firstName: 'Grace', lastName: 'Hopper' })
  })

  it('prefers explicit keys over Google claims when both exist', () => {
    expect(deriveName({ first_name: 'Ada', given_name: 'Augusta' }))
      .toEqual({ firstName: 'Ada', lastName: '' })
  })

  it('splits a combined full_name when no split keys are present', () => {
    expect(deriveName({ full_name: 'Katherine Johnson' }))
      .toEqual({ firstName: 'Katherine', lastName: 'Johnson' })
  })

  it('splits name and keeps multi-word surnames intact', () => {
    expect(deriveName({ name: 'Mary Jackson Smith' }))
      .toEqual({ firstName: 'Mary', lastName: 'Jackson Smith' })
  })

  it('trims surrounding whitespace', () => {
    expect(deriveName({ first_name: '  Ada  ', last_name: '  Lovelace ' }))
      .toEqual({ firstName: 'Ada', lastName: 'Lovelace' })
  })

  it('returns empty strings for missing or null metadata', () => {
    expect(deriveName(null)).toEqual({ firstName: '', lastName: '' })
    expect(deriveName(undefined)).toEqual({ firstName: '', lastName: '' })
    expect(deriveName({})).toEqual({ firstName: '', lastName: '' })
  })

  it('ignores non-string metadata values', () => {
    expect(deriveName({ first_name: 123, full_name: 'Dorothy Vaughan' }))
      .toEqual({ firstName: 'Dorothy', lastName: 'Vaughan' })
  })
})
