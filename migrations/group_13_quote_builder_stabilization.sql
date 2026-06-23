-- Group 13: Quote Builder stabilization
-- Run after Group 12. This migration is additive and preserves existing quotes.

alter table traveller_age_bands
  add column if not exists default_fixed_amount_usd numeric(14,2);

alter table quote_travellers
  add column if not exists pricing_fixed_amount_usd numeric(14,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'traveller_age_bands_fixed_amount_nonnegative') then
    alter table traveller_age_bands add constraint traveller_age_bands_fixed_amount_nonnegative
      check (default_fixed_amount_usd is null or default_fixed_amount_usd >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quote_travellers_fixed_amount_nonnegative') then
    alter table quote_travellers add constraint quote_travellers_fixed_amount_nonnegative
      check (pricing_fixed_amount_usd is null or pricing_fixed_amount_usd >= 0);
  end if;
end;
$$;

-- Defer day-number uniqueness until transaction commit so days can be reordered
-- without transient collisions (for example, swapping day 1 and day 2).
alter table quote_days
  drop constraint if exists quote_days_quote_version_id_day_number_key;
alter table quote_days
  add constraint quote_days_quote_version_id_day_number_key
  unique (quote_version_id, day_number) deferrable initially deferred;

create or replace function assert_quote_version_mutable(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status
  from quote_versions
  where id = p_version_id;

  if v_status is null then
    raise exception 'Quote version not found.';
  end if;

  if v_status not in ('draft', 'ready') then
    raise exception 'This quote version is locked and cannot be changed.';
  end if;
end;
$$;

create or replace function enforce_direct_quote_child_mutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform assert_quote_version_mutable(old.quote_version_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform assert_quote_version_mutable(new.quote_version_id);
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

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
    select quote_version_id into v_version_id from quote_days where id = old.quote_day_id;
    perform assert_quote_version_mutable(v_version_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select quote_version_id into v_version_id from quote_days where id = new.quote_day_id;
    perform assert_quote_version_mutable(v_version_id);
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists quote_travellers_require_mutable_version on quote_travellers;
create trigger quote_travellers_require_mutable_version
  before insert or update or delete on quote_travellers
  for each row execute function enforce_direct_quote_child_mutable();

drop trigger if exists quote_days_require_mutable_version on quote_days;
create trigger quote_days_require_mutable_version
  before insert or update or delete on quote_days
  for each row execute function enforce_direct_quote_child_mutable();

drop trigger if exists quote_price_lines_require_mutable_version on quote_price_lines;
create trigger quote_price_lines_require_mutable_version
  before insert or update or delete on quote_price_lines
  for each row execute function enforce_direct_quote_child_mutable();

drop trigger if exists quote_day_items_require_mutable_version on quote_day_items;
create trigger quote_day_items_require_mutable_version
  before insert or update or delete on quote_day_items
  for each row execute function enforce_quote_day_item_mutable();

-- Creates the permanent quote and version 1 in one database transaction.
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
    'language', language
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

-- Replaces a quote itinerary atomically. Any error rolls the entire save back.
create or replace function save_quote_itinerary(
  p_version_id uuid,
  p_days jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day jsonb;
  v_item jsonb;
  v_day_id uuid;
  v_existing_id uuid;
  v_day_index integer := 0;
  v_item_index integer;
begin
  perform assert_quote_version_mutable(p_version_id);

  if jsonb_typeof(p_days) <> 'array' then
    raise exception 'Days must be an array.';
  end if;

  set constraints quote_days_quote_version_id_day_number_key deferred;

  delete from quote_days qd
  where qd.quote_version_id = p_version_id
    and not exists (
      select 1
      from jsonb_array_elements(p_days) d
      where nullif(d->>'id', '')::uuid = qd.id
    );

  for v_day in select value from jsonb_array_elements(p_days)
  loop
    v_existing_id := nullif(v_day->>'id', '')::uuid;

    if coalesce((v_day->>'dayNumber')::integer, 0) < 1 then
      raise exception 'Every day must have a positive day number.';
    end if;

    if v_existing_id is not null then
      update quote_days set
        day_number = (v_day->>'dayNumber')::integer,
        day_date = nullif(v_day->>'dayDate', '')::date,
        title = nullif(trim(v_day->>'title'), ''),
        description_en = nullif(v_day->>'descriptionEn', ''),
        client_notes = nullif(v_day->>'clientNotes', ''),
        destination_id = nullif(v_day->>'destinationId', '')::uuid,
        destination_snapshot = coalesce(v_day->'destinationSnapshot', '{}'::jsonb),
        meals = coalesce(array(select jsonb_array_elements_text(v_day->'meals')), '{}'::text[]),
        sort_order = v_day_index
      where id = v_existing_id and quote_version_id = p_version_id
      returning id into v_day_id;

      if v_day_id is null then
        raise exception 'A quote day does not belong to this version.';
      end if;
    else
      insert into quote_days (
        quote_version_id, day_number, day_date, title, description_en,
        client_notes, destination_id, destination_snapshot, meals, sort_order
      ) values (
        p_version_id,
        (v_day->>'dayNumber')::integer,
        nullif(v_day->>'dayDate', '')::date,
        nullif(trim(v_day->>'title'), ''),
        nullif(v_day->>'descriptionEn', ''),
        nullif(v_day->>'clientNotes', ''),
        nullif(v_day->>'destinationId', '')::uuid,
        coalesce(v_day->'destinationSnapshot', '{}'::jsonb),
        coalesce(array(select jsonb_array_elements_text(v_day->'meals')), '{}'::text[]),
        v_day_index
      ) returning id into v_day_id;
    end if;

    delete from quote_day_items where quote_day_id = v_day_id;
    v_item_index := 0;

    for v_item in select value from jsonb_array_elements(coalesce(v_day->'items', '[]'::jsonb))
    loop
      insert into quote_day_items (
        quote_day_id,
        item_type,
        accommodation_id,
        activity_id,
        vehicle_id,
        staff_id,
        title_snapshot,
        content_snapshot,
        sort_order
      ) values (
        v_day_id,
        v_item->>'itemType',
        case when v_item->>'itemType' = 'accommodation' then nullif(v_item->>'entityId', '')::uuid end,
        case when v_item->>'itemType' = 'activity' then nullif(v_item->>'entityId', '')::uuid end,
        case when v_item->>'itemType' = 'vehicle' then nullif(v_item->>'entityId', '')::uuid end,
        case when v_item->>'itemType' = 'staff' then nullif(v_item->>'entityId', '')::uuid end,
        coalesce(nullif(trim(v_item->>'titleSnapshot'), ''), 'Untitled item'),
        coalesce(v_item->'contentSnapshot', '{}'::jsonb),
        v_item_index
      );
      v_item_index := v_item_index + 1;
    end loop;

    v_day_index := v_day_index + 1;
    v_day_id := null;
  end loop;
end;
$$;

revoke all on function create_quote_with_version(uuid, uuid, text, uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function create_quote_with_version(uuid, uuid, text, uuid, uuid, text, uuid)
  to service_role;

revoke all on function save_quote_itinerary(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function save_quote_itinerary(uuid, jsonb)
  to service_role;
