-- Group 10: Vehicles
-- Run in Supabase SQL Editor

create table if not exists vehicles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null default 'jeep',   -- jeep | van | bus | motorbike | boat
  seats       integer not null default 4,
  count       integer not null default 1,     -- number of this vehicle available
  description_en text,
  image_url   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists vehicles_is_active_idx on vehicles (is_active);

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vehicles_updated_at on vehicles;
create trigger vehicles_updated_at
  before update on vehicles
  for each row execute function update_updated_at_column();
