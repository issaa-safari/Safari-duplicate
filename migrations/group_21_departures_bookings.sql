-- Group 21: Departures and Bookings
-- Tables for managing tour departures and customer bookings

-- Departures table: specific scheduled instances of tours
create table if not exists departures (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references tours(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  total_spots integer not null check (total_spots > 0),
  available_spots integer not null check (available_spots >= 0),
  price_per_person_usd numeric(14,2) not null check (price_per_person_usd >= 0),
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_departures_tour_id on departures(tour_id);
create index if not exists idx_departures_start_date on departures(start_date);
create index if not exists idx_departures_status on departures(status);

-- Bookings table: customer bookings for specific departures
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  departure_id uuid not null references departures(id) on delete cascade,
  number_of_travellers integer not null check (number_of_travellers > 0),
  total_price_usd numeric(14,2) not null check (total_price_usd >= 0),
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bookings_departure_id on bookings(departure_id);
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_bookings_created_at on bookings(created_at);

-- Booking Travellers table: individual traveller details for each booking
create table if not exists booking_travellers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  date_of_birth date,
  nationality text,
  passport_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_booking_travellers_booking_id on booking_travellers(booking_id);
create index if not exists idx_booking_travellers_email on booking_travellers(email);

-- Trigger to update updated_at timestamp
create trigger update_departures_updated_at before update on departures
  for each row execute function update_updated_at_column();

create trigger update_bookings_updated_at before update on bookings
  for each row execute function update_updated_at_column();

create trigger update_booking_travellers_updated_at before update on booking_travellers
  for each row execute function update_updated_at_column();

-- Seed sample departures for testing
insert into departures (tour_id, start_date, end_date, total_spots, available_spots, price_per_person_usd)
select
  t.id,
  (now() + interval '7 days')::date,
  (now() + interval '14 days')::date,
  8,
  8,
  3500
from tours t
where t.is_active = true
limit 5
on conflict do nothing;
