// Grouping the pipeline statuses into the handful of buckets an operator
// actually navigates by.
//
// Requests carry 8 stages and quotes 8 statuses, and the lists gave each one a
// tab — 16 tabs, of which 9 have never held a row. Worse, three of the request
// stages are not decisions at all: a trigger moves a request `new → working_on`
// when a quote version is created and `→ open` when one is sent or viewed, so
// three tabs described one thing ("a quote is in progress").
//
// Nothing here changes what the database stores. The exact status still rides on
// every row as its badge, and a link carrying a raw status still resolves — see
// `resolveStatusFilter`, which keeps the drill-downs on the dashboard and
// insights screens working. This is only how the list is grouped.

export interface StatusGroup {
  key: string
  label: string
  /** Empty means "everything" — the All tab applies no filter. */
  statuses: string[]
  /** Shown on the empty state, so a bucket explains itself. */
  blurb?: string
}

export const ALL_GROUP: StatusGroup = {
  key: 'all',
  label: 'All',
  statuses: [],
}

export const REQUEST_GROUPS: StatusGroup[] = [
  ALL_GROUP,
  {
    key: 'active',
    label: 'Active',
    statuses: ['new', 'working_on', 'open', 'pre_booked'],
    blurb: 'Enquiries still being worked — from the moment one arrives to the moment it is booked.',
  },
  {
    key: 'booked',
    label: 'Booked',
    statuses: ['booked'],
    blurb: 'Won, and the trip is still ahead.',
  },
  {
    key: 'closed',
    label: 'Closed',
    statuses: ['completed', 'not_booked', 'archived'],
    blurb: 'Finished, lost or filed away — nothing here needs work.',
  },
]

export const QUOTE_GROUPS: StatusGroup[] = [
  ALL_GROUP,
  {
    key: 'draft',
    label: 'Draft',
    statuses: ['draft', 'ready'],
    blurb: 'Being built, or built and not yet sent.',
  },
  {
    key: 'with_client',
    label: 'With client',
    statuses: ['sent', 'viewed'],
    blurb: 'Sent, and waiting on the client to decide.',
  },
  {
    key: 'accepted',
    label: 'Accepted',
    statuses: ['accepted'],
    blurb: 'Agreed. These are the ones that become trips.',
  },
  {
    key: 'closed',
    label: 'Closed',
    statuses: ['declined', 'expired', 'cancelled', 'superseded'],
    blurb: 'Turned down, run out of time, or replaced by a newer version.',
  },
]

export interface ResolvedFilter {
  /** The tab to highlight. */
  groupKey: string
  /** Statuses to filter on; null means no filter at all (the All tab). */
  statuses: string[] | null
  /**
   * Set only when the URL named a single status rather than a group — a
   * drill-down from the dashboard or insights. The list narrows to it and says
   * so, rather than silently showing the whole group.
   */
  exactStatus: string | null
}

/**
 * Turn a `?stage=` / `?status=` parameter into what to query and which tab to
 * light up.
 *
 * Three shapes are accepted, in this order:
 *   - a group key   (`active`)      → the whole group
 *   - a raw status  (`working_on`)  → just that status, with its group active
 *   - anything else, including absent → All
 *
 * The raw-status case is what keeps existing links working. `booked` is both a
 * group key and a status and resolves as the group, which is the same set.
 */
export function resolveStatusFilter(
  groups: StatusGroup[],
  param: string | null | undefined
): ResolvedFilter {
  const value = (param ?? '').trim()

  if (value) {
    const group = groups.find((g) => g.key === value)
    if (group) {
      return {
        groupKey: group.key,
        statuses: group.statuses.length > 0 ? group.statuses : null,
        exactStatus: null,
      }
    }

    const owner = groups.find((g) => g.statuses.includes(value))
    if (owner) {
      return { groupKey: owner.key, statuses: [value], exactStatus: value }
    }
  }

  return { groupKey: ALL_GROUP.key, statuses: null, exactStatus: null }
}

/** Rows in each group, for the tab counts. */
export function countByGroup(
  groups: StatusGroup[],
  rows: { status?: string | null; stage?: string | null }[]
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const group of groups) {
    counts[group.key] = group.statuses.length === 0
      ? rows.length
      : rows.filter((r) => group.statuses.includes((r.status ?? r.stage ?? '') as string)).length
  }
  return counts
}
