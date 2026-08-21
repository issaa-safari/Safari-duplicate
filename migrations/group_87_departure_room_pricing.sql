-- Group 87: optional single-room price on a departure
--
-- Some tours sell at one per-person price sharing a twin/double room and a
-- higher per-person price for a single room (e.g. the KTM 390 Adventure bike
-- tour: $1,890 sharing / $2,150 single). departures.price_usd already carries
-- the sharing/double price everywhere it's read; this adds an optional
-- per-person single-room price so a departure can offer both and a customer
-- can pick a room type when booking. Null means no single-room option is
-- offered — every existing departure behaves exactly as before.
--
-- Same shape as group_82's security_deposit_usd: a plain column on
-- departures, not a new table, because it's one more number attached to a
-- seat, not a line item with its own lifecycle.
--
-- bookings.room_type snapshots which price a booking was actually charged at
-- (mirrors how total_price_usd snapshots the departure's price at booking
-- time) — 'sharing', 'single', or null for a booking with no room-type
-- choice (departure has no price_single_usd, or a manual/private booking).
--
-- Column-level grants on `departures` are a fixed allow-list (group_30) that
-- does NOT extend to new columns automatically — group_85 exists because of
-- exactly that gap breaking the public departure page. Granting
-- price_single_usd here from the start avoids repeating that mistake.
--
-- Idempotent — safe to re-run. Run after group_86.

alter table departures add column if not exists price_single_usd numeric(14,2);
alter table bookings add column if not exists room_type text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'departures_price_single_usd_chk') then
    alter table departures add constraint departures_price_single_usd_chk
      check (price_single_usd is null or price_single_usd >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bookings_room_type_chk') then
    alter table bookings add constraint bookings_room_type_chk
      check (room_type is null or room_type in ('sharing', 'single'));
  end if;
end $$;

comment on column departures.price_usd is
  'Per-person price sharing a twin/double room.';
comment on column departures.price_single_usd is
  'Per-person price for a single room, when offered. Null if this departure has no single-room option.';
comment on column bookings.room_type is
  'Which per-person price was charged: sharing (twin/double) or single. Null for a booking with no room-type option.';

GRANT SELECT (price_single_usd) ON departures TO anon, authenticated;

-- ── Verification (read-only) ────────────────────────────────────────────────
-- As anon, this must return a row rather than a permission error:
--   SET ROLE anon;
--   SELECT id, price_usd, price_single_usd FROM departures LIMIT 1;
-- RESET ROLE;
