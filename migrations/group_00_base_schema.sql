-- Group 00: Base schema bootstrap for a FRESH Supabase project
--
-- The original platform database predates the migrations folder: groups 10–33
-- assume tables like clients, requests, tours, company_settings already exist.
-- This file reconstructs that base schema (columns inferred from the app code
-- and later migrations) so a brand-new project can be bootstrapped from the
-- repo alone.
--
-- Run FIRST on an empty database, then the groups in this order:
--   00 → 10 → 11 → 21 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20
--      → 22 → 23 → 24 → 25 → 26 → 27 → 29 → 30 → 31 → 32 → 33 → seeds
--   (21 must run before 12 because quotes references departures.)
--
-- Idempotent — safe to re-run. Skip entirely on the original database.

create extension if not exists pgcrypto;

create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Admin access ──────────────────────────────────────────────────────────────

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- First admin — matches the workspace owner; add more rows for other staff.
insert into admin_users (email, full_name, role)
select 'safariadventureriders@gmail.com', 'Safari Adventure Riders', 'owner'
where not exists (select 1 from admin_users where email = 'safariadventureriders@gmail.com');

-- ── Company settings (single row) ─────────────────────────────────────────────

create table if not exists company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'Safari Adventure Tours',
  brand_name text,
  email text,
  phone text,
  whatsapp text,
  website text,
  address text,
  country text,
  currency_primary text default 'USD',
  currency_secondary text default 'KES',
  bank_account_name text,
  bank_account_number text,
  bank_name text,
  bank_account_type text,
  deposit_percent numeric(7,2) not null default 30,
  balance_due_days integer not null default 30,
  cancellation_61_plus text,
  cancellation_42_60 text,
  cancellation_28_41 text,
  cancellation_0_27 text,
  invoice_prefix text default 'SAT-I',
  quote_prefix text default 'SAT-Q',
  booking_prefix text default 'SAT-B',
  default_markup_percent numeric(7,2) not null default 20,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into company_settings (company_name)
select 'Safari Adventure Tours'
where not exists (select 1 from company_settings);

-- ── CRM ───────────────────────────────────────────────────────────────────────

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null default '',
  last_name text not null default '',
  email text,
  phone text,
  whatsapp text,
  country text,
  preferred_language text not null default 'en',
  language text not null default 'en',
  source text,
  notes text,
  total_bookings integer not null default 0,
  total_spent_usd numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clients_email_idx on clients (lower(email));

-- ── Content library ───────────────────────────────────────────────────────────

create table if not exists destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default 'Kenya',
  description_en text,
  description_ar text,
  cover_image_url text,
  is_active boolean not null default true,
  has_content boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists accommodations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination_id uuid references destinations(id) on delete set null,
  type text not null default 'hotel',
  budget_tier text not null default 'midrange',
  rating integer default 4,
  description_en text,
  description_ar text,
  cover_image_url text,
  is_active boolean not null default true,
  has_content boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination_id uuid references destinations(id) on delete set null,
  description_en text,
  description_ar text,
  cover_image_url text,
  is_active boolean not null default true,
  has_content boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Tours ─────────────────────────────────────────────────────────────────────

create table if not exists tours (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title_en text not null,
  title_ar text,
  subtitle_en text,
  subtitle_ar text,
  overview_en text,
  overview_ar text,
  description_en text,
  description_ar text,
  type text not null default 'wildlife',
  status text not null default 'draft',
  duration_days integer,
  duration_nights integer,
  hero_image_url text,
  gallery_urls text[] not null default '{}',
  route_map_url text,
  highlights_en text[] not null default '{}',
  highlights_ar text[] not null default '{}',
  included_en text[] not null default '{}',
  included_ar text[] not null default '{}',
  excluded_en text[] not null default '{}',
  excluded_ar text[] not null default '{}',
  terrain text,
  vehicle text,
  accommodation_level text,
  total_distance_km numeric(10,1),
  difficulty_rating integer,
  max_group_size integer default 12,
  faqs jsonb not null default '[]'::jsonb,
  deposit_percent numeric(7,2) default 30,
  base_price_usd numeric(14,2),
  show_on_website boolean not null default true,
  featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tour_days (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references tours(id) on delete cascade,
  day_number integer not null,
  day_number_end integer,
  title_en text,
  title_ar text,
  description_en text,
  description_ar text,
  destination_id uuid references destinations(id) on delete set null,
  accommodation_id uuid references accommodations(id) on delete set null,
  activity_ids uuid[] not null default '{}',
  meal_breakfast boolean not null default false,
  meal_lunch boolean not null default false,
  meal_dinner boolean not null default false,
  distance_km numeric(10,1),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tour_days_tour_idx on tour_days (tour_id, day_number);

-- Public site reads active tours through RLS (group_30 builds on this policy).
alter table tours enable row level security;
drop policy if exists "Public read active tours" on tours;
create policy "Public read active tours" on tours
  for select using (status = 'active');

-- ── Requests (enquiries) ──────────────────────────────────────────────────────

create sequence if not exists request_reference_seq start 1;

create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('REQ-' || lpad(nextval('request_reference_seq')::text, 5, '0')),
  client_id uuid references clients(id) on delete set null,
  tour_id uuid references tours(id) on delete set null,
  stage text not null default 'new',
  status text,
  source text,
  priority text,
  client_question text,
  travelers_adults integer,
  travelers_children_older integer,
  travelers_children_younger integer,
  preferred_start_date date,
  requested_for_date date,
  group_size integer,
  requested_tour_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists requests_stage_idx on requests (stage);
create index if not exists requests_client_idx on requests (client_id);

create table if not exists communication_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id) on delete cascade,
  type text,
  summary text,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  subject text,
  message text,
  created_at timestamptz not null default now()
);

-- ── updated_at triggers ───────────────────────────────────────────────────────

drop trigger if exists company_settings_updated_at on company_settings;
create trigger company_settings_updated_at before update on company_settings
  for each row execute function update_updated_at_column();
drop trigger if exists clients_updated_at on clients;
create trigger clients_updated_at before update on clients
  for each row execute function update_updated_at_column();
drop trigger if exists destinations_updated_at on destinations;
create trigger destinations_updated_at before update on destinations
  for each row execute function update_updated_at_column();
drop trigger if exists accommodations_updated_at on accommodations;
create trigger accommodations_updated_at before update on accommodations
  for each row execute function update_updated_at_column();
drop trigger if exists activities_updated_at on activities;
create trigger activities_updated_at before update on activities
  for each row execute function update_updated_at_column();
drop trigger if exists tours_updated_at on tours;
create trigger tours_updated_at before update on tours
  for each row execute function update_updated_at_column();
drop trigger if exists tour_days_updated_at on tour_days;
create trigger tour_days_updated_at before update on tour_days
  for each row execute function update_updated_at_column();
drop trigger if exists requests_updated_at on requests;
create trigger requests_updated_at before update on requests
  for each row execute function update_updated_at_column();

-- ── Legacy tables ────────────────────────────────────────────────────────────
-- group_31 locks these down with RLS. On the original database they exist as
-- pre-platform artifacts; on a fresh project we create empty stubs so the
-- lockdown migration applies cleanly. They carry no app behaviour.

create table if not exists blog_posts (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists booking_travelers (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists quote_lines (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists reviews (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists gift_vouchers (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists tour_day_activities (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists payments (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists booking_staff (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists invoices (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists referrals (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists vehicle_pricing (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists supplier_costs (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists waitlists (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists park_fees (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists hotel_pricing (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table if not exists corporate_enquiries (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
