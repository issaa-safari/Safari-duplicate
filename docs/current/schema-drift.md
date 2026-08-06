# Schema drift: migrations vs production

Recorded 2026-08-06 by diffing the live Supabase project (`oejlkzcoynijqtokbizz`)
against a Postgres 16 database built by replaying every `migrations/group_*.sql`.

The diff is **complete**: tables, per-table column-name sets, indexes, policies
and functions were all compared by name, not just by count.

## Summary

|           | production | replay of `group_*.sql` |
|-----------|-----------:|------------------------:|
| tables    |         65 |                      65 |
| columns   |        764 |                     758 |
| indexes   |        151 |                     155 |
| policies  |         15 |                      15 |
| functions |         15 |                      15 † |

† Excluding `pgcrypto` (which lives in `extensions` on Supabase, `public`
locally) and the three added by `group_71`, which production has not received.

Policies matched **exactly** — same count, same fingerprint. Everything below is
the full set of differences.

---

## A. Three migrations were never applied to production

### `group_44_client_data_quality.sql` — labelled a P0 fix

Creates `clients_email_unique_idx`, a partial case-insensitive unique index that
stops two clients sharing one email. **The index does not exist in production.**
Its own header calls this a "P0 bug fix"; the bug it fixes is still live.

Safe to apply: `clients` holds 14 rows, 12 with an email, and **0 duplicate
email groups** — the index will build without conflict.

### `group_45_drop_duplicate_booking_travelers.sql`

Drops `booking_travelers` (American spelling — an empty stub from `group_00`,
superseded by `booking_travellers`). Production still has it: 2 columns, 0 rows,
plus `booking_travelers_pkey`. The real table holds 20 rows.

Harmless today, but it is exactly the latent bug group_45 was written to remove.

### `group_57_activity_locations.sql`

Creates `activity_locations` (8 columns) and 4 indexes. `to_regclass` returns
NULL in production — none of it is there. `lib/types.ts:167` documents types for
this table, so the repo believes it exists. Nothing queries it yet, which is why
nothing has broken.

---

## B. Twelve columns in production that no migration creates

Confirmed by comparing the column-name set of all 65 tables:

| table | columns only in production |
|---|---|
| `company_settings`  | `prebooked_enabled` |
| `quote_day_items`   | `is_alternative`, `nights` |
| `quote_days`        | `day_end` |
| `quote_deliveries`  | `message`, `sender_email`, `subject` |
| `quote_versions`    | `arrival_notes`, `departure_notes`, `preview_layout`, `preview_theme` |
| `requests`          | `handled_by` |

No other table differs. These are almost certainly hand-applied through the
Supabase SQL editor and never written back to a migration.

**This is the dangerous category.** A database rebuilt from `migrations/` would
be missing all twelve. If application code reads any of them, that rebuild is
broken in a way nothing in the repo would reveal.

## C. Two functions in production that no migration defines

- `auto_advance_request_stage`
- `log_request_stage_change`

Both names point at the request-stage automation. Same cause as B.

---

## Reconciling

1. **Apply the three missing migrations** to production — `group_44`, `group_45`,
   `group_57`. All three are marked idempotent and `group_44` has been checked
   against live data.
2. **Capture B and C as a new `group_NN`.** Dump the twelve column definitions
   and the two function bodies from production and commit them, so a rebuilt
   database matches.
3. **Regenerate the baseline** (see `scripts/dev-backend.md`).

After that, `migrations/` and production finally describe the same schema, and
the baseline can be verified against a production dump rather than against a
replay of itself.

## Why this matters

`CLAUDE.md` calls `migrations/` the schema source of truth. Today it is a *near*
truth: it rebuilds 65/65 tables and all 15 policies, but a database built from
it differs from production by 12 columns, 2 functions, 1 table, and 5 indexes.

The baseline in `migrations/baseline/` reflects **the migrations**, not
production, until the above is reconciled.
