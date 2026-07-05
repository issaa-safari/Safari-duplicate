-- Group 41: Staff & vehicle assignment to a request
--
-- Join tables linking a specific request to specific tour_staff / vehicles rows
-- (operational assignment, distinct from generic pricing references in quotes).
-- `on delete restrict` on the resource side: deactivating a staff member or
-- vehicle that is assigned to a live request should be a visible error, never a
-- silent orphan (matches the write-path-integrity posture).
--
-- Idempotent — safe to re-run. Run after group_40.

create table if not exists request_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  staff_id uuid not null references tour_staff(id) on delete restrict,
  role text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, staff_id)
);

create table if not exists request_vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  seats_used integer check (seats_used is null or seats_used > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, vehicle_id)
);

create index if not exists request_staff_assignments_request_idx on request_staff_assignments (request_id);
create index if not exists request_vehicle_assignments_request_idx on request_vehicle_assignments (request_id);

drop trigger if exists request_staff_assignments_updated_at on request_staff_assignments;
create trigger request_staff_assignments_updated_at before update on request_staff_assignments
  for each row execute function update_updated_at_column();
drop trigger if exists request_vehicle_assignments_updated_at on request_vehicle_assignments;
create trigger request_vehicle_assignments_updated_at before update on request_vehicle_assignments
  for each row execute function update_updated_at_column();

-- Admin-only — service role bypasses RLS; enable with no policies to block anon/auth.
alter table request_staff_assignments enable row level security;
alter table request_vehicle_assignments enable row level security;
