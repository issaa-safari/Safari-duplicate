# Schema drift: migrations vs production

**Current production checkpoint: 2026-08-24, through `group_104`.** Groups 103
and 104 were written first, dry-run in rolled-back production transactions,
then applied. The consolidated baseline contains both groups, live-generated TypeScript
types were refreshed, and the live object fingerprint is: 79 tables
(`ed46fef45d510b8c294580c462b531aa`), 992 columns
(`38c203db9d4904067d5e748ec40a9d8e`), 259 indexes
(`f4c8ae4a31bbb19042a16433243ca745`) and 23 policies
(`9409f7fa28ba3a6654f8e8d873b0880d`). A clean baseline replay was not available
in this workspace, so these production fingerprints must still be compared
against a fresh replay before calling the latest checkpoint an exact match.

**Earlier exact replay checkpoint: resolved 2026-08-08, through `group_77`.**
At that point `migrations/baseline/` reconstructed the live Supabase project
exactly — same counts *and* same md5 on tables, columns, indexes and policies:
69 tables, 840 columns, 210 indexes, 17 policies.

It was previously marked resolved on 2026-08-06, and that was wrong. That check
compared a replay of the group files on tables, columns, indexes, constraints,
policies, functions and triggers, and reported a match. Two days later the
baseline was 33 indexes short of production and production was 26 short of the
baseline. Read the 2026-08-08 section below before trusting any "resolved" line
in this file, including this one: re-run the fingerprint query at the end.

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

### 2026-08-08 — the drift had not been resolved, and why

Found by fingerprinting production against a database built from
`migrations/baseline/`, while regenerating the baseline for `group_73`:

| | |
|---|---|
| indexes in production that **no migration file described** | 33 |
| indexes **defined by a group file but absent from production** | 26 |
| policies in production that no migration described | 1 |

The 33 were all named `idx_<table>_<column>_id` — 32 of the 33 end in `_id`, and
grepping every file in `migrations/` for each name returned nothing. The 26 span
15 groups from `group_10` to `group_70`, and `git log -S` shows each index line
has been in its file since that file was first committed, so this was not files
changing after the fact.

**The cause: Supabase's Performance Advisor, applied in the dashboard and never
written back** — precisely what this document was written to prevent. The loop
was still running in both directions when it was found. `get_advisors` reported
six `unindexed_foreign_keys` warnings, every one naming an index a group file
already defined and production was missing:

| advisor warning | index that satisfies it |
|---|---|
| `quotes_client_id_fkey` | `quotes_client_idx` (group_12) |
| `booking_travellers_motorbike_id_fkey` | `idx_booking_travellers_motorbike_id` (group_66) |
| `hotel_vouchers_accommodation_id_fkey` | `idx_hotel_vouchers_accommodation_id` (group_69) |
| `supplier_payments_supplier_id_fkey` | `supplier_payments_supplier_idx` (group_33) |
| `supplier_rate_cards_supplier_id_fkey` | `supplier_rate_cards_supplier_idx` (group_33) |
| `traveller_agreements_departure_id_fkey` | `traveller_agreements_departure_idx` (group_66) |

…while simultaneously advising that most of the 33 be dropped as unused. So the
dashboard had added a set of foreign-key indexes under one piece of advice and
was recommending their removal under another, while the 26 the repo specifies
never existed. `quotes.client_id` had no index at all.

`group_75_reconcile_indexes.sql` closes both directions: section A captures the
33 (transcribed from `pg_indexes.indexdef`, not guessed), section B creates the
26 (copied from the group that declares each, with a comment naming it), and
section C captures the stray policy — a public `select ... using (true)` on
`activity_locations`, a join table holding only foreign keys and a bilingual
label, which the public site needs to render where an activity happens.

Both sides now hold 200 indexes and 17 policies, with matching md5s, and the six
foreign-key warnings are gone.

**Leave the `unused_index` notices alone.** On a dataset this size "unused"
mostly means "little traffic", and dropping a foreign-key index makes deleting a
parent row scan the whole child table. Acting on them is what caused this.

### `group_73` / `group_74` — applied to production 2026-08-08

`group_73` adds `trip_payments`, one ledger for money received against either
kind of trip. `group_74` adds the `services` catalogue and `trip_services`. Both
are applied; the ledger backfill reconciled exactly (1 row expected, 1 migrated).

Two things were stripped from the regenerated dump, and should be stripped again
next time: a bare `CREATE SCHEMA public` (it collides with the schema Supabase
already provides — patched back to `IF NOT EXISTS`) along with its
`COMMENT ON SCHEMA`, which needs an ownership the migration role does not have;
and pg_dump's `\restrict` / `\unrestrict` session guards, which older psql builds
reject outright and which no earlier baseline carried.

`scripts/rebase-baseline.py` does the regeneration and asserts both patches
landed, so the next person does not have to remember them.

Re-check the fingerprint after applying, using the query at the end of this file.

### `group_76` / `group_77` — applied to production 2026-08-08

`group_76` fills in the two-column `invoices` stub group_00 left behind and adds
`invoice_lines`; see `docs/current/accounting.md` for the model. `group_77` is
its advisor follow-up, and is the first one to go into a group file *before*
being applied, which is the rule this document exists to establish.

**What the advisor caught, and why it mattered.** Postgres grants EXECUTE on a
new function to PUBLIC, and Supabase publishes every `public`-schema function at
`/rest/v1/rpc/<name>`. So all six functions `group_76` created were callable by
an unauthenticated visitor. Five are trigger functions and would only have
raised "can only be called as triggers" — noise. `next_invoice_number()` is not:
no arguments, and every call does `nextval`. Anyone could have advanced the
sequence at will and left permanent gaps in the invoice numbering.

`group_77` revokes EXECUTE from `public`, `anon` and `authenticated`, keeping
`service_role`. SECURITY DEFINER stays — it is what lets these read
`company_settings` and `invoices`, both service-role-only under RLS — and the
revoke does not affect trigger firing, because Postgres checks EXECUTE when a
trigger is *created*, not each time it fires. That was verified after applying,
in a transaction aborted on purpose so no rows survived: numbering, the total
sync trigger and the issued-invoice freeze all still work.

`is_admin_user()` carries the same warning and was deliberately left alone — it
predates this work and RLS policies across the schema depend on it.

Two `rls_enabled_no_policy` INFO notices now name `invoices` and `invoice_lines`.
That is the intended shape: every finance table is service-role-only with no
policies, per group_31 category 2. Leave them.

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
- **Advisor suggestions are schema changes.** Accepting one in the Supabase
  dashboard — "add this index", "drop this unused index" — is what produced the
  2026-08-08 drift. Put it in a `group_NN` and apply it from there.
- Regenerate `migrations/baseline/` whenever a group lands, with
  `scripts/rebase-baseline.py`, which re-applies the two hand-patches the dump
  needs and asserts they landed.
- Compare the **md5**, not just the count. A same-count/different-name drift is
  invisible to a count, and that is part of how this hid.
- To re-check at any time, fingerprint both sides and compare:

```sql
select kind, count(*), md5(string_agg(name, ',' order by name)) from (
  select 'table' kind, tablename::text name from pg_tables where schemaname='public'
  union all select 'index', indexname::text from pg_indexes where schemaname='public'
  union all select 'policy', (tablename||'.'||policyname)::text from pg_policies where schemaname='public'
  union all select 'column', (table_name||'.'||column_name)::text from information_schema.columns where table_schema='public'
) f group by kind order by kind;
```
