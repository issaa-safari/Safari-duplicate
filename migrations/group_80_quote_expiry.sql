-- Group 80: expire quotes that have passed their valid_until, and retire a
-- status nothing could ever set
--
-- Three findings from auditing which pipeline statuses have a write path:
--
--   * `expired` was never set by anything. Meanwhile every quote version in
--     production carries a valid_until and more than half are already past it —
--     the column described a state the app could not reach. The daily cron now
--     sets it, behind a switch like every other automation in that job.
--
--   * `cancelled` on a quote had no writer either, and no data. Unlike expired
--     there is no feature behind it: nothing in the app cancels a quote, it
--     declines or supersedes one. It comes out of the allowed set. (`cancelled`
--     stays on bookings, departures, payments and vouchers, which do use it.)
--
--   * `superseded` was missing from quotes_status_check but present on
--     quote_versions, and syncQuoteStatus copies the winning version's status up
--     to the quote. A quote whose only versions were superseded would have
--     failed the constraint. Adding it makes the parent accept what the child
--     can produce.
--
-- Both constraints are rewritten rather than widened in place, because dropping
-- a value is the point. Verified zero rows use `cancelled` before doing so — the
-- DO block below re-checks at apply time and refuses rather than corrupting.
--
-- Idempotent — safe to re-run. Run after group_79.

-- ── The expiry switch ───────────────────────────────────────────────────────
--
-- Defaults true: a quote past the date its own author set on it is expired,
-- and leaving that unsaid is what this file exists to fix. Turn it off in
-- Settings → Request Automation if you would rather chase them by hand.

alter table company_settings add column if not exists auto_expire_quotes boolean not null default true;

comment on column company_settings.auto_expire_quotes is
  'Daily cron marks sent/viewed quote versions expired once valid_until has passed. See shouldExpireQuote in lib/automation.ts.';

-- ── Retire `cancelled`, admit `superseded` ──────────────────────────────────

do $$
declare
  v_quotes bigint;
  v_versions bigint;
begin
  select count(*) into v_quotes   from quotes         where status = 'cancelled';
  select count(*) into v_versions from quote_versions where status = 'cancelled';

  if v_quotes > 0 or v_versions > 0 then
    raise exception
      'Refusing to drop the cancelled status: % quote(s) and % version(s) still use it. Move them to declined or superseded first.',
      v_quotes, v_versions;
  end if;
end $$;

alter table quotes drop constraint if exists quotes_status_check;
alter table quotes add constraint quotes_status_check
  check (status = any (array[
    'draft', 'ready', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'superseded'
  ]));

alter table quote_versions drop constraint if exists quote_versions_status_check;
alter table quote_versions add constraint quote_versions_status_check
  check (status = any (array[
    'draft', 'ready', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'superseded'
  ]));
