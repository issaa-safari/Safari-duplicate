import { describe, expect, it } from 'vitest'
import {
  countByGroup,
  QUOTE_GROUPS,
  REQUEST_GROUPS,
  resolveStatusFilter,
} from './status-groups'
import { STAGE_LABELS, STATUS_VARIANT } from './status-colors'

describe('the groups themselves', () => {
  it('covers every request stage exactly once', () => {
    const grouped = REQUEST_GROUPS.flatMap((g) => g.statuses)
    expect(new Set(grouped).size).toBe(grouped.length) // no stage in two buckets
    expect([...grouped].sort()).toEqual(Object.keys(STAGE_LABELS).sort())
  })

  it('covers every quote status exactly once', () => {
    // Guards the case that would silently hide rows: a status the database can
    // hold that no bucket claims.
    const quoteStatuses = [
      'draft', 'ready', 'sent', 'viewed', 'accepted',
      'declined', 'expired', 'cancelled', 'superseded',
    ]
    const grouped = QUOTE_GROUPS.flatMap((g) => g.statuses)
    expect(new Set(grouped).size).toBe(grouped.length)
    expect([...grouped].sort()).toEqual([...quoteStatuses].sort())
  })

  it('gives every grouped status a colour, so no badge falls back to grey', () => {
    for (const status of [...REQUEST_GROUPS, ...QUOTE_GROUPS].flatMap((g) => g.statuses)) {
      expect(STATUS_VARIANT[status]).toBeDefined()
    }
  })

  it('leads with All on both', () => {
    expect(REQUEST_GROUPS[0].key).toBe('all')
    expect(QUOTE_GROUPS[0].key).toBe('all')
  })
})

describe('resolveStatusFilter', () => {
  it('defaults to All, filtering nothing', () => {
    expect(resolveStatusFilter(REQUEST_GROUPS, undefined))
      .toEqual({ groupKey: 'all', statuses: null, exactStatus: null })
    expect(resolveStatusFilter(REQUEST_GROUPS, null).groupKey).toBe('all')
    expect(resolveStatusFilter(REQUEST_GROUPS, '').groupKey).toBe('all')
  })

  it('expands a group key to its statuses', () => {
    expect(resolveStatusFilter(REQUEST_GROUPS, 'active')).toEqual({
      groupKey: 'active',
      statuses: ['new', 'working_on', 'open', 'pre_booked'],
      exactStatus: null,
    })
  })

  it('narrows to a single status when the link named one', () => {
    // The dashboard and insights screens link with raw stages; those drill-downs
    // have to keep working, and showing the whole group instead would quietly
    // answer a different question than the one clicked.
    expect(resolveStatusFilter(REQUEST_GROUPS, 'working_on')).toEqual({
      groupKey: 'active',
      statuses: ['working_on'],
      exactStatus: 'working_on',
    })
    expect(resolveStatusFilter(QUOTE_GROUPS, 'viewed')).toEqual({
      groupKey: 'with_client',
      statuses: ['viewed'],
      exactStatus: 'viewed',
    })
  })

  it('prefers the group when a name is both, since the set is the same', () => {
    expect(resolveStatusFilter(REQUEST_GROUPS, 'booked')).toEqual({
      groupKey: 'booked',
      statuses: ['booked'],
      exactStatus: null,
    })
  })

  it('falls back to All rather than showing an empty list for a bad param', () => {
    expect(resolveStatusFilter(QUOTE_GROUPS, 'nonsense').groupKey).toBe('all')
    expect(resolveStatusFilter(QUOTE_GROUPS, 'nonsense').statuses).toBeNull()
  })

  it('tolerates surrounding whitespace', () => {
    expect(resolveStatusFilter(QUOTE_GROUPS, '  accepted  ').groupKey).toBe('accepted')
  })
})

describe('countByGroup', () => {
  const requests = [
    { stage: 'booked' }, { stage: 'booked' }, { stage: 'open' },
    { stage: 'new' }, { stage: 'completed' },
  ]

  it('counts each bucket, with All as the total', () => {
    expect(countByGroup(REQUEST_GROUPS, requests)).toEqual({
      all: 5, active: 2, booked: 2, closed: 1,
    })
  })

  it('reads a status field just as happily as a stage field', () => {
    expect(countByGroup(QUOTE_GROUPS, [{ status: 'draft' }, { status: 'ready' }, { status: 'sent' }]))
      .toEqual({ all: 3, draft: 2, with_client: 1, accepted: 0, closed: 0 })
  })

  it('counts an unknown status into All only, never into a bucket', () => {
    const counts = countByGroup(QUOTE_GROUPS, [{ status: 'something_new' }])
    expect(counts.all).toBe(1)
    expect(counts.draft + counts.with_client + counts.accepted + counts.closed).toBe(0)
  })

  it('handles an empty list', () => {
    expect(countByGroup(REQUEST_GROUPS, [])).toEqual({ all: 0, active: 0, booked: 0, closed: 0 })
  })
})
