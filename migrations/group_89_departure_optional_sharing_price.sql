-- Group 89: sharing price becomes optional on a departure
--
-- Until now every departure required a sharing/double price (price_usd not
-- null), with an optional single-room price (price_single_usd, group_87)
-- layered on top. Some departures only ever sell single rooms (e.g. a small
-- group trip with no twin/double option) — there was no way to represent
-- that; price_usd had to be filled in with a number that wasn't actually for
-- sale.
--
-- This drops the NOT NULL on price_usd so either room-type price can be left
-- blank, meaning that category isn't offered — mirrors price_single_usd's
-- existing null-means-not-offered convention exactly. A departure must still
-- have at least one price (both blank would mean nothing is for sale), so a
-- check constraint enforces that instead of the column's own NOT NULL.
--
-- Existing rows are unaffected — every current departure already has
-- price_usd set, so the new check is satisfied by every row as-is.
--
-- Idempotent — safe to re-run. Run after group_88.

alter table departures alter column price_usd drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'departures_at_least_one_price_chk') then
    alter table departures add constraint departures_at_least_one_price_chk
      check (price_usd is not null or price_single_usd is not null);
  end if;
end $$;

comment on column departures.price_usd is
  'Per-person price sharing a twin/double room. Null if this departure has no sharing-room option (single room only).';

-- ── Verification (read-only) ────────────────────────────────────────────────
-- Confirms the NOT NULL is gone and the check constraint exists:
--   SELECT column_name, is_nullable FROM information_schema.columns
--     WHERE table_name = 'departures' AND column_name = 'price_usd';
--   SELECT conname FROM pg_constraint WHERE conname = 'departures_at_least_one_price_chk';
