import { describe, expect, it } from 'vitest'
import { isUuid, tourSegment } from './slug'

describe('isUuid', () => {
  it('recognises the ids tours actually use', () => {
    expect(isUuid('0dc49e70-e7ae-47d8-8a37-17ba0e35aa17')).toBe(true)
    expect(isUuid('AAAA1111-0000-4000-8000-000000000006')).toBe(true)
  })

  it('rejects slugs, so they are never matched against the id column', () => {
    // Querying `id` with a non-UUID string is a Postgres type error rather than
    // an empty result, which is the whole reason this guard exists.
    expect(isUuid('masai-mara-explorer')).toBe(false)
    expect(isUuid('7-day-serengeti')).toBe(false)
    expect(isUuid('')).toBe(false)
  })

  it('rejects a UUID with extra characters around it', () => {
    expect(isUuid(' 0dc49e70-e7ae-47d8-8a37-17ba0e35aa17')).toBe(false)
    expect(isUuid('0dc49e70-e7ae-47d8-8a37-17ba0e35aa17-extra')).toBe(false)
  })
})

describe('tourSegment', () => {
  it('prefers the slug', () => {
    expect(tourSegment({ slug: 'masai-mara-explorer', id: 'abc' })).toBe('masai-mara-explorer')
  })

  it('falls back to the id when there is no slug', () => {
    // A title with no latin characters slugifies to NULL in the migration, so
    // the route has to stay reachable by id.
    expect(tourSegment({ slug: null, id: 'abc' })).toBe('abc')
    expect(tourSegment({ id: 'abc' })).toBe('abc')
    expect(tourSegment({ slug: '   ', id: 'abc' })).toBe('abc')
  })
})
