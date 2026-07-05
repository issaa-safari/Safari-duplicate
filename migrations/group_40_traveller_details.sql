-- Group 40: Traveller details — dietary requirements, allergies, flight info
--
-- Adds dietary/allergy fields to quote_travellers and a request_flights table
-- capturing per-traveller arrival/departure flights on a request.
--
-- Idempotent — safe to re-run. Run after group_39.

alter table quote_travellers
  add column if not exists dietary_requirements text,
  add column if not exists allergies text;

create table if not exists request_flights (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  traveller_name text,
  direction text not null default 'arrival'
    check (direction in ('arrival', 'departure')),
  flight_number text,
  airline text,
  scheduled_at timestamptz,
  airport text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists request_flights_request_idx on request_flights (request_id, sort_order);

drop trigger if exists request_flights_updated_at on request_flights;
create trigger request_flights_updated_at before update on request_flights
  for each row execute function update_updated_at_column();

-- Admin-only — service role bypasses RLS; enable with no policies to block anon/auth.
alter table request_flights enable row level security;
