// Pure, testable predicates behind the daily request-automation cron
// (`app/api/cron/daily-automation/route.ts`). Kept side-effect free so the
// boundary conditions can be unit-tested without a database.

export interface AutomationSettings {
  auto_complete_on_end_date: boolean
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
