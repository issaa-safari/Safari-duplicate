-- Group 17: Fix create_quote_with_version client snapshot + cascade trigger bug
--
-- Fix 1: create_quote_with_version referenced clients.language which may not exist.
--         We now use preferred_language (added in group_16) with a safe fallback.
--
-- Fix 2: enforce_quote_day_item_mutable raised "Quote version not found" when
--         save_quote_itinerary bulk-deleted days (cascade also deletes their items,
--         but the trigger then couldn't look up the already-deleted parent day).

-- ── Fix 1: ensure clients.language exists ────────────────────────────────────

alter table clients
  add column if not exists language text not null default 'en'
    check (language in ('en', 'ar', 'fr', 'de', 'es', 'zh'));

-- Sync preferred_language → language for any existing rows
update clients set language = preferred_language
  where language = 'en' and preferred_language != 'en';

-- Recreate function using the now-guaranteed language column
create or replace function create_quote_with_version(
  p_client_id uuid,
  p_request_id uuid,
  p_mode text,
  p_tour_id uuid,
  p_departure_id uuid,
  p_title text,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid;
  v_tour_id uuid := p_tour_id;
  v_start_date date;
  v_end_date date;
  v_client_snapshot jsonb;
  v_company_snapshot jsonb := '{}'::jsonb;
  v_policy_snapshot jsonb := '{}'::jsonb;
  v_default_markup numeric(7,2) := 0;
begin
  if p_mode not in ('custom', 'fixed_departure') then
    raise exception 'Invalid quote mode.';
  end if;

  select jsonb_build_object(
    'first_name', first_name,
    'last_name', last_name,
    'email', email,
    'phone', phone,
    'country', country,
    'language', coalesce(nullif(preferred_language, ''), nullif(language, ''), 'en')
  ) into v_client_snapshot
  from clients where id = p_client_id;

  if v_client_snapshot is null then
    raise exception 'Client not found.';
  end if;

  if p_request_id is not null and not exists (
    select 1 from requests where id = p_request_id and client_id = p_client_id
  ) then
    raise exception 'The selected request does not belong to this client.';
  end if;

  if p_mode = 'fixed_departure' then
    if p_departure_id is null then
      raise exception 'A departure is required for fixed-departure quotes.';
    end if;

    select tour_id, start_date, end_date
      into v_tour_id, v_start_date, v_end_date
    from departures
    where id = p_departure_id
      and status in ('available', 'limited')
      and is_active = true;

    if v_tour_id is null then
      raise exception 'The selected departure is not available.';
    end if;
  end if;

  select
    jsonb_build_object(
      'company_name', company_name,
      'brand_name', brand_name,
      'email', email,
      'phone', phone,
      'whatsapp', whatsapp,
      'website', website,
      'address', address,
      'country', country,
      'currency_primary', currency_primary,
      'currency_secondary', currency_secondary,
      'logo_url', logo_url
    ),
    jsonb_build_object(
      'deposit_percent', deposit_percent,
      'balance_due_days', balance_due_days,
      'cancellation_61_plus', cancellation_61_plus,
      'cancellation_42_60', cancellation_42_60,
      'cancellation_28_41', cancellation_28_41,
      'cancellation_0_27', cancellation_0_27
    ),
    coalesce(default_markup_percent, 0)
  into v_company_snapshot, v_policy_snapshot, v_default_markup
  from company_settings
  limit 1;

  insert into quotes (
    client_id, request_id, mode, tour_id, departure_id, status, created_by
  ) values (
    p_client_id, p_request_id, p_mode, v_tour_id, p_departure_id, 'draft', p_created_by
  ) returning id into v_quote_id;

  insert into quote_versions (
    quote_id,
    version_number,
    status,
    title,
    travel_start_date,
    travel_end_date,
    valid_until,
    default_markup_percent,
    company_snapshot,
    client_snapshot,
    policy_snapshot,
    created_by
  ) values (
    v_quote_id,
    1,
    'draft',
    nullif(trim(p_title), ''),
    v_start_date,
    v_end_date,
    current_date + 14,
    coalesce(v_default_markup, 0),
    coalesce(v_company_snapshot, '{}'::jsonb),
    v_client_snapshot,
    coalesce(v_policy_snapshot, '{}'::jsonb),
    p_created_by
  );

  return v_quote_id;
end;
$$;

revoke all on function create_quote_with_version(uuid, uuid, text, uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function create_quote_with_version(uuid, uuid, text, uuid, uuid, text, uuid)
  to service_role;

-- ── Fix 2: itinerary cascade trigger ─────────────────────────────────────────
-- When save_quote_itinerary bulk-deletes old days, ON DELETE CASCADE fires for
-- their quote_day_items. The trigger then tries to look up quote_version_id from
-- the already-deleted parent day and gets NULL → "Quote version not found."
-- Fix: skip the mutability check when the parent day is gone (cascade context).

create or replace function enforce_quote_day_item_mutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version_id uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select quote_version_id into v_version_id
    from quote_days where id = old.quote_day_id;
    -- Parent day already deleted (cascade from quote_days) — nothing to check
    if v_version_id is null then
      if tg_op = 'DELETE' then return old; end if;
      return new;
    end if;
    perform assert_quote_version_mutable(v_version_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select quote_version_id into v_version_id
    from quote_days where id = new.quote_day_id;
    perform assert_quote_version_mutable(v_version_id);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
