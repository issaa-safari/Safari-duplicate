-- Group 42: Room-level granularity (optional)
--
-- Adds a lightweight `rooms` table under accommodations and lets the existing
-- polymorphic rate engine resolve room-level rate cards. Because
-- supplier_rate_cards.entity_type/entity_id is already polymorphic and
-- lib/rate-resolution.ts never hardcodes 'accommodation', this needs ZERO engine
-- changes — only a widened check constraint and an optional room_id on day items.
-- Accommodation-level rate cards keep working untouched (caller falls back).
--
-- Idempotent — safe to re-run. Run after group_41.

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  accommodation_id uuid not null references accommodations(id) on delete cascade,
  name text not null,
  room_type text,
  bed_config text,
  max_occupancy integer not null default 2 check (max_occupancy > 0),
  size_m2 numeric(8,2),
  amenities text[] not null default '{}',
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_accommodation_idx on rooms (accommodation_id, sort_order);

drop trigger if exists rooms_updated_at on rooms;
create trigger rooms_updated_at before update on rooms
  for each row execute function update_updated_at_column();

-- Rooms are marketing-safe content — public read of active rooms under active
-- accommodations, matching the accommodations posture in group_30.
alter table rooms enable row level security;
drop policy if exists "Public read active rooms" on rooms;
create policy "Public read active rooms" on rooms
  for select using (
    is_active
    and exists (select 1 from accommodations a where a.id = rooms.accommodation_id and a.is_active)
  );

-- Widen the polymorphic rate-card entity type additively to include 'room'.
alter table supplier_rate_cards drop constraint if exists supplier_rate_cards_entity_type_check;
alter table supplier_rate_cards add constraint supplier_rate_cards_entity_type_check
  check (entity_type in ('accommodation', 'activity', 'vehicle', 'staff', 'destination', 'park_fee', 'meal', 'flight', 'transfer', 'room', 'other'));

-- Optional room selection on an accommodation day item.
alter table quote_day_items
  add column if not exists room_id uuid references rooms(id) on delete set null;
