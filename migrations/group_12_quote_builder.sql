-- Group 12: Quote Builder foundation
-- Run in Supabase SQL Editor after Groups 10 and 11.
-- Finance tables and payment behavior are intentionally out of scope.

create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Configurable traveller categories used when pricing a quote.
create table if not exists traveller_age_bands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  min_age integer not null check (min_age >= 0),
  max_age integer check (max_age is null or max_age >= min_age),
  default_pricing_method text not null default 'percentage'
    check (default_pricing_method in ('fixed', 'percentage', 'free')),
  default_percentage numeric(7,2),
  default_fixed_amount_usd numeric(14,2) check (default_fixed_amount_usd is null or default_fixed_amount_usd >= 0),
  allowed_room_categories text[] not null default array['sharing', 'single', 'extra_bed', 'no_bed'],
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into traveller_age_bands
  (name, code, min_age, max_age, default_pricing_method, default_percentage, sort_order)
values
  ('Infant', 'infant', 0, 2, 'free', 0, 10),
  ('Child', 'child', 3, 15, 'percentage', 50, 20),
  ('Adult', 'adult', 16, null, 'percentage', 100, 30)
on conflict (code) do nothing;

-- A rate card groups seasonal supplier rates for a reusable content item.
-- entity_id is intentionally polymorphic because it may identify an
-- accommodation, activity, vehicle, staff member, destination, or custom item.
create table if not exists supplier_rate_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  supplier_name text,
  entity_type text not null
    check (entity_type in ('accommodation', 'activity', 'vehicle', 'staff', 'destination', 'park_fee', 'meal', 'flight', 'transfer', 'other')),
  entity_id uuid,
  cost_category text not null
    check (cost_category in ('accommodation', 'activities', 'park_fees', 'transport', 'staff', 'meals', 'flights', 'other')),
  valid_from date not null,
  valid_to date not null,
  currency text not null default 'USD',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to >= valid_from)
);

create table if not exists supplier_rates (
  id uuid primary key default gen_random_uuid(),
  rate_card_id uuid not null references supplier_rate_cards(id) on delete cascade,
  traveller_category text,
  room_category text,
  residency text not null default 'all'
    check (residency in ('all', 'resident', 'non_resident', 'citizen')),
  pricing_unit text not null
    check (pricing_unit in ('person', 'room', 'vehicle', 'group', 'day', 'night', 'trip')),
  amount numeric(14,2) not null check (amount >= 0),
  min_group_size integer check (min_group_size is null or min_group_size > 0),
  max_group_size integer check (max_group_size is null or max_group_size > 0),
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_group_size is null or min_group_size is null or max_group_size >= min_group_size)
);

create sequence if not exists quote_number_seq start 1;

create or replace function generate_quote_number()
returns text language plpgsql as $$
declare
  prefix text;
begin
  select coalesce(nullif(quote_prefix, ''), 'SAT-Q')
    into prefix
    from company_settings
    limit 1;

  return coalesce(prefix, 'SAT-Q') || '-' || lpad(nextval('quote_number_seq')::text, 5, '0');
end;
$$;

-- The permanent quote identity. All editable and sent snapshots live in
-- quote_versions so history never changes when content or settings change.
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique default generate_quote_number(),
  request_id uuid references requests(id) on delete set null,
  client_id uuid not null references clients(id) on delete restrict,
  mode text not null default 'custom'
    check (mode in ('custom', 'fixed_departure')),
  tour_id uuid references tours(id) on delete set null,
  departure_id uuid references departures(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'cancelled')),
  accepted_version_id uuid,
  -- TODO: restore FK when Bookings module is built:
  -- provisional_booking_id uuid references bookings(id) on delete set null,
  provisional_booking_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quote_versions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'superseded', 'cancelled')),
  title text,
  language text not null default 'en',
  currency text not null default 'USD' check (currency = 'USD'),
  travel_start_date date,
  travel_end_date date,
  valid_until date,
  default_markup_percent numeric(7,2) not null default 0 check (default_markup_percent >= 0),
  category_markup_overrides jsonb not null default '{}'::jsonb,
  discount_type text check (discount_type is null or discount_type in ('percentage', 'fixed')),
  discount_value numeric(14,2) not null default 0 check (discount_value >= 0),
  discount_reason text,
  discount_client_label text,
  total_cost_usd numeric(14,2) not null default 0,
  total_selling_usd numeric(14,2) not null default 0,
  gross_margin_usd numeric(14,2) not null default 0,
  gross_margin_percent numeric(7,2) not null default 0,
  sharing_price_per_person_usd numeric(14,2),
  single_price_per_person_usd numeric(14,2),
  single_supplement_usd numeric(14,2),
  exchange_rates_snapshot jsonb not null default '{}'::jsonb,
  company_snapshot jsonb not null default '{}'::jsonb,
  client_snapshot jsonb not null default '{}'::jsonb,
  policy_snapshot jsonb not null default '{}'::jsonb,
  inclusions text,
  exclusions text,
  internal_notes text,
  locked_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, version_number),
  check (travel_end_date is null or travel_start_date is null or travel_end_date >= travel_start_date),
  check (discount_type <> 'percentage' or discount_value <= 100)
);

alter table quotes
  add column if not exists accepted_version_id uuid;
alter table quotes
  drop constraint if exists quotes_accepted_version_id_fkey;
alter table quotes
  add constraint quotes_accepted_version_id_fkey
  foreign key (accepted_version_id) references quote_versions(id) on delete set null;

create table if not exists quote_travellers (
  id uuid primary key default gen_random_uuid(),
  quote_version_id uuid not null references quote_versions(id) on delete cascade,
  display_name text,
  age_on_travel_date integer check (age_on_travel_date is null or age_on_travel_date >= 0),
  age_band_id uuid references traveller_age_bands(id) on delete set null,
  age_band_snapshot jsonb not null default '{}'::jsonb,
  pricing_fixed_amount_usd numeric(14,2) check (pricing_fixed_amount_usd is null or pricing_fixed_amount_usd >= 0),
  traveller_category text not null,
  room_category text not null default 'sharing'
    check (room_category in ('sharing', 'single', 'triple', 'extra_bed', 'no_bed')),
  is_paying boolean not null default true,
  is_complimentary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quote_days (
  id uuid primary key default gen_random_uuid(),
  quote_version_id uuid not null references quote_versions(id) on delete cascade,
  day_number integer not null check (day_number > 0),
  day_date date,
  title text,
  description_en text,
  description_ar text,
  destination_id uuid references destinations(id) on delete set null,
  destination_snapshot jsonb not null default '{}'::jsonb,
  meals text[] not null default '{}',
  client_notes text,
  internal_notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_version_id, day_number)
);

create table if not exists quote_day_items (
  id uuid primary key default gen_random_uuid(),
  quote_day_id uuid not null references quote_days(id) on delete cascade,
  item_type text not null
    check (item_type in ('accommodation', 'activity', 'vehicle', 'staff', 'meal', 'flight', 'transfer', 'note', 'other')),
  accommodation_id uuid references accommodations(id) on delete set null,
  activity_id uuid references activities(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  staff_id uuid references tour_staff(id) on delete set null,
  title_snapshot text not null,
  content_snapshot jsonb not null default '{}'::jsonb,
  start_time time,
  end_time time,
  room_category text,
  client_notes text,
  internal_notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Each row is an auditable cost/selling-price component. It preserves the
-- selected reusable rate as well as any manual override and its reason.
create table if not exists quote_price_lines (
  id uuid primary key default gen_random_uuid(),
  quote_version_id uuid not null references quote_versions(id) on delete cascade,
  quote_day_id uuid references quote_days(id) on delete cascade,
  cost_category text not null
    check (cost_category in ('accommodation', 'activities', 'park_fees', 'transport', 'staff', 'meals', 'flights', 'other')),
  description text not null,
  rate_card_id uuid references supplier_rate_cards(id) on delete set null,
  supplier_rate_id uuid references supplier_rates(id) on delete set null,
  pricing_unit text not null
    check (pricing_unit in ('person', 'room', 'vehicle', 'group', 'day', 'night', 'trip')),
  traveller_category text,
  room_category text,
  quantity numeric(12,3) not null default 1 check (quantity >= 0),
  allocated_people integer check (allocated_people is null or allocated_people > 0),
  source_currency text not null default 'USD',
  source_unit_cost numeric(14,2) not null default 0 check (source_unit_cost >= 0),
  exchange_rate_to_usd numeric(14,6) not null default 1 check (exchange_rate_to_usd > 0),
  unit_cost_usd numeric(14,2) not null default 0 check (unit_cost_usd >= 0),
  original_unit_cost_usd numeric(14,2),
  is_manual_override boolean not null default false,
  override_reason text,
  overridden_by uuid,
  overridden_at timestamptz,
  markup_percent_override numeric(7,2) check (markup_percent_override is null or markup_percent_override >= 0),
  total_cost_usd numeric(14,2) not null default 0,
  total_selling_usd numeric(14,2) not null default 0,
  is_optional boolean not null default false,
  is_client_visible boolean not null default true,
  internal_notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_manual_override or override_reason is not null)
);

create table if not exists quote_deliveries (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  quote_version_id uuid not null references quote_versions(id) on delete cascade,
  channel text not null check (channel in ('email', 'pdf', 'share_link')),
  recipient_email text,
  access_token uuid unique default gen_random_uuid(),
  expires_at timestamptz,
  sent_at timestamptz,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer not null default 0,
  revoked_at timestamptz,
  provider_message_id text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists quote_acceptances (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  quote_version_id uuid not null unique references quote_versions(id) on delete restrict,
  delivery_id uuid references quote_deliveries(id) on delete set null,
  client_name text not null,
  client_email text,
  terms_accepted boolean not null check (terms_accepted),
  accepted_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  -- TODO: restore FK when Bookings module is built:
  -- provisional_booking_id uuid references bookings(id) on delete set null,
  provisional_booking_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists supplier_rate_cards_match_idx
  on supplier_rate_cards (entity_type, entity_id, valid_from, valid_to, is_active);
create index if not exists supplier_rates_card_idx on supplier_rates (rate_card_id);
create index if not exists quotes_request_idx on quotes (request_id);
create index if not exists quotes_client_idx on quotes (client_id);
create index if not exists quotes_status_idx on quotes (status);
create index if not exists quote_versions_quote_idx on quote_versions (quote_id, version_number desc);
create index if not exists quote_versions_status_idx on quote_versions (status, valid_until);
create index if not exists quote_travellers_version_idx on quote_travellers (quote_version_id);
create index if not exists quote_days_version_idx on quote_days (quote_version_id, day_number);
create index if not exists quote_day_items_day_idx on quote_day_items (quote_day_id, sort_order);
create index if not exists quote_price_lines_version_idx on quote_price_lines (quote_version_id, cost_category);
create index if not exists quote_deliveries_token_idx on quote_deliveries (access_token);

drop trigger if exists traveller_age_bands_updated_at on traveller_age_bands;
create trigger traveller_age_bands_updated_at before update on traveller_age_bands
  for each row execute function update_updated_at_column();
drop trigger if exists supplier_rate_cards_updated_at on supplier_rate_cards;
create trigger supplier_rate_cards_updated_at before update on supplier_rate_cards
  for each row execute function update_updated_at_column();
drop trigger if exists supplier_rates_updated_at on supplier_rates;
create trigger supplier_rates_updated_at before update on supplier_rates
  for each row execute function update_updated_at_column();
drop trigger if exists quotes_updated_at on quotes;
create trigger quotes_updated_at before update on quotes
  for each row execute function update_updated_at_column();
drop trigger if exists quote_versions_updated_at on quote_versions;
create trigger quote_versions_updated_at before update on quote_versions
  for each row execute function update_updated_at_column();
drop trigger if exists quote_travellers_updated_at on quote_travellers;
create trigger quote_travellers_updated_at before update on quote_travellers
  for each row execute function update_updated_at_column();
drop trigger if exists quote_days_updated_at on quote_days;
create trigger quote_days_updated_at before update on quote_days
  for each row execute function update_updated_at_column();
drop trigger if exists quote_day_items_updated_at on quote_day_items;
create trigger quote_day_items_updated_at before update on quote_day_items
  for each row execute function update_updated_at_column();
drop trigger if exists quote_price_lines_updated_at on quote_price_lines;
create trigger quote_price_lines_updated_at before update on quote_price_lines
  for each row execute function update_updated_at_column();

-- Admin-only tables: keep RLS disabled, matching the existing admin model.
alter table traveller_age_bands disable row level security;
alter table supplier_rate_cards disable row level security;
alter table supplier_rates disable row level security;
alter table quotes disable row level security;
alter table quote_versions disable row level security;
alter table quote_travellers disable row level security;
alter table quote_days disable row level security;
alter table quote_day_items disable row level security;
alter table quote_price_lines disable row level security;
alter table quote_deliveries disable row level security;
alter table quote_acceptances disable row level security;
