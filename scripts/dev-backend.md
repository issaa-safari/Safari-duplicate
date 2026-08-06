# Running the app without Supabase

`scripts/dev-backend.mjs` emulates the slice of the Supabase HTTP API this app
uses (PostgREST + GoTrue + storage upload), backed by a local Postgres. It lets
the full app — admin and public — run end to end on a machine that cannot reach
the live project.

This file is what `dev-backend.mjs` and `CLAUDE.md` point at.

## 1. A local Postgres

Any Postgres 16+ will do. From a bare install:

```bash
PGDIR=/var/lib/postgresql/safari-pgdata
mkdir -p "$PGDIR" && chown postgres:postgres "$PGDIR"
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D $PGDIR -U postgres -A trust"
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D $PGDIR -o '-p 5433 -k /tmp' -l $PGDIR/log start"
createdb -h 127.0.0.1 -p 5433 -U postgres safari
```

The data directory must be somewhere the `postgres` user can traverse —
`/var/lib/postgresql` works; a path under a root-owned temp directory does not.

## 2. Load the schema

**Use the baseline, not the group files.**

```bash
psql -h 127.0.0.1 -p 5433 -U postgres -d safari -v ON_ERROR_STOP=1 \
  -f migrations/baseline/001_prerequisites.sql
psql -h 127.0.0.1 -p 5433 -U postgres -d safari -v ON_ERROR_STOP=1 \
  -f migrations/baseline/002_schema.sql
```

`001_prerequisites.sql` creates the roles and schemas Supabase would normally
provide (`anon`, `authenticated`, `service_role`, `auth`, `storage`). Without it
the schema fails before the first table.

### Why not run `migrations/group_*.sql`?

Because they do not apply in one pass. 21 of them reference tables that a
*later* group creates — `group_12` uses `departures`, added in `group_21`, and
so on. Nothing is missing: run the failures a second time and every one
succeeds. But "run these in order and get the schema" does not hold, which is
what the baseline exists to fix.

Two groups are also not re-runnable: `group_30` and `group_31` use bare
`create policy`, which errors if the policy is already there.

## 3. Start the backend and point the app at it

```bash
DATABASE_URL=postgres://postgres@127.0.0.1:5433/safari node scripts/dev-backend.mjs
```

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-anon
SUPABASE_SERVICE_ROLE_KEY=dev-service
```

Any email/password signs in as the first `admin_users` row.

## 4. Seed something to look at

The public pages need at least one active tour. `migrations/seed_*.sql` has
fuller fixtures; the minimum for a tour page that renders in both languages:

```sql
insert into tours (slug, title_en, title_ar, overview_en, overview_ar,
                   type, status, duration_days, base_price_usd, show_on_website)
values ('masai-mara-explorer', 'Masai Mara Explorer', 'مستكشف ماساي مارا',
        'A seven-day guided safari through the Masai Mara.',
        'رحلة سفاري مُرشدة لمدة سبعة أيام عبر ماساي مارا.',
        'wildlife', 'active', 7, 3200, true);
```

`departures.status` must be one of `available`, `full`, `closed`, `cancelled`.

## Regenerating the baseline

Whenever a new `group_NN` lands, so the baseline and the group files stay two
descriptions of one schema:

```bash
# 1. Replay every group into a scratch database — twice, because of the
#    ordering problem above.
createdb -h 127.0.0.1 -p 5433 -U postgres safari_rebuild
psql -h 127.0.0.1 -p 5433 -U postgres -d safari_rebuild -f migrations/baseline/001_prerequisites.sql
for pass in 1 2; do
  for f in $(ls migrations/group_*.sql | sort); do
    psql -q -h 127.0.0.1 -p 5433 -U postgres -d safari_rebuild -f "$f" >/dev/null 2>&1
  done
done

# 2. Dump it.
pg_dump -h 127.0.0.1 -p 5433 -U postgres -d safari_rebuild \
  --schema-only --schema=public --no-owner --no-privileges --no-comments \
  > /tmp/schema.sql
```

Then, in the dumped file: drop the `\restrict` / `\unrestrict` psql meta-commands,
change `CREATE SCHEMA public;` to `CREATE SCHEMA IF NOT EXISTS public;` (every
database already has it), and keep the explanatory header from the current
`002_schema.sql`.

### Verify it before committing

Rebuild from the baseline alone and confirm the two databases match:

```sql
with f as (
  select 'table' kind, tablename::text name from pg_tables where schemaname='public'
  union all select 'index', indexname::text from pg_indexes where schemaname='public'
  union all select 'policy', (tablename||'.'||policyname)::text from pg_policies where schemaname='public'
  union all select 'column', (table_name||'.'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,'-'))::text
    from information_schema.columns where table_schema='public'
  union all select 'constraint', (conrelid::regclass||'.'||conname)::text
    from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public'
)
select kind, count(*), md5(string_agg(name, ',' order by name)) from f group by kind order by kind;
```

Identical output on both databases means the baseline is faithful.

## Known drift from production

The baseline describes the migrations, which are **not** currently identical to
the live database. See [`docs/current/schema-drift.md`](../docs/current/schema-drift.md).
