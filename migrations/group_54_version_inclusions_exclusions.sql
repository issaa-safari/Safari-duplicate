-- Group 54: per-version inclusions & exclusions as editable lists.
--
-- The client proposal's Included / Excluded lists were hardcoded defaults
-- (or derived from visible price lines). The pricing step now lets the admin
-- edit them per quote version, SafariOffice-style, as one item per row.
--
-- quote_versions.inclusions/exclusions have existed since group_12 as plain
-- text but nothing ever read them; convert them to text[] (splitting any
-- existing content on newlines) so each item is a separate chip/bullet.
-- Null = "not customised" — the proposal falls back to its defaults.
--
-- Per-traveller-band manual sale prices ride on the existing
-- quote_travellers.pricing_fixed_amount_usd column (group_13) — no schema
-- change needed for those.
--
-- Idempotent — safe to re-run.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quote_versions'
      and column_name = 'inclusions' and data_type = 'text'
  ) then
    alter table quote_versions alter column inclusions type text[]
      using (case when inclusions is null or btrim(inclusions) = '' then null
                  else string_to_array(inclusions, E'\n') end);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quote_versions'
      and column_name = 'exclusions' and data_type = 'text'
  ) then
    alter table quote_versions alter column exclusions type text[]
      using (case when exclusions is null or btrim(exclusions) = '' then null
                  else string_to_array(exclusions, E'\n') end);
  end if;
end $$;

alter table quote_versions
  add column if not exists inclusions text[];

alter table quote_versions
  add column if not exists exclusions text[];
