-- National parks, game reserves, and conservancies
-- Used as park_fee entities for rate cards and quote price lines

create table if not exists parks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default 'Tanzania',
  park_type text not null default 'national_park'
    check (park_type in ('national_park', 'game_reserve', 'conservancy', 'marine_park', 'forest_reserve', 'other')),
  description_en text,
  cover_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists parks_country_idx on parks (country);
create index if not exists parks_active_idx on parks (is_active);

alter table parks disable row level security;
