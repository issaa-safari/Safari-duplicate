# Schema drift: migrations vs production

**Status: resolved 2026-08-06.** A replay of `migrations/group_*.sql` now
reconstructs the live Supabase project (`oejlkzcoynijqtokbizz`) exactly. This
document is kept as the record of what was wrong and how it was closed — the
same failure mode can recur the moment SQL is applied by hand again.

## Verification

Both sides fingerprinted after the fixes below:

| kind        | production | replay of `group_*.sql` | match |
|-------------|-----------:|------------------------:|:-----:|
| tables      |         65 |                      65 |  yes  |
| columns     |        770 |                     770 |  yes  |
| indexes     |        155 |                     155 |  yes  |
| constraints |        yes |                     yes |  yes  |
| policies    |         15 |                      15 |  yes  |
| functions   |         15 |                      15 |  yes  |
| triggers    |         44 |                      44 |  yes  |

Identical md5 over the sorted object names in every category, not just equal
counts. Functions and triggers were counted before `group_71` landed; see below.

### `group_71` — applied 2026-08-06

Applied after the table above was taken, bringing production to 18 functions and
45 triggers. Production already had a slug on all 19 tours but none of the three
functions and not the trigger, so the values had been filled by hand and nothing
was maintaining them: a tour created through the admin would have been saved with
a null slug and served at its UUID.

Verified after applying, in a transaction aborted on purpose so no rows survived:
a new tour got `trigger-probe-kenya-safari`, a second one with the same title got
`trigger-probe-kenya-safari-2`, and a title with no latin characters got `null` —
which the route handles by falling back to the UUID.

### `group_73` / `group_74` — not yet applied to production

`group_73` adds `trip_payments`, one ledger for money received against either
kind of trip. `group_74` adds the `services` catalogue and `trip_services`.
The baseline was regenerated with both (68 tables, 167 indexes) and verified to
load into an empty database in a single pass.

Two things were stripped from the regenerated dump, and should be stripped again
next time: a bare `CREATE SCHEMA public` (it collides with the schema Supabase
already provides — patched back to `IF NOT EXISTS`) along with its
`COMMENT ON SCHEMA`, which needs an ownership the migration role does not have;
and pg_dump's `\restrict` / `\unrestrict` session guards, which older psql builds
reject outright and which no earlier baseline carried.

`scripts/rebase-baseline.py` does the regeneration and asserts both patches
landed, so the next person does not have to remember them.

Re-check the fingerprint after applying, using the query at the end of this file.

## What was wrong

Found by loading every `group_*.sql` into a clean Postgres 16 and diffing
against the live database.

### A. Three migrations had never been applied — *fixed*

| migration | what was missing from production |
|---|---|
| `group_44_client_data_quality` | `clients_email_unique_idx` — the partial unique index stopping two clients sharing an email. Its own header calls this a P0 fix. |
| `group_45_drop_duplicate_booking_travelers` | `booking_travelers` (American spelling, empty stub) was still present |
| `group_57_activity_locations` | `activity_locations` and its 4 indexes did not exist |

All three applied to production on 2026-08-06 after re-checking preconditions
immediately beforehand: 0 duplicate client emails, 0 rows and 0 inbound foreign
keys on `booking_travelers`. `booking_travellers` (the real table, 20 rows) was
untouched.

### B. Twelve columns existed only in production — *captured*

| table | columns |
|---|---|
| `company_settings`  | `prebooked_enabled` |
| `quote_day_items`   | `is_alternative`, `nights` |
| `quote_days`        | `day_end` |
| `quote_deliveries`  | `message`, `sender_email`, `subject` |
| `quote_versions`    | `arrival_notes`, `departure_notes`, `preview_layout`, `preview_theme` |
| `requests`          | `handled_by` |

Plus two constraints that came with them: `quote_day_items_nights_check` and
`requests_handled_by_fkey`.

### C. Two trigger functions existed only in production — *captured*

`auto_advance_request_stage` (moves a request along its pipeline when a quote
version is sent or viewed) and `log_request_stage_change` (writes a note to the
communication log on every stage change), along with the triggers that fire
them.

B and C are now `group_72_capture_undocumented_production_objects.sql`,
transcribed from production via `pg_get_functiondef` / `pg_get_triggerdef` /
`pg_attribute`. It is idempotent, so applying it to production is a no-op — its
purpose is to make a *rebuilt* database match.

**This was the dangerous category.** A database rebuilt from `migrations/` was
missing all fourteen objects, silently, because nothing in the repo recorded
that they should exist.

## The separate problem: ordering

`migrations/` also could not be replayed in a single pass — 21 of the groups
reference tables a *later* group creates (`group_12` uses `departures`, added in
`group_21`). Every one succeeds on a second pass, so nothing was missing, but
"run these in order and get the schema" did not hold.

That is what `migrations/baseline/` exists for: prerequisites plus a
consolidated schema that loads in one pass. See `scripts/dev-backend.md` for
loading and regenerating it.

Two groups are also not re-runnable: `group_30` and `group_31` use bare
`create policy`, which errors if the policy already exists.

## Keeping it this way

The drift happened because SQL was applied through the Supabase SQL editor and
never written back. To avoid a repeat:

- Schema changes go in a new `group_NN` **first**, then get applied.
- Regenerate `migrations/baseline/` whenever a group lands.
- To re-check at any time, fingerprint both sides and compare:

```sql
select kind, count(*), md5(string_agg(name, ',' order by name)) from (
  select 'table' kind, tablename::text name from pg_tables where schemaname='public'
  union all select 'index', indexname::text from pg_indexes where schemaname='public'
  union all select 'policy', (tablename||'.'||policyname)::text from pg_policies where schemaname='public'
  union all select 'column', (table_name||'.'||column_name)::text from information_schema.columns where table_schema='public'
) f group by kind order by kind;
```
