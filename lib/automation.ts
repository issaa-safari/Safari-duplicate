// Pure, testable predicates behind the daily request-automation cron
// (`app/api/cron/daily-automation/route.ts`). Kept side-effect free so the
// boundary conditions can be unit-tested without a database.

export interface AutomationSettings {
  auto_complete_on_end_date: boolean
  auto_expire_quotes: boolean
  auto_archive_enabled: boolean
  auto_archive_days: number
  auto_archive_stages: string[]
  auto_delete_enabled: boolean
  auto_delete_days: number
}

/** Whole days elapsed from `from` up to `now` (floored, never negative). */
export function daysBetween(from: Date | string, now: Date | string): number {
  const a = new Date(from).getTime()
  const b = new Date(now).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.max(0, Math.floor((b - a) / 86_400_000))
}

/** A booked trip is complete once its travel end date is strictly before today. */
export function shouldComplete(travelEndDate: string | null | undefined, now: Date | string): boolean {
  if (!travelEndDate) return false
  // Compare on date only (ignore time-of-day) so a trip ending "today" is not
  // marked complete until the day has fully passed.
  const end = new Date(travelEndDate)
  const today = new Date(now)
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  const nowDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return endDay < nowDay
}

/** A request should archive when it has sat in a sweepable stage past the threshold. */
export function shouldArchive(
  stage: string,
  statusChangedAt: string | null | undefined,
  settings: Pick<AutomationSettings, 'auto_archive_enabled' | 'auto_archive_days' | 'auto_archive_stages'>,
  now: Date | string,
): boolean {
  if (!settings.auto_archive_enabled) return false
  if (stage === 'archived') return false
  if (!settings.auto_archive_stages.includes(stage)) return false
  if (!statusChangedAt) return false
  return daysBetween(statusChangedAt, now) >= settings.auto_archive_days
}

/** An archived request should be purged once it has been archived past the threshold. */
export function shouldDelete(
  archivedAt: string | null | undefined,
  settings: Pick<AutomationSettings, 'auto_delete_enabled' | 'auto_delete_days'>,
  now: Date | string,
): boolean {
  if (!settings.auto_delete_enabled) return false
  if (!archivedAt) return false
  return daysBetween(archivedAt, now) >= settings.auto_delete_days
}

/**
 * A quote version is expired once the date on it has passed — but only if it
 * was actually out with the client.
 *
 * A draft or a built-but-unsent quote is not expired, it is unsent; saying
 * otherwise would put work-in-progress into the Closed bucket. A decided one
 * (accepted, declined) keeps its outcome: the date passing does not un-accept a
 * quote. Superseded already lost to a newer version.
 */
export function shouldExpireQuote(
  status: string,
  validUntil: string | null | undefined,
  settings: Pick<AutomationSettings, 'auto_expire_quotes'>,
  now: Date | string,
): boolean {
  if (!settings.auto_expire_quotes) return false
  if (status !== 'sent' && status !== 'viewed') return false
  if (!validUntil) return false

  // Date-only comparison, like shouldComplete: a quote valid *until* today is
  // still valid today.
  const until = new Date(validUntil)
  const today = new Date(now)
  if (Number.isNaN(until.getTime())) return false

  const untilDay = Date.UTC(until.getUTCFullYear(), until.getUTCMonth(), until.getUTCDate())
  const nowDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return untilDay < nowDay
}

/**
 * A viewed proposal deserves a next-day follow-up; a sent-but-unviewed one
 * gets two days. Returned as a date-only value because tasks.due_date is a
 * PostgreSQL date rather than a timestamp.
 */
export function proposalFollowUpDueDate(
  status: string,
  referenceDate: Date | string,
): string | null {
  const days = status === 'viewed' ? 1 : status === 'sent' ? 2 : null
  if (days === null) return null

  const reference = new Date(referenceDate)
  if (Number.isNaN(reference.getTime())) return null
  reference.setUTCDate(reference.getUTCDate() + days)
  return reference.toISOString().slice(0, 10)
}
