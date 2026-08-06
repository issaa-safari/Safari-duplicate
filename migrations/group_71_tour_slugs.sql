-- Group 71: populate and maintain tours.slug
--
-- `tours.slug` has existed (unique, nullable) since group_00 but nothing ever
-- filled it, so every public tour URL was a UUID —
-- /tours/0dc49e70-e7ae-47d8-8a37-17ba0e35aa17 rather than
-- /tours/masai-mara-explorer. This backfills the column from title_en and adds
-- a trigger so a tour created later always gets one, without the admin forms
-- having to think about it.
--
-- The column stays nullable on purpose: a title with no latin characters
-- slugifies to an empty string, and the route falls back to the UUID rather
-- than 404ing. Slugs are shared by both languages — the Arabic page lives at
-- /ar/tours/<same-slug>.
--
-- Idempotent — safe to re-run. Run after group_70.

-- Lowercase, collapse every run of non-alphanumerics to a single dash, and
-- trim dashes off both ends.
create or replace function slugify(value text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select nullif(
    trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g')),
    ''
  )
$$;

-- Append -2, -3, … until the slug is free. `exclude_id` keeps a row from
-- colliding with itself on update.
create or replace function tours_unique_slug(base text, exclude_id uuid)
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  candidate text;
  n int := 1;
begin
  if base is null or base = '' then
    return null;
  end if;
  candidate := base;
  while exists (
    select 1 from tours
    where slug = candidate
      and (exclude_id is null or id <> exclude_id)
  ) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end
$$;

create or replace function tours_set_slug()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Only ever fills a blank. An admin who sets a slug by hand keeps it, and an
  -- existing slug is never rewritten when the title changes — the published URL
  -- has to stay stable.
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := tours_unique_slug(slugify(new.title_en), new.id);
  end if;
  return new;
end
$$;

drop trigger if exists tours_set_slug_trigger on tours;
create trigger tours_set_slug_trigger
  before insert or update on tours
  for each row execute function tours_set_slug();

-- Backfill anything already in the table. Setting slug explicitly means the
-- trigger above no-ops for these rows.
do $$
declare
  r record;
begin
  for r in select id, title_en from tours where slug is null or btrim(slug) = '' loop
    update tours
      set slug = tours_unique_slug(slugify(r.title_en), r.id)
      where id = r.id;
  end loop;
end
$$;
