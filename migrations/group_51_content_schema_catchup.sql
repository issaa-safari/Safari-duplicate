-- group_51: content-library schema catch-up
--
-- The duplicate DB was rebuilt leaner than the original Safari Adventure
-- project, but the app (and the original data being imported back) still
-- relies on these columns. Additive only.

-- tours: the admin save route (app/api/admin/update-tour) always writes
-- comfort_rating, so its absence makes every tour save fail with 500.
alter table public.tours
  add column if not exists comfort_rating integer not null default 5,
  add column if not exists min_group_size integer;

alter table public.tours
  drop constraint if exists tours_comfort_rating_range;
alter table public.tours
  add constraint tours_comfort_rating_range
  check (comfort_rating between 1 and 10);

-- media fields carried by the original content library
alter table public.destinations
  add column if not exists video_urls text[] not null default '{}';

alter table public.accommodations
  add column if not exists gallery_urls text[] not null default '{}',
  add column if not exists video_urls text[] not null default '{}';

alter table public.activities
  add column if not exists duration_hours numeric,
  add column if not exists extra_cost_usd numeric,
  add column if not exists is_optional boolean not null default false,
  add column if not exists video_url text;

-- bilingual parity: every other library table has description_ar
alter table public.parks
  add column if not exists description_ar text;
