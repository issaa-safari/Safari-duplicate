-- Group 11: Tour Staff
-- Run in Supabase SQL Editor

create table if not exists tour_staff (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text not null default 'guide',  -- guide | driver | chef | coordinator
  phone       text,
  email       text,
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tour_staff_role_idx on tour_staff (role);
create index if not exists tour_staff_is_active_idx on tour_staff (is_active);

drop trigger if exists tour_staff_updated_at on tour_staff;
create trigger tour_staff_updated_at
  before update on tour_staff
  for each row execute function update_updated_at_column();
