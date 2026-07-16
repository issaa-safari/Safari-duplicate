-- Group 57: multi-location activities.
--
-- A generic activity (e.g. "Waterfall Visit", "Game Drive") can take place at
-- several locations. A location is a destination and/or a park. This is
-- additive: activities.destination_id (the single "primary" location) is left
-- untouched, and this join table lets one activity map to many places.
--
-- Idempotent — safe to re-run.

create table if not exists activity_locations (
  id             uuid primary key default gen_random_uuid(),
  activity_id    uuid not null references activities(id) on delete cascade,
  destination_id uuid references destinations(id) on delete cascade,
  park_id        uuid references parks(id) on delete cascade,
  label_en       text,   -- specific place name, e.g. "Thomson's Falls"
  label_ar       text,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  constraint activity_locations_place_chk
    check (destination_id is not null or park_id is not null)
);

-- One row per (activity, destination) and per (activity, park).
create unique index if not exists activity_locations_act_dest_uk
  on activity_locations (activity_id, destination_id) where destination_id is not null;
create unique index if not exists activity_locations_act_park_uk
  on activity_locations (activity_id, park_id) where park_id is not null;
create index if not exists activity_locations_activity_idx on activity_locations (activity_id);

-- Content table read through the service-role admin client (like parks); no RLS.
alter table activity_locations disable row level security;
