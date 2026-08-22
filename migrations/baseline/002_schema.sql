-- Safari Adventure Riders — consolidated schema baseline
--
-- WHAT THIS IS
-- A single-file reconstruction of the schema that migrations/group_*.sql
-- describes, generated with pg_dump after replaying every group in order.
--
-- WHY IT EXISTS
-- The group_NN files no longer apply cleanly in one pass: 21 of them reference
-- tables that a *later* group creates (group_12 uses `departures`, added in
-- group_21, and so on). They all succeed on a second pass, so nothing is
-- missing — but a fresh database cannot be built by running them once in
-- order, which is what "source of truth" has to mean.
--
-- HOW TO USE IT
--   Fresh/local database:  run baseline/001_prerequisites.sql, then this file.
--                          Do NOT also run the group_NN files.
--   Existing database:     do nothing. This file is never applied to a
--                          database that already has the groups. Keep
--                          appending new group_NN files as before.
--
-- REGENERATING
-- See scripts/dev-backend.md. Regenerate whenever a new group_NN lands, so the
-- baseline and the group files stay two descriptions of one schema.
--
-- VERIFIED AGAINST PRODUCTION (2026-08-06)
-- After applying group_44/45/57 to production and capturing its
-- hand-applied objects as group_72, a replay of migrations/ matches the live
-- database exactly on tables, columns, indexes, constraints, policies,
-- functions and triggers. See docs/current/schema-drift.md.

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: assert_invoice_deletable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assert_invoice_deletable() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if old.status <> 'draft' then
    raise exception 'Invoice % is % and cannot be deleted. Void it instead.',
      coalesce(old.invoice_number, old.id::text), old.status
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;


--
-- Name: assert_invoice_lines_mutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assert_invoice_lines_mutable() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  v_status text;
  v_number text;
begin
  select status, invoice_number into v_status, v_number
    from invoices where id = v_invoice_id;

  -- No row means the invoice itself is being deleted and the cascade is taking
  -- its lines with it. The parent's own delete guard has already had its say.
  if v_status is not null and v_status <> 'draft' then
    raise exception
      'Invoice % is % and its lines can no longer be changed. Void it and issue a new one.',
      coalesce(v_number, v_invoice_id::text), v_status
      using errcode = 'check_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;


--
-- Name: assert_invoice_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assert_invoice_transition() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  -- draft → issued → void, and nothing comes back: an issued number that
  -- reverts to a draft is a number reused. A draft is not voided, it is
  -- deleted — it was never a document.
  if old.status <> new.status then
    if not (
      (old.status = 'draft'  and new.status = 'issued') or
      (old.status = 'issued' and new.status = 'void')
    ) then
      raise exception 'Cannot move invoice from % to %.', old.status, new.status
        using errcode = 'check_violation';
    end if;
  end if;

  -- sync_invoice_total() is the one writer of total_usd, and it cannot run on a
  -- non-draft invoice because the line trigger above blocks the write that would
  -- call it. So any change to a financial field here came from a caller.
  if old.status <> 'draft' then
    if new.invoice_number is distinct from old.invoice_number
       or new.total_usd    is distinct from old.total_usd
       or new.quote_id     is distinct from old.quote_id
       or new.booking_id   is distinct from old.booking_id
       or new.issue_date   is distinct from old.issue_date
       or new.currency     is distinct from old.currency
       or new.client_name  is distinct from old.client_name then
      raise exception
        'Invoice % is % and can no longer be edited. Void it and issue a new one.',
        coalesce(old.invoice_number, old.id::text), old.status
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;


--
-- Name: assert_quote_version_mutable(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assert_quote_version_mutable(p_version_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: assign_invoice_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_invoice_number() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_due_days integer;
begin
  if new.status = 'issued' and (tg_op = 'INSERT' or old.status <> 'issued') then
    new.invoice_number := coalesce(new.invoice_number, next_invoice_number());
    new.issued_at      := coalesce(new.issued_at, now());
    new.issue_date     := coalesce(new.issue_date, current_date);

    if new.due_date is null then
      select coalesce(balance_due_days, 30) into v_due_days
        from company_settings order by created_at limit 1;
      new.due_date := new.issue_date + coalesce(v_due_days, 30);
    end if;
  end if;

  if new.status = 'void' and (tg_op = 'INSERT' or old.status <> 'void') then
    new.voided_at := coalesce(new.voided_at, now());
  end if;

  -- A void invoice keeps its number and its lines; what it loses is the claim
  -- on the client, so it must not be counted as owed anywhere.
  return new;
end;
$$;


--
-- Name: auto_advance_request_stage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_advance_request_stage() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_request uuid;
  v_stage   text;
begin
  select q.request_id into v_request from quotes q where q.id = new.quote_id;
  if v_request is null then
    return new;
  end if;

  select stage into v_stage from requests where id = v_request;

  if new.status in ('sent', 'viewed') and v_stage in ('new', 'working_on') then
    update requests set stage = 'open' where id = v_request and stage in ('new', 'working_on');
  elsif v_stage = 'new' then
    update requests set stage = 'working_on' where id = v_request and stage = 'new';
  end if;

  return new;
end;
$$;


--
-- Name: copy_quote_as_new(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.copy_quote_as_new(p_source_quote_id uuid, p_request_id uuid, p_client_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  return copy_quote_for_client(p_source_quote_id, p_client_id, p_request_id);
end;
$$;


--
-- Name: copy_quote_for_client(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.copy_quote_for_client(p_source_quote_id uuid, p_client_id uuid, p_request_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_src_version   uuid;
  v_new_quote     uuid;
  v_new_version   uuid;
  v_day           record;
  v_new_day       uuid;
begin
  if p_client_id is null then
    raise exception 'A client is required to copy a quote';
  end if;

  -- Resolve the source's accepted-or-latest version.
  select coalesce(q.accepted_version_id, qv.id)
    into v_src_version
  from quotes q
  join quote_versions qv on qv.quote_id = q.id
  where q.id = p_source_quote_id
  order by qv.version_number desc
  limit 1;

  if v_src_version is null then
    raise exception 'Source quote % has no versions to copy', p_source_quote_id;
  end if;

  -- New quote shell (quote_number auto-generates via default). request_id may
  -- be null — a client-direct copy that isn't tied to a request yet.
  insert into quotes (request_id, client_id, mode, is_template)
  values (p_request_id, p_client_id, 'custom', false)
  returning id into v_new_quote;

  -- Clone the version header (reset identity/lifecycle fields).
  insert into quote_versions (
    quote_id, version_number, status, title, language, currency,
    travel_start_date, travel_end_date, valid_until,
    default_markup_percent, category_markup_overrides,
    discount_type, discount_value, discount_reason, discount_client_label,
    total_cost_usd, total_selling_usd, gross_margin_usd, gross_margin_percent,
    sharing_price_per_person_usd, single_price_per_person_usd, single_supplement_usd,
    exchange_rates_snapshot, inclusions, exclusions, internal_notes
  )
  select
    v_new_quote, 1, 'draft', title, language, currency,
    travel_start_date, travel_end_date, valid_until,
    default_markup_percent, category_markup_overrides,
    discount_type, discount_value, discount_reason, discount_client_label,
    total_cost_usd, total_selling_usd, gross_margin_usd, gross_margin_percent,
    sharing_price_per_person_usd, single_price_per_person_usd, single_supplement_usd,
    exchange_rates_snapshot, inclusions, exclusions, internal_notes
  from quote_versions where id = v_src_version
  returning id into v_new_version;

  -- Clone days.
  for v_day in
    select * from quote_days where quote_version_id = v_src_version order by day_number
  loop
    insert into quote_days (
      quote_version_id, day_number, day_date, title, description_en, description_ar,
      destination_id, destination_snapshot, meals, client_notes, internal_notes, sort_order
    )
    values (
      v_new_version, v_day.day_number, v_day.day_date, v_day.title,
      v_day.description_en, v_day.description_ar, v_day.destination_id,
      v_day.destination_snapshot, v_day.meals, v_day.client_notes,
      v_day.internal_notes, v_day.sort_order
    )
    returning id into v_new_day;

    -- Clone this day's items.
    insert into quote_day_items (
      quote_day_id, item_type, accommodation_id, activity_id, vehicle_id, staff_id,
      title_snapshot, content_snapshot, start_time, end_time, room_category,
      client_notes, internal_notes, sort_order
    )
    select
      v_new_day, item_type, accommodation_id, activity_id, vehicle_id, staff_id,
      title_snapshot, content_snapshot, start_time, end_time, room_category,
      client_notes, internal_notes, sort_order
    from quote_day_items where quote_day_id = v_day.id;
  end loop;

  -- Clone version-level price lines (day-tied lines are re-derived by the trip
  -- builder, matching copy_quote_as_new's convention).
  insert into quote_price_lines (
    quote_version_id, cost_category, description, rate_card_id, supplier_rate_id,
    pricing_unit, traveller_category, room_category, quantity, allocated_people,
    source_currency, source_unit_cost, exchange_rate_to_usd, unit_cost_usd,
    original_unit_cost_usd, is_manual_override, override_reason,
    markup_percent_override, total_cost_usd, total_selling_usd,
    is_optional, is_client_visible, internal_notes, sort_order
  )
  select
    v_new_version, cost_category, description, rate_card_id, supplier_rate_id,
    pricing_unit, traveller_category, room_category, quantity, allocated_people,
    source_currency, source_unit_cost, exchange_rate_to_usd, unit_cost_usd,
    original_unit_cost_usd, is_manual_override, override_reason,
    markup_percent_override, total_cost_usd, total_selling_usd,
    is_optional, is_client_visible, internal_notes, sort_order
  from quote_price_lines
  where quote_version_id = v_src_version and quote_day_id is null;

  return v_new_quote;
end;
$$;


--
-- Name: create_quote_with_version(uuid, uuid, text, uuid, uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_quote_with_version(p_client_id uuid, p_request_id uuid, p_mode text, p_tour_id uuid, p_departure_id uuid, p_title text, p_created_by uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_quote_id uuid;
  v_tour_id uuid := p_tour_id;
  v_start_date date;
  v_end_date date;
  v_client_snapshot jsonb;
  v_company_snapshot jsonb := '{}'::jsonb;
  v_policy_snapshot jsonb := '{}'::jsonb;
  v_default_markup numeric(7,2) := 0;
  v_version_id uuid;
  v_request_nights smallint;
  v_request_start date;
  v_request_tour_id uuid;
  v_day_count int;
  v_meals text[];
  v_td record;
  v_quote_day_id uuid;
  v_dest_snapshot jsonb;
  v_acc record;
  v_act jsonb;
  v_act_row record;
  v_sort int;
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

  -- Custom mode bound to a request: pull trip-length/date to seed dates + day
  -- count, and fall back to the request's linked tour only if the caller
  -- didn't already pass an explicit p_tour_id (e.g. a template picked in the
  -- "custom" quote form takes precedence over the request's own tour link).
  if p_mode = 'custom' and p_request_id is not null then
    select tour_id, trip_length_nights, preferred_start_date
      into v_request_tour_id, v_request_nights, v_request_start
    from requests where id = p_request_id;

    if v_tour_id is null then
      v_tour_id := v_request_tour_id;
    end if;

    if v_tour_id is not null then
      v_start_date := v_request_start;
    elsif v_request_start is not null then
      v_start_date := v_request_start;
      if v_request_nights is not null then
        v_end_date := v_request_start + v_request_nights;
      end if;
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
  ) returning id into v_version_id;

  -- ── Day-skeleton pre-fill ────────────────────────────────────────────────
  if v_tour_id is not null then
    -- Deep-copy the tour's curated itinerary (richest pre-fill).
    for v_td in select * from tour_days where tour_id = v_tour_id order by day_number loop
      v_meals := array_remove(array[
        case when v_td.meal_breakfast then 'B' end,
        case when v_td.meal_lunch then 'L' end,
        case when v_td.meal_dinner then 'D' end
      ], null);

      v_dest_snapshot := '{}'::jsonb;
      if v_td.destination_id is not null then
        select jsonb_build_object('id', id, 'name', name) into v_dest_snapshot
        from destinations where id = v_td.destination_id;
        v_dest_snapshot := coalesce(v_dest_snapshot, '{}'::jsonb);
      end if;

      insert into quote_days (
        quote_version_id, day_number, day_number_end,
        day_date, title, title_ar, description_en, description_ar,
        destination_id, destination_snapshot, meals, activities, photos, sort_order
      ) values (
        v_version_id, v_td.day_number, v_td.day_number_end,
        case when v_start_date is not null then v_start_date + (v_td.day_number - 1) else null end,
        v_td.title_en, v_td.title_ar, v_td.description_en, v_td.description_ar,
        v_td.destination_id, v_dest_snapshot, v_meals, coalesce(v_td.activities, '[]'::jsonb),
        case when v_td.image_url is not null then array[v_td.image_url] else '{}'::text[] end,
        v_td.day_number
      ) returning id into v_quote_day_id;

      v_sort := 0;

      if v_td.accommodation_id is not null then
        select id, name, destination_id, description_en into v_acc
        from accommodations where id = v_td.accommodation_id;
        if v_acc.id is not null then
          insert into quote_day_items (
            quote_day_id, item_type, accommodation_id, title_snapshot, content_snapshot, sort_order
          ) values (
            v_quote_day_id, 'accommodation', v_acc.id, v_acc.name,
            jsonb_build_object('destination_id', v_acc.destination_id, 'description_en', v_acc.description_en),
            v_sort
          );
          v_sort := v_sort + 1;
        end if;
      end if;

      for v_act in select value from jsonb_array_elements(coalesce(v_td.activities, '[]'::jsonb)) loop
        if nullif(v_act->>'activity_id', '') is not null then
          select id, name into v_act_row from activities where id = (v_act->>'activity_id')::uuid;
          if v_act_row.id is not null then
            insert into quote_day_items (
              quote_day_id, item_type, activity_id, title_snapshot, content_snapshot, sort_order
            ) values (
              v_quote_day_id, 'activity', v_act_row.id, v_act_row.name,
              jsonb_build_object(
                'moment', nullif(v_act->>'moment', ''),
                'optional', coalesce((v_act->>'optional')::boolean, false),
                'day_offset', coalesce((v_act->>'day_offset')::int, 0)
              ),
              v_sort
            );
            v_sort := v_sort + 1;
          end if;
        end if;
      end loop;
    end loop;
  elsif v_request_nights is not null and v_request_nights > 0 then
    -- No tour linked — generate blank day rows from the request's trip length.
    v_day_count := v_request_nights + 1;
    for i in 1..v_day_count loop
      insert into quote_days (quote_version_id, day_number, day_date, sort_order)
      values (
        v_version_id, i,
        case when v_start_date is not null then v_start_date + (i - 1) else null end,
        i
      );
    end loop;
  end if;

  return v_quote_id;
end;
$$;


--
-- Name: enforce_direct_quote_child_mutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_direct_quote_child_mutable() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if tg_op = 'DELETE' then
    -- Cascade from deleting the version/quote → the version row is already
    -- gone; nothing to protect. Only a *direct* child delete against a still-
    -- existing (locked) version should be blocked.
    if exists (select 1 from quote_versions where id = old.quote_version_id) then
      perform assert_quote_version_mutable(old.quote_version_id);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    perform assert_quote_version_mutable(old.quote_version_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform assert_quote_version_mutable(new.quote_version_id);
  end if;
  return new;
end;
$$;


--
-- Name: enforce_quote_day_item_mutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_quote_day_item_mutable() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_version_id uuid;
begin
  if tg_op = 'DELETE' then
    select quote_version_id into v_version_id from quote_days where id = old.quote_day_id;
    -- Parent day gone (cascade) or version gone (cascade) → allow. Only guard a
    -- direct item delete while both the day and its (locked) version remain.
    if v_version_id is not null
       and exists (select 1 from quote_versions where id = v_version_id) then
      perform assert_quote_version_mutable(v_version_id);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    select quote_version_id into v_version_id from quote_days where id = old.quote_day_id;
    if v_version_id is not null then
      perform assert_quote_version_mutable(v_version_id);
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select quote_version_id into v_version_id from quote_days where id = new.quote_day_id;
    perform assert_quote_version_mutable(v_version_id);
  end if;
  return new;
end;
$$;


--
-- Name: generate_booking_tasks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_booking_tasks() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  v_sort   integer := 0;
  v_total  numeric(14,2);
  v_day    record;
begin
  if new.stage = 'booked' and (old.stage is distinct from new.stage) then
    -- Guard against double-generation if a request re-enters 'booked'.
    if exists (select 1 from tasks where request_id = new.id and auto_generated) then
      return new;
    end if;

    -- 1) Payment task for the accepted (or latest) quote's selling total.
    select coalesce(qv.total_selling_usd, 0) into v_total
    from quotes q
    join quote_versions qv
      on qv.id = coalesce(q.accepted_version_id, qv.id)
    where q.request_id = new.id
    order by qv.version_number desc
    limit 1;

    insert into tasks (request_id, title, type, auto_generated, sort_order)
    values (
      new.id,
      case when v_total is not null and v_total > 0
        then format('Collect payment — total $%s', trim(to_char(v_total, 'FM999,999,990.00')))
        else 'Collect deposit / balance payment' end,
      'payment', true, v_sort
    );
    v_sort := v_sort + 10;

    -- 2) Company default tasks.
    insert into tasks (request_id, title, type, auto_generated, sort_order)
    select new.id, dt.description, dt.type, true, v_sort + (dt.sort_order)
    from default_tasks dt
    where dt.is_active and dt.stage = 'booked'
    order by dt.sort_order;
    v_sort := v_sort + 1000;

    -- 3) One task per accommodation item on the accepted/latest version's days.
    for v_day in
      select distinct qdi.title_snapshot, qd.day_number
      from quotes q
      join quote_versions qv on qv.id = coalesce(q.accepted_version_id, qv.id)
      join quote_days qd on qd.quote_version_id = qv.id
      join quote_day_items qdi on qdi.quote_day_id = qd.id
      where q.request_id = new.id
        and qdi.item_type = 'accommodation'
      order by qd.day_number
    loop
      insert into tasks (request_id, title, type, auto_generated, sort_order)
      values (
        new.id,
        format('Confirm accommodation: %s (Day %s)', v_day.title_snapshot, v_day.day_number),
        'accommodation', true, v_sort
      );
      v_sort := v_sort + 10;
    end loop;
  end if;
  return new;
end;
$_$;


--
-- Name: generate_quote_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_quote_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
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


--
-- Name: is_admin_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_user() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.admin_users a
    where a.email = (auth.jwt() ->> 'email')
      and a.is_active
  );
$$;


--
-- Name: log_request_stage_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_request_stage_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.stage is distinct from old.stage then
    insert into communication_logs (request_id, type, summary)
    values (new.id, 'note', format('Status changed: %s → %s', coalesce(old.stage, '—'), new.stage));
  end if;
  return new;
end;
$$;


--
-- Name: next_invoice_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.next_invoice_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_prefix text;
begin
  select coalesce(nullif(btrim(invoice_prefix), ''), 'INV')
    into v_prefix
    from company_settings
    order by created_at
    limit 1;

  return coalesce(v_prefix, 'INV') || '-' || lpad(nextval('invoice_number_seq')::text, 4, '0');
end;
$$;


--
-- Name: requests_stamp_status_changed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.requests_stamp_status_changed() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if new.stage is distinct from old.stage then
    new.status_changed_at = now();
    if new.stage = 'archived' then
      new.archived_at = coalesce(new.archived_at, now());
    else
      new.archived_at = null;
    end if;
  end if;
  return new;
end;
$$;


--
-- Name: save_quote_itinerary(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_quote_itinerary(p_version_id uuid, p_days jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
        day_number          = (v_day->>'dayNumber')::integer,
        day_number_end      = nullif(v_day->>'dayNumberEnd', '')::integer,
        day_date            = nullif(v_day->>'dayDate', '')::date,
        title               = nullif(trim(v_day->>'title'), ''),
        description_en      = nullif(v_day->>'descriptionEn', ''),
        client_notes        = nullif(v_day->>'clientNotes', ''),
        title_ar            = nullif(trim(v_day->>'titleAr'), ''),
        description_ar      = nullif(v_day->>'descriptionAr', ''),
        client_notes_ar     = nullif(v_day->>'clientNotesAr', ''),
        destination_id      = nullif(v_day->>'destinationId', '')::uuid,
        destination_snapshot= coalesce(v_day->'destinationSnapshot', '{}'::jsonb),
        meals               = coalesce(array(select jsonb_array_elements_text(v_day->'meals')), '{}'::text[]),
        photos              = coalesce(array(select jsonb_array_elements_text(v_day->'photos')), '{}'::text[]),
        distance_km         = nullif(v_day->>'distanceKm', '')::numeric,
        road_distance_km    = nullif(v_day->>'roadDistanceKm', '')::numeric,
        sort_order          = v_day_index
      where id = v_existing_id and quote_version_id = p_version_id
      returning id into v_day_id;

      if v_day_id is null then
        raise exception 'A quote day does not belong to this version.';
      end if;
    else
      insert into quote_days (
        quote_version_id, day_number, day_number_end, day_date,
        title, description_en, client_notes,
        title_ar, description_ar, client_notes_ar,
        destination_id, destination_snapshot, meals, photos,
        distance_km, road_distance_km, sort_order
      ) values (
        p_version_id,
        (v_day->>'dayNumber')::integer,
        nullif(v_day->>'dayNumberEnd', '')::integer,
        nullif(v_day->>'dayDate', '')::date,
        nullif(trim(v_day->>'title'), ''),
        nullif(v_day->>'descriptionEn', ''),
        nullif(v_day->>'clientNotes', ''),
        nullif(trim(v_day->>'titleAr'), ''),
        nullif(v_day->>'descriptionAr', ''),
        nullif(v_day->>'clientNotesAr', ''),
        nullif(v_day->>'destinationId', '')::uuid,
        coalesce(v_day->'destinationSnapshot', '{}'::jsonb),
        coalesce(array(select jsonb_array_elements_text(v_day->'meals')), '{}'::text[]),
        coalesce(array(select jsonb_array_elements_text(v_day->'photos')), '{}'::text[]),
        nullif(v_day->>'distanceKm', '')::numeric,
        nullif(v_day->>'roadDistanceKm', '')::numeric,
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


--
-- Name: save_trip(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_trip(p_payload jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_quote_id uuid := nullif(p_payload->>'quoteId', '')::uuid;
  v_client_id uuid := nullif(p_payload->>'clientId', '')::uuid;
  v_compare_group uuid := nullif(p_payload->>'compareGroup', '')::uuid;
  v_start date := nullif(p_payload->>'travelStartDate', '')::date;
  v_end date := nullif(p_payload->>'travelEndDate', '')::date;
  v_title text := nullif(trim(coalesce(p_payload->>'title', '')), '');
  v_created_by uuid := nullif(p_payload->>'createdBy', '')::uuid;
  v_fx jsonb := coalesce(p_payload->'exchangeRatesSnapshot', '{}'::jsonb);
  v_builder_state jsonb := p_payload->'builderState';
  v_client_snapshot jsonb;
  v_company_snapshot jsonb := '{}'::jsonb;
  v_policy_snapshot jsonb := '{}'::jsonb;
  v_quote_status text;
  v_track jsonb;
  v_traveller jsonb;
  v_day jsonb;
  v_item jsonb;
  v_line jsonb;
  v_version_id uuid;
  v_version_number integer;
  v_is_new_version boolean;
  v_source_version_id uuid;
  v_day_id uuid;
  v_day_number integer;
  v_day_numbers integer[];
  v_covered_days integer[];
  v_item_index integer;
  v_total_cost numeric(14,2);
  v_total_selling numeric(14,2);
  v_paying integer;
  v_result jsonb := '{}'::jsonb;
begin
  if v_client_id is null then
    raise exception 'A client is required.';
  end if;
  if v_start is null or v_end is null or v_end < v_start then
    raise exception 'Valid travel dates are required.';
  end if;
  if jsonb_typeof(p_payload->'tracks') <> 'array'
     or jsonb_array_length(p_payload->'tracks') = 0 then
    raise exception 'At least one track is required.';
  end if;

  -- Snapshots, same shape as create_quote_with_version (group_17).
  select jsonb_build_object(
    'first_name', first_name,
    'last_name', last_name,
    'email', email,
    'phone', phone,
    'country', country,
    'language', coalesce(nullif(preferred_language, ''), nullif(language, ''), 'en')
  ) into v_client_snapshot
  from clients where id = v_client_id;

  if v_client_snapshot is null then
    raise exception 'Client not found.';
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
    )
  into v_company_snapshot, v_policy_snapshot
  from company_settings
  limit 1;

  if v_quote_id is null then
    insert into quotes (client_id, mode, status, created_by)
    values (v_client_id, 'custom', 'draft', v_created_by)
    returning id into v_quote_id;
  else
    select status into v_quote_status from quotes where id = v_quote_id;
    if v_quote_status is null then
      raise exception 'Quote not found.';
    end if;
    if v_quote_status not in ('draft', 'ready') then
      raise exception 'This quote is no longer editable (status %).', v_quote_status;
    end if;
    update quotes set client_id = v_client_id where id = v_quote_id;
  end if;

  -- Narrative source for brand-new track versions: the quote's latest version
  -- that already has itinerary days (e.g. the wizard-created v1 the itinerary
  -- builder wrote to). Computed once, before this save adds new versions.
  select qv.id into v_source_version_id
  from quote_versions qv
  where qv.quote_id = v_quote_id
    and exists (select 1 from quote_days qd where qd.quote_version_id = qv.id)
  order by qv.version_number desc
  limit 1;

  for v_track in select value from jsonb_array_elements(p_payload->'tracks')
  loop
    if v_track->>'trackLabel' is not null
       and v_track->>'trackLabel' not in ('standard', 'premium') then
      raise exception 'Track label must be standard or premium.';
    end if;

    v_version_id := nullif(v_track->>'versionId', '')::uuid;
    v_is_new_version := v_version_id is null;

    if v_version_id is null then
      select coalesce(max(version_number), 0) + 1 into v_version_number
      from quote_versions where quote_id = v_quote_id;

      insert into quote_versions (
        quote_id, version_number, status, title,
        travel_start_date, travel_end_date, valid_until,
        default_markup_percent, exchange_rates_snapshot,
        company_snapshot, client_snapshot, policy_snapshot,
        track_label, compare_group, builder_state, created_by
      ) values (
        v_quote_id, v_version_number, 'draft', v_title,
        v_start, v_end, current_date + 14,
        greatest(coalesce((v_track->>'defaultMarkupPercent')::numeric, 0), 0), v_fx,
        coalesce(v_company_snapshot, '{}'::jsonb), v_client_snapshot,
        coalesce(v_policy_snapshot, '{}'::jsonb),
        v_track->>'trackLabel', v_compare_group, v_builder_state, v_created_by
      ) returning id into v_version_id;
    else
      perform assert_quote_version_mutable(v_version_id);

      update quote_versions set
        title = v_title,
        travel_start_date = v_start,
        travel_end_date = v_end,
        default_markup_percent = greatest(coalesce((v_track->>'defaultMarkupPercent')::numeric, 0), 0),
        exchange_rates_snapshot = v_fx,
        client_snapshot = v_client_snapshot,
        track_label = v_track->>'trackLabel',
        compare_group = v_compare_group,
        builder_state = v_builder_state
      where id = v_version_id and quote_id = v_quote_id;

      if not found then
        raise exception 'A version does not belong to this quote.';
      end if;
    end if;

    -- New version: seed the itinerary narrative from the source version so
    -- days written in the itinerary builder carry over to the priced tracks.
    -- day_number_end is copied so multi-night spans survive version creation.
    if v_is_new_version and v_source_version_id is not null then
      insert into quote_days (
        quote_version_id, day_number, day_number_end, day_date, title, title_ar,
        description_en, description_ar, destination_id, destination_snapshot,
        meals, client_notes, client_notes_ar, internal_notes, activities, sort_order
      )
      select
        v_version_id, sd.day_number, sd.day_number_end, sd.day_date, sd.title, sd.title_ar,
        sd.description_en, sd.description_ar, sd.destination_id, sd.destination_snapshot,
        sd.meals, sd.client_notes, sd.client_notes_ar, sd.internal_notes, sd.activities, sd.sort_order
      from quote_days sd
      where sd.quote_version_id = v_source_version_id;

      -- Copy narrative items (itinerary-authored). Trip Builder items —
      -- tagged source='trip_builder', or legacy '{}' snapshots from the old
      -- save_trip — are derived pricing artefacts and are rebuilt below.
      insert into quote_day_items (
        quote_day_id, item_type, accommodation_id, activity_id, vehicle_id, staff_id,
        title_snapshot, content_snapshot, start_time, end_time, room_category,
        client_notes, internal_notes, sort_order
      )
      select
        nd.id, i.item_type, i.accommodation_id, i.activity_id, i.vehicle_id, i.staff_id,
        i.title_snapshot, i.content_snapshot, i.start_time, i.end_time, i.room_category,
        i.client_notes, i.internal_notes, i.sort_order
      from quote_day_items i
      join quote_days sd on sd.id = i.quote_day_id
                        and sd.quote_version_id = v_source_version_id
      join quote_days nd on nd.quote_version_id = v_version_id
                        and nd.day_number = sd.day_number
      where coalesce(i.content_snapshot->>'source', '') <> 'trip_builder'
        and i.content_snapshot <> '{}'::jsonb;
    end if;

    -- Travellers and price lines are pricing data — fully rewritten each save.
    delete from quote_price_lines where quote_version_id = v_version_id;
    delete from quote_travellers where quote_version_id = v_version_id;

    -- Drop only the Trip Builder's own items; itinerary-authored items stay.
    delete from quote_day_items i
    using quote_days d
    where d.id = i.quote_day_id
      and d.quote_version_id = v_version_id
      and (i.content_snapshot->>'source' = 'trip_builder'
           or i.content_snapshot = '{}'::jsonb);

    -- Remove days that fall outside the (possibly shortened) trip.
    select coalesce(array_agg((value->>'dayNumber')::integer), '{}'::integer[])
      into v_day_numbers
    from jsonb_array_elements(coalesce(v_track->'days', '[]'::jsonb));

    -- Day numbers that are folded into another row's multi-night span. These
    -- must NOT get their own row — the span row owns them.
    select coalesce(array_agg(gs.d), '{}'::integer[])
      into v_covered_days
    from quote_days qd
    cross join lateral generate_series(qd.day_number + 1, qd.day_number_end) as gs(d)
    where qd.quote_version_id = v_version_id
      and qd.day_number_end is not null
      and qd.day_number_end > qd.day_number;

    delete from quote_days
    where quote_version_id = v_version_id
      and (not (day_number = any(v_day_numbers)) or day_number = any(v_covered_days));

    for v_traveller in
      select value from jsonb_array_elements(coalesce(v_track->'travellers', '[]'::jsonb))
    loop
      insert into quote_travellers (
        quote_version_id, display_name, age_on_travel_date,
        age_band_id, age_band_snapshot, traveller_category, room_category,
        is_paying, sort_order
      ) values (
        v_version_id,
        nullif(trim(coalesce(v_traveller->>'displayName', '')), ''),
        nullif(v_traveller->>'ageOnTravelDate', '')::integer,
        nullif(v_traveller->>'ageBandId', '')::uuid,
        coalesce(v_traveller->'ageBandSnapshot', '{}'::jsonb),
        coalesce(nullif(v_traveller->>'travellerCategory', ''), 'adult'),
        coalesce(nullif(v_traveller->>'roomCategory', ''), 'sharing'),
        coalesce((v_traveller->>'isPaying')::boolean, true),
        coalesce((v_traveller->>'sortOrder')::integer, 0)
      );
    end loop;

    for v_day in
      select value from jsonb_array_elements(coalesce(v_track->'days', '[]'::jsonb))
    loop
      v_day_number := coalesce((v_day->>'dayNumber')::integer, 0);
      if v_day_number < 1 then
        raise exception 'Every day must have a positive day number.';
      end if;

      -- Skip days folded into a multi-night span: creating a standalone row
      -- for them produces a redundant blank day in the proposal.
      if v_day_number = any(v_covered_days) then
        continue;
      end if;

      -- Upsert by (version, day_number): refresh the date/sort, keep all
      -- narrative columns exactly as the itinerary builder left them.
      -- (Manual update-then-insert: the unique constraint is deferrable, so
      -- INSERT ... ON CONFLICT cannot target it.)
      v_day_id := null;
      update quote_days set
        day_date = nullif(v_day->>'dayDate', '')::date,
        title = coalesce(title, nullif(trim(coalesce(v_day->>'title', '')), '')),
        sort_order = v_day_number
      where quote_version_id = v_version_id
        and day_number = v_day_number
      returning id into v_day_id;

      if v_day_id is null then
        insert into quote_days (quote_version_id, day_number, day_date, title, sort_order)
        values (
          v_version_id,
          v_day_number,
          nullif(v_day->>'dayDate', '')::date,
          nullif(trim(coalesce(v_day->>'title', '')), ''),
          v_day_number
        ) returning id into v_day_id;
      end if;

      v_item_index := 0;
      for v_item in
        select value from jsonb_array_elements(coalesce(v_day->'items', '[]'::jsonb))
      loop
        insert into quote_day_items (
          quote_day_id, item_type,
          accommodation_id, activity_id, vehicle_id, staff_id,
          title_snapshot, content_snapshot, room_category, sort_order
        ) values (
          v_day_id,
          v_item->>'itemType',
          case when v_item->>'itemType' = 'accommodation' then nullif(v_item->>'entityId', '')::uuid end,
          case when v_item->>'itemType' = 'activity' then nullif(v_item->>'entityId', '')::uuid end,
          case when v_item->>'itemType' = 'vehicle' then nullif(v_item->>'entityId', '')::uuid end,
          case when v_item->>'itemType' = 'staff' then nullif(v_item->>'entityId', '')::uuid end,
          coalesce(nullif(trim(coalesce(v_item->>'titleSnapshot', '')), ''), 'Untitled item'),
          jsonb_build_object('source', 'trip_builder'),
          nullif(v_item->>'roomCategory', ''),
          coalesce((v_item->>'sortOrder')::integer, v_item_index)
        );
        v_item_index := v_item_index + 1;
      end loop;
    end loop;

    for v_line in
      select value from jsonb_array_elements(coalesce(v_track->'priceLines', '[]'::jsonb))
    loop
      insert into quote_price_lines (
        quote_version_id, quote_day_id, cost_category, description,
        rate_card_id, supplier_rate_id, pricing_unit,
        traveller_category, room_category, quantity,
        source_currency, source_unit_cost, exchange_rate_to_usd, unit_cost_usd,
        original_unit_cost_usd, is_manual_override, override_reason,
        total_cost_usd, total_selling_usd, internal_notes, sort_order
      ) values (
        v_version_id,
        case when nullif(v_line->>'dayNumber', '') is not null then (
          select qd.id from quote_days qd
          where qd.quote_version_id = v_version_id
            and qd.day_number = (v_line->>'dayNumber')::integer
        ) end,
        v_line->>'costCategory',
        coalesce(nullif(trim(coalesce(v_line->>'description', '')), ''), 'Untitled line'),
        nullif(v_line->>'rateCardId', '')::uuid,
        nullif(v_line->>'supplierRateId', '')::uuid,
        v_line->>'pricingUnit',
        nullif(v_line->>'travellerCategory', ''),
        nullif(v_line->>'roomCategory', ''),
        coalesce((v_line->>'quantity')::numeric, 1),
        coalesce(nullif(v_line->>'sourceCurrency', ''), 'USD'),
        coalesce((v_line->>'sourceUnitCost')::numeric, 0),
        coalesce((v_line->>'exchangeRateToUsd')::numeric, 1),
        coalesce((v_line->>'unitCostUsd')::numeric, 0),
        nullif(v_line->>'originalUnitCostUsd', '')::numeric,
        coalesce((v_line->>'isManualOverride')::boolean, false),
        -- is_manual_override rows must carry a reason (group_12 check).
        case when coalesce((v_line->>'isManualOverride')::boolean, false)
          then coalesce(nullif(v_line->>'overrideReason', ''), 'Manual price entered in Trip Builder')
        end,
        coalesce((v_line->>'totalCostUsd')::numeric, 0),
        coalesce((v_line->>'totalSellingUsd')::numeric, 0),
        nullif(v_line->>'internalNotes', ''),
        coalesce((v_line->>'sortOrder')::integer, 0)
      );
    end loop;

    -- Version totals come from the rows actually written, never the client.
    select coalesce(sum(total_cost_usd), 0), coalesce(sum(total_selling_usd), 0)
      into v_total_cost, v_total_selling
    from quote_price_lines
    where quote_version_id = v_version_id and not is_optional;

    select count(*) into v_paying
    from quote_travellers
    where quote_version_id = v_version_id and is_paying;

    update quote_versions set
      total_cost_usd = v_total_cost,
      total_selling_usd = v_total_selling,
      gross_margin_usd = v_total_selling - v_total_cost,
      gross_margin_percent = case when v_total_selling > 0
        then round((v_total_selling - v_total_cost) / v_total_selling * 100, 2) else 0 end,
      sharing_price_per_person_usd = case when v_paying > 0
        then round(v_total_selling / v_paying, 2) end
    where id = v_version_id;

    v_result := v_result || jsonb_build_object('versionId', v_version_id);
  end loop;

  v_result := v_result || jsonb_build_object(
    'quoteId', v_quote_id,
    'compareGroup', v_compare_group
  );
  return v_result;
end;
$$;


--
-- Name: slugify(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.slugify(value text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select nullif(
    trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g')),
    ''
  )
$$;


--
-- Name: sync_invoice_total(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_invoice_total() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.invoice_id is not null then
    update invoices
       set total_usd = (select coalesce(sum(total_usd), 0) from invoice_lines where invoice_id = old.invoice_id)
     where id = old.invoice_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.invoice_id is not null then
    update invoices
       set total_usd = (select coalesce(sum(total_usd), 0) from invoice_lines where invoice_id = new.invoice_id)
     where id = new.invoice_id;
  end if;

  return null;
end;
$$;


--
-- Name: tours_set_slug(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tours_set_slug() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: tours_unique_slug(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tours_unique_slug(base text, exclude_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accommodations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accommodations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    destination_id uuid,
    type text DEFAULT 'hotel'::text NOT NULL,
    budget_tier text DEFAULT 'midrange'::text NOT NULL,
    rating integer DEFAULT 4,
    description_en text,
    description_ar text,
    cover_image_url text,
    is_active boolean DEFAULT true NOT NULL,
    has_content boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gallery_urls text[] DEFAULT '{}'::text[] NOT NULL,
    video_urls text[] DEFAULT '{}'::text[] NOT NULL,
    latitude double precision,
    longitude double precision,
    google_maps_url text,
    google_place_id text
);


--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    destination_id uuid,
    description_en text,
    description_ar text,
    cover_image_url text,
    is_active boolean DEFAULT true NOT NULL,
    has_content boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    duration_hours numeric,
    extra_cost_usd numeric,
    is_optional boolean DEFAULT false NOT NULL,
    video_url text
);


--
-- Name: activity_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    activity_id uuid NOT NULL,
    destination_id uuid,
    park_id uuid,
    label_en text,
    label_ar text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT activity_locations_place_chk CHECK (((destination_id IS NOT NULL) OR (park_id IS NOT NULL)))
);


--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    actor_email text,
    entity_type text NOT NULL,
    entity_id uuid,
    action text NOT NULL,
    summary text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    full_name text,
    role text DEFAULT 'admin'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agreement_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agreement_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    version_label text,
    language text DEFAULT 'en'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agreement_templates_language_check CHECK ((language = ANY (ARRAY['en'::text, 'ar'::text])))
);


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: booking_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    departure_id uuid NOT NULL,
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    label text,
    language text DEFAULT 'en'::text NOT NULL,
    max_bookings integer,
    use_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT booking_links_language_check CHECK ((language = ANY (ARRAY['en'::text, 'ar'::text]))),
    CONSTRAINT booking_links_max_bookings_check CHECK (((max_bookings IS NULL) OR (max_bookings > 0))),
    CONSTRAINT booking_links_use_count_check CHECK ((use_count >= 0))
);


--
-- Name: booking_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    amount_usd numeric(12,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    method text,
    reference text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT booking_payments_amount_usd_check CHECK ((amount_usd >= (0)::numeric)),
    CONSTRAINT booking_payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'refunded'::text, 'cancelled'::text])))
);


--
-- Name: booking_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: booking_traveller_flights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_traveller_flights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_traveller_id uuid NOT NULL,
    direction text DEFAULT 'arrival'::text NOT NULL,
    flight_number text,
    airline text,
    scheduled_at timestamp with time zone,
    airport text,
    notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT booking_traveller_flights_direction_check CHECK ((direction = ANY (ARRAY['arrival'::text, 'departure'::text])))
);


--
-- Name: booking_travellers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_travellers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    first_name text,
    last_name text,
    email text,
    phone text,
    date_of_birth date,
    nationality text,
    passport_number text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    motorbike_id uuid,
    is_rider boolean DEFAULT true NOT NULL,
    dietary_requirements text,
    allergies text,
    emergency_contact text,
    room_label text,
    room_type text
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    departure_id uuid,
    number_of_travellers integer NOT NULL,
    total_price_usd numeric(14,2) NOT NULL,
    status text DEFAULT 'confirmed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    request_id uuid,
    start_date date,
    end_date date,
    deposit_due_usd numeric(12,2) DEFAULT 0 NOT NULL,
    room_type text,
    client_id uuid,
    quote_id uuid,
    CONSTRAINT bookings_date_order_chk CHECK (((start_date IS NULL) OR (end_date IS NULL) OR (end_date >= start_date))),
    CONSTRAINT bookings_deposit_due_usd_chk CHECK ((deposit_due_usd >= (0)::numeric)),
    CONSTRAINT bookings_number_of_travellers_check CHECK ((number_of_travellers > 0)),
    CONSTRAINT bookings_room_type_chk CHECK (((room_type IS NULL) OR (room_type = ANY (ARRAY['sharing'::text, 'single'::text])))),
    CONSTRAINT bookings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text]))),
    CONSTRAINT bookings_total_price_usd_check CHECK ((total_price_usd >= (0)::numeric))
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text DEFAULT ''::text NOT NULL,
    last_name text DEFAULT ''::text NOT NULL,
    email text,
    phone text,
    whatsapp text,
    country text,
    preferred_language text DEFAULT 'en'::text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    source text,
    notes text,
    total_bookings integer DEFAULT 0 NOT NULL,
    total_spent_usd numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: communication_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communication_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid,
    type text,
    summary text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text DEFAULT 'Safari Adventure Tours'::text NOT NULL,
    brand_name text,
    email text,
    phone text,
    whatsapp text,
    website text,
    address text,
    country text,
    currency_primary text DEFAULT 'USD'::text,
    currency_secondary text DEFAULT 'KES'::text,
    bank_account_name text,
    bank_account_number text,
    bank_name text,
    bank_account_type text,
    deposit_percent numeric(7,2) DEFAULT 30 NOT NULL,
    balance_due_days integer DEFAULT 30 NOT NULL,
    cancellation_61_plus text,
    cancellation_42_60 text,
    cancellation_28_41 text,
    cancellation_0_27 text,
    invoice_prefix text DEFAULT 'SAT-I'::text,
    quote_prefix text DEFAULT 'SAT-Q'::text,
    booking_prefix text DEFAULT 'SAT-B'::text,
    default_markup_percent numeric(7,2) DEFAULT 20 NOT NULL,
    logo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    usd_to_kes_rate numeric(10,4) DEFAULT 129 NOT NULL,
    auto_complete_on_end_date boolean DEFAULT false NOT NULL,
    auto_archive_enabled boolean DEFAULT false NOT NULL,
    auto_archive_days integer DEFAULT 30 NOT NULL,
    auto_archive_stages text[] DEFAULT ARRAY['not_booked'::text, 'completed'::text] NOT NULL,
    auto_delete_enabled boolean DEFAULT false NOT NULL,
    auto_delete_days integer DEFAULT 90 NOT NULL,
    prebooked_enabled boolean DEFAULT false NOT NULL,
    auto_expire_quotes boolean DEFAULT true NOT NULL,
    CONSTRAINT company_settings_auto_archive_days_check CHECK ((auto_archive_days >= 0)),
    CONSTRAINT company_settings_auto_delete_days_check CHECK ((auto_delete_days >= 0)),
    CONSTRAINT company_settings_usd_to_kes_rate_check CHECK ((usd_to_kes_rate > (0)::numeric))
);


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    email text,
    phone text,
    subject text,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: corporate_enquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.corporate_enquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: default_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.default_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage text DEFAULT 'booked'::text NOT NULL,
    description text NOT NULL,
    type text DEFAULT 'other'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT default_tasks_type_check CHECK ((type = ANY (ARRAY['payment'::text, 'accommodation'::text, 'activity'::text, 'other'::text])))
);


--
-- Name: departures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tour_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    max_seats integer NOT NULL,
    booked_seats integer DEFAULT 0 NOT NULL,
    price_usd numeric(14,2),
    status text DEFAULT 'available'::text NOT NULL,
    internal_notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    security_deposit_usd numeric(12,2) DEFAULT 0 NOT NULL,
    price_single_usd numeric(14,2),
    CONSTRAINT departures_at_least_one_price_chk CHECK (((price_usd IS NOT NULL) OR (price_single_usd IS NOT NULL))),
    CONSTRAINT departures_booked_seats_check CHECK ((booked_seats >= 0)),
    CONSTRAINT departures_max_seats_check CHECK ((max_seats > 0)),
    CONSTRAINT departures_price_single_usd_chk CHECK (((price_single_usd IS NULL) OR (price_single_usd >= (0)::numeric))),
    CONSTRAINT departures_price_usd_check CHECK ((price_usd >= (0)::numeric)),
    CONSTRAINT departures_security_deposit_usd_chk CHECK ((security_deposit_usd >= (0)::numeric)),
    CONSTRAINT departures_status_check CHECK ((status = ANY (ARRAY['available'::text, 'full'::text, 'closed'::text, 'cancelled'::text])))
);


--
-- Name: destinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.destinations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    country text DEFAULT 'Kenya'::text NOT NULL,
    description_en text,
    description_ar text,
    cover_image_url text,
    is_active boolean DEFAULT true NOT NULL,
    has_content boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    video_urls text[] DEFAULT '{}'::text[] NOT NULL,
    latitude double precision,
    longitude double precision,
    google_maps_url text,
    google_place_id text,
    gallery_urls text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    category text DEFAULT 'other'::text NOT NULL,
    description text NOT NULL,
    amount_usd numeric(12,2) NOT NULL,
    method text,
    reference text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expenses_amount_usd_check CHECK ((amount_usd > (0)::numeric)),
    CONSTRAINT expenses_category_check CHECK ((category = ANY (ARRAY['salaries'::text, 'rent'::text, 'fuel'::text, 'marketing'::text, 'office'::text, 'maintenance'::text, 'other'::text]))),
    CONSTRAINT expenses_method_check CHECK ((method = ANY (ARRAY['bank_transfer'::text, 'card'::text, 'cash'::text, 'mpesa'::text, 'cheque'::text, 'other'::text])))
);


--
-- Name: gift_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hotel_pricing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hotel_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hotel_voucher_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hotel_voucher_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hotel_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hotel_vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    voucher_number text DEFAULT ('HV-'::text || lpad((nextval('public.hotel_voucher_number_seq'::regclass))::text, 6, '0'::text)) NOT NULL,
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    departure_id uuid,
    booking_id uuid,
    quote_id uuid,
    accommodation_id uuid,
    hotel_name text NOT NULL,
    hotel_email text,
    check_in date NOT NULL,
    check_out date NOT NULL,
    nights integer NOT NULL,
    num_rooms integer DEFAULT 1 NOT NULL,
    room_type text,
    num_guests integer DEFAULT 1 NOT NULL,
    guest_names jsonb DEFAULT '[]'::jsonb NOT NULL,
    meal_plan text,
    special_requests text,
    internal_notes text,
    status text DEFAULT 'draft'::text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    hotel_confirmation_ref text,
    sent_at timestamp with time zone,
    confirmed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hotel_vouchers_language_check CHECK ((language = ANY (ARRAY['en'::text, 'ar'::text]))),
    CONSTRAINT hotel_vouchers_nights_check CHECK ((nights > 0)),
    CONSTRAINT hotel_vouchers_num_guests_check CHECK ((num_guests > 0)),
    CONSTRAINT hotel_vouchers_num_rooms_check CHECK ((num_rooms > 0)),
    CONSTRAINT hotel_vouchers_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'confirmed'::text, 'cancelled'::text])))
);


--
-- Name: invoice_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    description_en text NOT NULL,
    description_ar text,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    unit_price_usd numeric(12,2) DEFAULT 0 NOT NULL,
    total_usd numeric(12,2) GENERATED ALWAYS AS (round((quantity * unit_price_usd), 2)) STORED,
    kind text DEFAULT 'other'::text NOT NULL,
    trip_service_id uuid,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoice_lines_kind_check CHECK ((kind = ANY (ARRAY['trip'::text, 'service'::text, 'discount'::text, 'other'::text]))),
    CONSTRAINT invoice_lines_quantity_check CHECK ((quantity <> (0)::numeric))
);


--
-- Name: invoice_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    booking_id uuid,
    invoice_number text,
    status text DEFAULT 'draft'::text NOT NULL,
    issue_date date,
    due_date date,
    client_id uuid,
    client_name text,
    client_email text,
    client_address text,
    currency text DEFAULT 'USD'::text NOT NULL,
    total_usd numeric(12,2) DEFAULT 0 NOT NULL,
    notes text,
    terms text,
    issued_at timestamp with time zone,
    voided_at timestamp with time zone,
    void_reason text,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    quote_id uuid,
    CONSTRAINT invoices_issued_shape_chk CHECK ((((status = 'draft'::text) AND (invoice_number IS NULL)) OR ((status = ANY (ARRAY['issued'::text, 'void'::text])) AND (invoice_number IS NOT NULL) AND (issue_date IS NOT NULL)))),
    CONSTRAINT invoices_status_chk CHECK ((status = ANY (ARRAY['draft'::text, 'issued'::text, 'void'::text]))),
    CONSTRAINT invoices_trip_ref_chk CHECK (((quote_id IS NOT NULL) OR (booking_id IS NOT NULL) OR (client_id IS NOT NULL) OR (client_name IS NOT NULL)))
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone_number text,
    full_name text,
    email text,
    preferred_language text DEFAULT 'en'::text NOT NULL,
    tour_type text,
    travel_dates text,
    group_size text,
    budget_range text,
    special_requests text,
    status text DEFAULT 'new'::text NOT NULL,
    source text DEFAULT 'whatsapp_flow'::text NOT NULL,
    CONSTRAINT leads_preferred_language_check CHECK ((preferred_language = ANY (ARRAY['en'::text, 'ar'::text]))),
    CONSTRAINT leads_status_check CHECK ((status = ANY (ARRAY['new'::text, 'contacted'::text, 'qualified'::text, 'converted'::text, 'archived'::text])))
);


--
-- Name: motorbikes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.motorbikes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    make text,
    model text,
    plate_number text,
    engine_cc integer,
    color text,
    status text DEFAULT 'available'::text NOT NULL,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT motorbikes_engine_cc_check CHECK (((engine_cc IS NULL) OR (engine_cc > 0))),
    CONSTRAINT motorbikes_status_check CHECK ((status = ANY (ARRAY['available'::text, 'maintenance'::text, 'retired'::text])))
);


--
-- Name: park_fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.park_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: parks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    country text DEFAULT 'Tanzania'::text NOT NULL,
    park_type text DEFAULT 'national_park'::text NOT NULL,
    description_en text,
    cover_image_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description_ar text,
    latitude double precision,
    longitude double precision,
    google_maps_url text,
    google_place_id text,
    gallery_urls text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT parks_park_type_check CHECK ((park_type = ANY (ARRAY['national_park'::text, 'game_reserve'::text, 'conservancy'::text, 'marine_park'::text, 'forest_reserve'::text, 'other'::text])))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: proposal_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposal_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text DEFAULT 'Default proposal template'::text NOT NULL,
    cover_intro_en text,
    cover_intro_ar text,
    email_subject_en text,
    email_subject_ar text,
    email_message_en text,
    email_message_ar text,
    email_signature_en text,
    email_signature_ar text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quote_acceptances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_acceptances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    quote_version_id uuid NOT NULL,
    delivery_id uuid,
    client_name text NOT NULL,
    client_email text,
    terms_accepted boolean NOT NULL,
    accepted_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    user_agent text,
    provisional_booking_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quote_acceptances_terms_accepted_check CHECK (terms_accepted)
);


--
-- Name: quote_day_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_day_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_day_id uuid NOT NULL,
    item_type text NOT NULL,
    accommodation_id uuid,
    activity_id uuid,
    vehicle_id uuid,
    staff_id uuid,
    title_snapshot text NOT NULL,
    content_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    room_category text,
    client_notes text,
    internal_notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    room_id uuid,
    is_alternative boolean DEFAULT false NOT NULL,
    nights integer DEFAULT 1,
    CONSTRAINT quote_day_items_item_type_check CHECK ((item_type = ANY (ARRAY['accommodation'::text, 'activity'::text, 'vehicle'::text, 'staff'::text, 'meal'::text, 'flight'::text, 'transfer'::text, 'note'::text, 'other'::text]))),
    CONSTRAINT quote_day_items_nights_check CHECK (((nights IS NULL) OR (nights > 0)))
);


--
-- Name: quote_days; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_days (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_version_id uuid NOT NULL,
    day_number integer NOT NULL,
    day_date date,
    title text,
    description_en text,
    description_ar text,
    destination_id uuid,
    destination_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    meals text[] DEFAULT '{}'::text[] NOT NULL,
    client_notes text,
    internal_notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title_ar text,
    client_notes_ar text,
    activities jsonb DEFAULT '[]'::jsonb NOT NULL,
    photos text[] DEFAULT '{}'::text[] NOT NULL,
    day_number_end integer,
    distance_km numeric,
    road_distance_km numeric,
    day_end integer,
    CONSTRAINT quote_days_day_number_check CHECK ((day_number > 0)),
    CONSTRAINT quote_days_distance_km_check CHECK (((distance_km IS NULL) OR (distance_km >= (0)::numeric))),
    CONSTRAINT quote_days_road_distance_km_check CHECK (((road_distance_km IS NULL) OR (road_distance_km >= (0)::numeric)))
);


--
-- Name: quote_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    quote_version_id uuid NOT NULL,
    channel text NOT NULL,
    recipient_email text,
    access_token uuid DEFAULT gen_random_uuid(),
    expires_at timestamp with time zone,
    sent_at timestamp with time zone,
    first_viewed_at timestamp with time zone,
    last_viewed_at timestamp with time zone,
    view_count integer DEFAULT 0 NOT NULL,
    revoked_at timestamp with time zone,
    provider_message_id text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    message text,
    sender_email text,
    subject text,
    CONSTRAINT quote_deliveries_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'pdf'::text, 'share_link'::text])))
);


--
-- Name: quote_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quote_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    amount_usd numeric(12,2) NOT NULL,
    payment_type text DEFAULT 'deposit'::text NOT NULL,
    method text,
    reference text,
    notes text,
    received_at date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quote_payments_amount_usd_check CHECK ((amount_usd > (0)::numeric)),
    CONSTRAINT quote_payments_method_check CHECK ((method = ANY (ARRAY['bank_transfer'::text, 'card'::text, 'cash'::text, 'mpesa'::text, 'cheque'::text, 'other'::text]))),
    CONSTRAINT quote_payments_payment_type_check CHECK ((payment_type = ANY (ARRAY['deposit'::text, 'balance'::text, 'full'::text, 'partial'::text, 'refund'::text])))
);


--
-- Name: quote_price_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_price_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_version_id uuid NOT NULL,
    quote_day_id uuid,
    cost_category text NOT NULL,
    description text NOT NULL,
    rate_card_id uuid,
    supplier_rate_id uuid,
    pricing_unit text NOT NULL,
    traveller_category text,
    room_category text,
    quantity numeric(12,3) DEFAULT 1 NOT NULL,
    allocated_people integer,
    source_currency text DEFAULT 'USD'::text NOT NULL,
    source_unit_cost numeric(14,2) DEFAULT 0 NOT NULL,
    exchange_rate_to_usd numeric(14,6) DEFAULT 1 NOT NULL,
    unit_cost_usd numeric(14,2) DEFAULT 0 NOT NULL,
    original_unit_cost_usd numeric(14,2),
    is_manual_override boolean DEFAULT false NOT NULL,
    override_reason text,
    overridden_by uuid,
    overridden_at timestamp with time zone,
    markup_percent_override numeric(7,2),
    total_cost_usd numeric(14,2) DEFAULT 0 NOT NULL,
    total_selling_usd numeric(14,2) DEFAULT 0 NOT NULL,
    is_optional boolean DEFAULT false NOT NULL,
    is_client_visible boolean DEFAULT true NOT NULL,
    internal_notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quote_price_lines_allocated_people_check CHECK (((allocated_people IS NULL) OR (allocated_people > 0))),
    CONSTRAINT quote_price_lines_check CHECK (((NOT is_manual_override) OR (override_reason IS NOT NULL))),
    CONSTRAINT quote_price_lines_cost_category_check CHECK ((cost_category = ANY (ARRAY['accommodation'::text, 'activities'::text, 'park_fees'::text, 'transport'::text, 'staff'::text, 'meals'::text, 'flights'::text, 'other'::text]))),
    CONSTRAINT quote_price_lines_exchange_rate_to_usd_check CHECK ((exchange_rate_to_usd > (0)::numeric)),
    CONSTRAINT quote_price_lines_markup_percent_override_check CHECK (((markup_percent_override IS NULL) OR (markup_percent_override >= (0)::numeric))),
    CONSTRAINT quote_price_lines_pricing_unit_check CHECK ((pricing_unit = ANY (ARRAY['person'::text, 'room'::text, 'vehicle'::text, 'group'::text, 'day'::text, 'night'::text, 'trip'::text]))),
    CONSTRAINT quote_price_lines_quantity_check CHECK ((quantity >= (0)::numeric)),
    CONSTRAINT quote_price_lines_source_unit_cost_check CHECK ((source_unit_cost >= (0)::numeric)),
    CONSTRAINT quote_price_lines_unit_cost_usd_check CHECK ((unit_cost_usd >= (0)::numeric))
);


--
-- Name: quote_travellers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_travellers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_version_id uuid NOT NULL,
    display_name text,
    age_on_travel_date integer,
    age_band_id uuid,
    age_band_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    pricing_fixed_amount_usd numeric(14,2),
    traveller_category text NOT NULL,
    room_category text DEFAULT 'sharing'::text NOT NULL,
    is_paying boolean DEFAULT true NOT NULL,
    is_complimentary boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    dietary_requirements text,
    allergies text,
    CONSTRAINT quote_travellers_age_on_travel_date_check CHECK (((age_on_travel_date IS NULL) OR (age_on_travel_date >= 0))),
    CONSTRAINT quote_travellers_fixed_amount_nonnegative CHECK (((pricing_fixed_amount_usd IS NULL) OR (pricing_fixed_amount_usd >= (0)::numeric))),
    CONSTRAINT quote_travellers_pricing_fixed_amount_usd_check CHECK (((pricing_fixed_amount_usd IS NULL) OR (pricing_fixed_amount_usd >= (0)::numeric))),
    CONSTRAINT quote_travellers_room_category_check CHECK ((room_category = ANY (ARRAY['sharing'::text, 'single'::text, 'triple'::text, 'extra_bed'::text, 'no_bed'::text])))
);


--
-- Name: quote_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    version_number integer NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    title text,
    language text DEFAULT 'en'::text NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    travel_start_date date,
    travel_end_date date,
    valid_until date,
    default_markup_percent numeric(7,2) DEFAULT 0 NOT NULL,
    category_markup_overrides jsonb DEFAULT '{}'::jsonb NOT NULL,
    discount_type text,
    discount_value numeric(14,2) DEFAULT 0 NOT NULL,
    discount_reason text,
    discount_client_label text,
    total_cost_usd numeric(14,2) DEFAULT 0 NOT NULL,
    total_selling_usd numeric(14,2) DEFAULT 0 NOT NULL,
    gross_margin_usd numeric(14,2) DEFAULT 0 NOT NULL,
    gross_margin_percent numeric(7,2) DEFAULT 0 NOT NULL,
    sharing_price_per_person_usd numeric(14,2),
    single_price_per_person_usd numeric(14,2),
    single_supplement_usd numeric(14,2),
    exchange_rates_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    company_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    client_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    policy_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    inclusions text[],
    exclusions text[],
    internal_notes text,
    locked_at timestamp with time zone,
    sent_at timestamp with time zone,
    accepted_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cost_base_usd numeric(14,2),
    track_label text,
    compare_group uuid,
    builder_state jsonb,
    arrival_notes text,
    departure_notes text,
    preview_layout jsonb DEFAULT '[]'::jsonb NOT NULL,
    preview_theme text,
    CONSTRAINT quote_versions_check CHECK (((travel_end_date IS NULL) OR (travel_start_date IS NULL) OR (travel_end_date >= travel_start_date))),
    CONSTRAINT quote_versions_check1 CHECK (((discount_type <> 'percentage'::text) OR (discount_value <= (100)::numeric))),
    CONSTRAINT quote_versions_cost_base_usd_check CHECK (((cost_base_usd IS NULL) OR (cost_base_usd >= (0)::numeric))),
    CONSTRAINT quote_versions_currency_check CHECK ((currency = 'USD'::text)),
    CONSTRAINT quote_versions_default_markup_percent_check CHECK ((default_markup_percent >= (0)::numeric)),
    CONSTRAINT quote_versions_discount_type_check CHECK (((discount_type IS NULL) OR (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])))),
    CONSTRAINT quote_versions_discount_value_check CHECK ((discount_value >= (0)::numeric)),
    CONSTRAINT quote_versions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'ready'::text, 'sent'::text, 'viewed'::text, 'accepted'::text, 'declined'::text, 'expired'::text, 'superseded'::text]))),
    CONSTRAINT quote_versions_track_label_check CHECK (((track_label IS NULL) OR (track_label = ANY (ARRAY['standard'::text, 'premium'::text])))),
    CONSTRAINT quote_versions_version_number_check CHECK ((version_number > 0))
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_number text DEFAULT public.generate_quote_number() NOT NULL,
    request_id uuid,
    client_id uuid NOT NULL,
    mode text DEFAULT 'custom'::text NOT NULL,
    tour_id uuid,
    departure_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    accepted_version_id uuid,
    provisional_booking_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_template boolean DEFAULT false NOT NULL,
    CONSTRAINT quotes_mode_check CHECK ((mode = ANY (ARRAY['custom'::text, 'fixed_departure'::text]))),
    CONSTRAINT quotes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'ready'::text, 'sent'::text, 'viewed'::text, 'accepted'::text, 'declined'::text, 'expired'::text, 'superseded'::text])))
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: request_flights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_flights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    traveller_name text,
    direction text DEFAULT 'arrival'::text NOT NULL,
    flight_number text,
    airline text,
    scheduled_at timestamp with time zone,
    airport text,
    notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT request_flights_direction_check CHECK ((direction = ANY (ARRAY['arrival'::text, 'departure'::text])))
);


--
-- Name: request_reference_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.request_reference_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: request_staff_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_staff_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    role text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: request_vehicle_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_vehicle_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    seats_used integer,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT request_vehicle_assignments_seats_used_check CHECK (((seats_used IS NULL) OR (seats_used > 0)))
);


--
-- Name: requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference text DEFAULT ('REQ-'::text || lpad((nextval('public.request_reference_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
    client_id uuid,
    tour_id uuid,
    stage text DEFAULT 'new'::text NOT NULL,
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    heard_about_us text,
    status_changed_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    total_booking_value numeric(14,2),
    date_received date DEFAULT CURRENT_DATE NOT NULL,
    trip_length_nights smallint,
    preferred_room_type text,
    handled_by uuid
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accommodation_id uuid NOT NULL,
    name text NOT NULL,
    room_type text,
    bed_config text,
    max_occupancy integer DEFAULT 2 NOT NULL,
    size_m2 numeric(8,2),
    amenities text[] DEFAULT '{}'::text[] NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rooms_max_occupancy_check CHECK ((max_occupancy > 0))
);


--
-- Name: security_deposits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_deposits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    booking_traveller_id uuid,
    motorbike_id uuid,
    rider_name text,
    amount_usd numeric(12,2) NOT NULL,
    method text,
    reference text,
    notes text,
    taken_at date DEFAULT CURRENT_DATE NOT NULL,
    returned_amount_usd numeric(12,2) DEFAULT 0 NOT NULL,
    returned_at date,
    retained_reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT security_deposits_amount_chk CHECK ((amount_usd > (0)::numeric)),
    CONSTRAINT security_deposits_retained_reason_chk CHECK (((returned_at IS NULL) OR (returned_amount_usd = amount_usd) OR ((retained_reason IS NOT NULL) AND (btrim(retained_reason) <> ''::text)))),
    CONSTRAINT security_deposits_returned_amount_chk CHECK (((returned_amount_usd >= (0)::numeric) AND (returned_amount_usd <= amount_usd))),
    CONSTRAINT security_deposits_returned_shape_chk CHECK (((returned_at IS NOT NULL) OR (returned_amount_usd = (0)::numeric)))
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_en text NOT NULL,
    name_ar text,
    description_en text,
    description_ar text,
    default_price_usd numeric(12,2) DEFAULT 0 NOT NULL,
    pricing_unit text DEFAULT 'person'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT services_default_price_usd_check CHECK ((default_price_usd >= (0)::numeric)),
    CONSTRAINT services_pricing_unit_check CHECK ((pricing_unit = ANY (ARRAY['person'::text, 'booking'::text])))
);


--
-- Name: supplier_costs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supplier_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    quote_id uuid,
    amount_usd numeric(12,2) NOT NULL,
    method text,
    reference text,
    notes text,
    paid_at date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT supplier_payments_amount_usd_check CHECK ((amount_usd > (0)::numeric)),
    CONSTRAINT supplier_payments_method_check CHECK ((method = ANY (ARRAY['bank_transfer'::text, 'card'::text, 'cash'::text, 'mpesa'::text, 'cheque'::text, 'other'::text])))
);


--
-- Name: supplier_rate_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_rate_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    supplier_name text,
    entity_type text NOT NULL,
    entity_id uuid,
    cost_category text NOT NULL,
    valid_from date NOT NULL,
    valid_to date NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    supplier_id uuid,
    CONSTRAINT supplier_rate_cards_check CHECK ((valid_to >= valid_from)),
    CONSTRAINT supplier_rate_cards_cost_category_check CHECK ((cost_category = ANY (ARRAY['accommodation'::text, 'activities'::text, 'park_fees'::text, 'transport'::text, 'staff'::text, 'meals'::text, 'flights'::text, 'other'::text]))),
    CONSTRAINT supplier_rate_cards_entity_type_check CHECK ((entity_type = ANY (ARRAY['accommodation'::text, 'activity'::text, 'vehicle'::text, 'staff'::text, 'destination'::text, 'park_fee'::text, 'meal'::text, 'flight'::text, 'transfer'::text, 'room'::text, 'other'::text])))
);


--
-- Name: supplier_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rate_card_id uuid NOT NULL,
    traveller_category text,
    room_category text,
    residency text DEFAULT 'all'::text NOT NULL,
    pricing_unit text NOT NULL,
    amount numeric(14,2),
    min_group_size integer,
    max_group_size integer,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    percent_of_adult numeric(6,2),
    CONSTRAINT supplier_rates_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT supplier_rates_check CHECK (((max_group_size IS NULL) OR (min_group_size IS NULL) OR (max_group_size >= min_group_size))),
    CONSTRAINT supplier_rates_max_group_size_check CHECK (((max_group_size IS NULL) OR (max_group_size > 0))),
    CONSTRAINT supplier_rates_min_group_size_check CHECK (((min_group_size IS NULL) OR (min_group_size > 0))),
    CONSTRAINT supplier_rates_percent_of_adult_check CHECK (((percent_of_adult IS NULL) OR ((percent_of_adult >= (0)::numeric) AND (percent_of_adult <= (100)::numeric)))),
    CONSTRAINT supplier_rates_price_present CHECK (((amount IS NOT NULL) OR (percent_of_adult IS NOT NULL))),
    CONSTRAINT supplier_rates_pricing_unit_check CHECK ((pricing_unit = ANY (ARRAY['person'::text, 'room'::text, 'vehicle'::text, 'group'::text, 'day'::text, 'night'::text, 'trip'::text]))),
    CONSTRAINT supplier_rates_residency_check CHECK ((residency = ANY (ARRAY['all'::text, 'resident'::text, 'non_resident'::text, 'citizen'::text])))
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    supplier_type text DEFAULT 'other'::text NOT NULL,
    contact_email text,
    contact_phone text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT suppliers_supplier_type_check CHECK ((supplier_type = ANY (ARRAY['accommodation'::text, 'transport'::text, 'park'::text, 'activity'::text, 'staff'::text, 'other'::text])))
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid,
    title text NOT NULL,
    is_done boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    type text DEFAULT 'other'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    auto_generated boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    due_date date,
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'paid'::text, 'cancelled'::text]))),
    CONSTRAINT tasks_type_check CHECK ((type = ANY (ARRAY['payment'::text, 'accommodation'::text, 'activity'::text, 'other'::text])))
);


--
-- Name: tour_day_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tour_day_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tour_days; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tour_days (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tour_id uuid NOT NULL,
    day_number integer NOT NULL,
    day_number_end integer,
    title_en text,
    title_ar text,
    description_en text,
    description_ar text,
    destination_id uuid,
    accommodation_id uuid,
    activity_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    meal_breakfast boolean DEFAULT false NOT NULL,
    meal_lunch boolean DEFAULT false NOT NULL,
    meal_dinner boolean DEFAULT false NOT NULL,
    distance_km numeric(10,1),
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    activities jsonb DEFAULT '[]'::jsonb NOT NULL,
    accommodation_alt_id uuid
);


--
-- Name: tour_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tour_staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    role text DEFAULT 'guide'::text NOT NULL,
    phone text,
    email text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text,
    title_en text NOT NULL,
    title_ar text,
    subtitle_en text,
    subtitle_ar text,
    overview_en text,
    overview_ar text,
    description_en text,
    description_ar text,
    type text DEFAULT 'wildlife'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    duration_days integer,
    duration_nights integer,
    hero_image_url text,
    gallery_urls text[] DEFAULT '{}'::text[] NOT NULL,
    route_map_url text,
    highlights_en text[] DEFAULT '{}'::text[] NOT NULL,
    highlights_ar text[] DEFAULT '{}'::text[] NOT NULL,
    included_en text[] DEFAULT '{}'::text[] NOT NULL,
    included_ar text[] DEFAULT '{}'::text[] NOT NULL,
    excluded_en text[] DEFAULT '{}'::text[] NOT NULL,
    excluded_ar text[] DEFAULT '{}'::text[] NOT NULL,
    terrain text,
    vehicle text,
    accommodation_level text,
    total_distance_km numeric(10,1),
    difficulty_rating integer,
    max_group_size integer DEFAULT 12,
    faqs jsonb DEFAULT '[]'::jsonb NOT NULL,
    deposit_percent numeric(7,2) DEFAULT 30,
    base_price_usd numeric(14,2),
    show_on_website boolean DEFAULT true NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    countries_visited text,
    start_destination text,
    end_destination text,
    comfort_rating integer DEFAULT 5 NOT NULL,
    min_group_size integer,
    CONSTRAINT tours_comfort_rating_range CHECK (((comfort_rating >= 1) AND (comfort_rating <= 10)))
);


--
-- Name: traveller_age_bands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.traveller_age_bands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    min_age integer NOT NULL,
    max_age integer,
    default_pricing_method text DEFAULT 'percentage'::text NOT NULL,
    default_percentage numeric(7,2),
    default_fixed_amount_usd numeric(14,2),
    allowed_room_categories text[] DEFAULT ARRAY['sharing'::text, 'single'::text, 'extra_bed'::text, 'no_bed'::text] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT traveller_age_bands_check CHECK (((max_age IS NULL) OR (max_age >= min_age))),
    CONSTRAINT traveller_age_bands_default_fixed_amount_usd_check CHECK (((default_fixed_amount_usd IS NULL) OR (default_fixed_amount_usd >= (0)::numeric))),
    CONSTRAINT traveller_age_bands_default_pricing_method_check CHECK ((default_pricing_method = ANY (ARRAY['fixed'::text, 'percentage'::text, 'free'::text]))),
    CONSTRAINT traveller_age_bands_fixed_amount_nonnegative CHECK (((default_fixed_amount_usd IS NULL) OR (default_fixed_amount_usd >= (0)::numeric))),
    CONSTRAINT traveller_age_bands_min_age_check CHECK ((min_age >= 0))
);


--
-- Name: traveller_agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.traveller_agreements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_traveller_id uuid NOT NULL,
    departure_id uuid,
    agreement_template_id uuid,
    access_token uuid DEFAULT gen_random_uuid(),
    title_snapshot text,
    body_snapshot text,
    status text DEFAULT 'pending'::text NOT NULL,
    signed_name text,
    terms_accepted boolean DEFAULT false NOT NULL,
    signed_at timestamp with time zone,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    language_snapshot text,
    last_emailed_at timestamp with time zone,
    reminder_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT traveller_agreements_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'signed'::text, 'declined'::text])))
);


--
-- Name: trip_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trip_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid,
    booking_id uuid,
    amount_usd numeric(12,2) NOT NULL,
    payment_type text DEFAULT 'deposit'::text NOT NULL,
    method text,
    reference text,
    notes text,
    received_at date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    source_table text,
    source_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    invoice_id uuid,
    CONSTRAINT trip_payments_amount_usd_check CHECK ((amount_usd > (0)::numeric)),
    CONSTRAINT trip_payments_method_check CHECK ((method = ANY (ARRAY['bank_transfer'::text, 'card'::text, 'cash'::text, 'mpesa'::text, 'cheque'::text, 'other'::text]))),
    CONSTRAINT trip_payments_payment_type_check CHECK ((payment_type = ANY (ARRAY['deposit'::text, 'balance'::text, 'full'::text, 'partial'::text, 'refund'::text]))),
    CONSTRAINT trip_payments_source_table_check CHECK ((source_table = ANY (ARRAY['quote_payments'::text, 'booking_payments'::text]))),
    CONSTRAINT trip_payments_trip_ref_chk CHECK (((quote_id IS NOT NULL) OR (booking_id IS NOT NULL) OR (invoice_id IS NOT NULL)))
);


--
-- Name: trip_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trip_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid,
    booking_id uuid,
    service_id uuid NOT NULL,
    name_en text NOT NULL,
    name_ar text,
    unit_price_usd numeric(12,2) NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    total_usd numeric(12,2) GENERATED ALWAYS AS (round((quantity * unit_price_usd), 2)) STORED,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trip_services_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT trip_services_trip_ref_chk CHECK (((quote_id IS NOT NULL) OR (booking_id IS NOT NULL))),
    CONSTRAINT trip_services_unit_price_usd_check CHECK ((unit_price_usd >= (0)::numeric))
);


--
-- Name: vehicle_pricing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'jeep'::text NOT NULL,
    seats integer DEFAULT 4 NOT NULL,
    count integer DEFAULT 1 NOT NULL,
    description_en text,
    image_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: waitlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waitlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: whatsapp_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wa_id text NOT NULL,
    step text DEFAULT 'awaiting_email'::text NOT NULL,
    collected_name text,
    collected_email text,
    collected_country text,
    collected_question text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_conversations_step_check CHECK ((step = ANY (ARRAY['awaiting_email'::text, 'awaiting_country'::text, 'done'::text])))
);


--
-- Name: accommodations accommodations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accommodations
    ADD CONSTRAINT accommodations_pkey PRIMARY KEY (id);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: activity_locations activity_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_locations
    ADD CONSTRAINT activity_locations_pkey PRIMARY KEY (id);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: agreement_templates agreement_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agreement_templates
    ADD CONSTRAINT agreement_templates_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: booking_links booking_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_links
    ADD CONSTRAINT booking_links_pkey PRIMARY KEY (id);


--
-- Name: booking_links booking_links_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_links
    ADD CONSTRAINT booking_links_token_key UNIQUE (token);


--
-- Name: booking_payments booking_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_payments
    ADD CONSTRAINT booking_payments_pkey PRIMARY KEY (id);


--
-- Name: booking_staff booking_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_staff
    ADD CONSTRAINT booking_staff_pkey PRIMARY KEY (id);


--
-- Name: booking_traveller_flights booking_traveller_flights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_traveller_flights
    ADD CONSTRAINT booking_traveller_flights_pkey PRIMARY KEY (id);


--
-- Name: booking_travellers booking_travellers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_travellers
    ADD CONSTRAINT booking_travellers_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: communication_logs communication_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_logs
    ADD CONSTRAINT communication_logs_pkey PRIMARY KEY (id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: corporate_enquiries corporate_enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_enquiries
    ADD CONSTRAINT corporate_enquiries_pkey PRIMARY KEY (id);


--
-- Name: default_tasks default_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.default_tasks
    ADD CONSTRAINT default_tasks_pkey PRIMARY KEY (id);


--
-- Name: departures departures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departures
    ADD CONSTRAINT departures_pkey PRIMARY KEY (id);


--
-- Name: destinations destinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destinations
    ADD CONSTRAINT destinations_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: gift_vouchers gift_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_vouchers
    ADD CONSTRAINT gift_vouchers_pkey PRIMARY KEY (id);


--
-- Name: hotel_pricing hotel_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_pricing
    ADD CONSTRAINT hotel_pricing_pkey PRIMARY KEY (id);


--
-- Name: hotel_vouchers hotel_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_vouchers
    ADD CONSTRAINT hotel_vouchers_pkey PRIMARY KEY (id);


--
-- Name: hotel_vouchers hotel_vouchers_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_vouchers
    ADD CONSTRAINT hotel_vouchers_token_key UNIQUE (token);


--
-- Name: hotel_vouchers hotel_vouchers_voucher_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_vouchers
    ADD CONSTRAINT hotel_vouchers_voucher_number_key UNIQUE (voucher_number);


--
-- Name: invoice_lines invoice_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: motorbikes motorbikes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motorbikes
    ADD CONSTRAINT motorbikes_pkey PRIMARY KEY (id);


--
-- Name: park_fees park_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_fees
    ADD CONSTRAINT park_fees_pkey PRIMARY KEY (id);


--
-- Name: parks parks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parks
    ADD CONSTRAINT parks_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: proposal_templates proposal_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_templates
    ADD CONSTRAINT proposal_templates_pkey PRIMARY KEY (id);


--
-- Name: quote_acceptances quote_acceptances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_acceptances
    ADD CONSTRAINT quote_acceptances_pkey PRIMARY KEY (id);


--
-- Name: quote_acceptances quote_acceptances_quote_version_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_acceptances
    ADD CONSTRAINT quote_acceptances_quote_version_id_key UNIQUE (quote_version_id);


--
-- Name: quote_day_items quote_day_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_day_items
    ADD CONSTRAINT quote_day_items_pkey PRIMARY KEY (id);


--
-- Name: quote_days quote_days_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_days
    ADD CONSTRAINT quote_days_pkey PRIMARY KEY (id);


--
-- Name: quote_days quote_days_quote_version_id_day_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_days
    ADD CONSTRAINT quote_days_quote_version_id_day_number_key UNIQUE (quote_version_id, day_number) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: quote_deliveries quote_deliveries_access_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_deliveries
    ADD CONSTRAINT quote_deliveries_access_token_key UNIQUE (access_token);


--
-- Name: quote_deliveries quote_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_deliveries
    ADD CONSTRAINT quote_deliveries_pkey PRIMARY KEY (id);


--
-- Name: quote_lines quote_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_lines
    ADD CONSTRAINT quote_lines_pkey PRIMARY KEY (id);


--
-- Name: quote_payments quote_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_payments
    ADD CONSTRAINT quote_payments_pkey PRIMARY KEY (id);


--
-- Name: quote_price_lines quote_price_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_price_lines
    ADD CONSTRAINT quote_price_lines_pkey PRIMARY KEY (id);


--
-- Name: quote_travellers quote_travellers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_travellers
    ADD CONSTRAINT quote_travellers_pkey PRIMARY KEY (id);


--
-- Name: quote_versions quote_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_versions
    ADD CONSTRAINT quote_versions_pkey PRIMARY KEY (id);


--
-- Name: quote_versions quote_versions_quote_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_versions
    ADD CONSTRAINT quote_versions_quote_id_version_number_key UNIQUE (quote_id, version_number);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_quote_number_key UNIQUE (quote_number);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: request_flights request_flights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_flights
    ADD CONSTRAINT request_flights_pkey PRIMARY KEY (id);


--
-- Name: request_staff_assignments request_staff_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_staff_assignments
    ADD CONSTRAINT request_staff_assignments_pkey PRIMARY KEY (id);


--
-- Name: request_staff_assignments request_staff_assignments_request_id_staff_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_staff_assignments
    ADD CONSTRAINT request_staff_assignments_request_id_staff_id_key UNIQUE (request_id, staff_id);


--
-- Name: request_vehicle_assignments request_vehicle_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_vehicle_assignments
    ADD CONSTRAINT request_vehicle_assignments_pkey PRIMARY KEY (id);


--
-- Name: request_vehicle_assignments request_vehicle_assignments_request_id_vehicle_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_vehicle_assignments
    ADD CONSTRAINT request_vehicle_assignments_request_id_vehicle_id_key UNIQUE (request_id, vehicle_id);


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- Name: requests requests_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_reference_key UNIQUE (reference);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: security_deposits security_deposits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_deposits
    ADD CONSTRAINT security_deposits_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: supplier_costs supplier_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_costs
    ADD CONSTRAINT supplier_costs_pkey PRIMARY KEY (id);


--
-- Name: supplier_payments supplier_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_pkey PRIMARY KEY (id);


--
-- Name: supplier_rate_cards supplier_rate_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_rate_cards
    ADD CONSTRAINT supplier_rate_cards_pkey PRIMARY KEY (id);


--
-- Name: supplier_rates supplier_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_rates
    ADD CONSTRAINT supplier_rates_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_name_key UNIQUE (name);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: tour_day_activities tour_day_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_day_activities
    ADD CONSTRAINT tour_day_activities_pkey PRIMARY KEY (id);


--
-- Name: tour_days tour_days_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_days
    ADD CONSTRAINT tour_days_pkey PRIMARY KEY (id);


--
-- Name: tour_staff tour_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_staff
    ADD CONSTRAINT tour_staff_pkey PRIMARY KEY (id);


--
-- Name: tours tours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tours
    ADD CONSTRAINT tours_pkey PRIMARY KEY (id);


--
-- Name: tours tours_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tours
    ADD CONSTRAINT tours_slug_key UNIQUE (slug);


--
-- Name: traveller_age_bands traveller_age_bands_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveller_age_bands
    ADD CONSTRAINT traveller_age_bands_code_key UNIQUE (code);


--
-- Name: traveller_age_bands traveller_age_bands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveller_age_bands
    ADD CONSTRAINT traveller_age_bands_pkey PRIMARY KEY (id);


--
-- Name: traveller_agreements traveller_agreements_access_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveller_agreements
    ADD CONSTRAINT traveller_agreements_access_token_key UNIQUE (access_token);


--
-- Name: traveller_agreements traveller_agreements_booking_traveller_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveller_agreements
    ADD CONSTRAINT traveller_agreements_booking_traveller_id_key UNIQUE (booking_traveller_id);


--
-- Name: traveller_agreements traveller_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveller_agreements
    ADD CONSTRAINT traveller_agreements_pkey PRIMARY KEY (id);


--
-- Name: trip_payments trip_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_payments
    ADD CONSTRAINT trip_payments_pkey PRIMARY KEY (id);


--
-- Name: trip_services trip_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_services
    ADD CONSTRAINT trip_services_pkey PRIMARY KEY (id);


--
-- Name: vehicle_pricing vehicle_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_pricing
    ADD CONSTRAINT vehicle_pricing_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: waitlists waitlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlists
    ADD CONSTRAINT waitlists_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_conversations whatsapp_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_conversations whatsapp_conversations_wa_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_wa_id_key UNIQUE (wa_id);


--
-- Name: activity_locations_act_dest_uk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX activity_locations_act_dest_uk ON public.activity_locations USING btree (activity_id, destination_id) WHERE (destination_id IS NOT NULL);


--
-- Name: activity_locations_act_park_uk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX activity_locations_act_park_uk ON public.activity_locations USING btree (activity_id, park_id) WHERE (park_id IS NOT NULL);


--
-- Name: activity_locations_activity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_locations_activity_idx ON public.activity_locations USING btree (activity_id);


--
-- Name: booking_traveller_flights_traveller_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX booking_traveller_flights_traveller_idx ON public.booking_traveller_flights USING btree (booking_traveller_id, sort_order);


--
-- Name: bookings_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_request_idx ON public.bookings USING btree (request_id);


--
-- Name: bookings_start_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_start_date_idx ON public.bookings USING btree (start_date) WHERE (start_date IS NOT NULL);


--
-- Name: clients_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_email_idx ON public.clients USING btree (lower(email));


--
-- Name: clients_email_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clients_email_unique_idx ON public.clients USING btree (lower(email)) WHERE ((email IS NOT NULL) AND (email <> ''::text));


--
-- Name: expenses_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_date_idx ON public.expenses USING btree (expense_date);


--
-- Name: idx_accommodations_destination_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accommodations_destination_id ON public.accommodations USING btree (destination_id);


--
-- Name: idx_activities_destination_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_destination_id ON public.activities USING btree (destination_id);


--
-- Name: idx_activity_locations_destination_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_locations_destination_id ON public.activity_locations USING btree (destination_id);


--
-- Name: idx_activity_locations_park_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_locations_park_id ON public.activity_locations USING btree (park_id);


--
-- Name: idx_activity_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_created_at ON public.activity_log USING btree (created_at DESC);


--
-- Name: idx_activity_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_entity ON public.activity_log USING btree (entity_type, entity_id);


--
-- Name: idx_agreement_templates_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agreement_templates_active ON public.agreement_templates USING btree (is_active);


--
-- Name: idx_booking_links_departure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_links_departure_id ON public.booking_links USING btree (departure_id);


--
-- Name: idx_booking_links_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_links_token ON public.booking_links USING btree (token);


--
-- Name: idx_booking_payments_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_payments_booking_id ON public.booking_payments USING btree (booking_id);


--
-- Name: idx_booking_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_payments_status ON public.booking_payments USING btree (status);


--
-- Name: idx_booking_travellers_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_travellers_booking_id ON public.booking_travellers USING btree (booking_id);


--
-- Name: idx_booking_travellers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_travellers_email ON public.booking_travellers USING btree (email);


--
-- Name: idx_booking_travellers_motorbike_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_travellers_motorbike_id ON public.booking_travellers USING btree (motorbike_id);


--
-- Name: idx_bookings_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_client_id ON public.bookings USING btree (client_id);


--
-- Name: idx_bookings_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_created_at ON public.bookings USING btree (created_at);


--
-- Name: idx_bookings_departure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_departure_id ON public.bookings USING btree (departure_id);


--
-- Name: idx_bookings_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_quote_id ON public.bookings USING btree (quote_id);


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_bookings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_user_id ON public.bookings USING btree (user_id);


--
-- Name: idx_communication_logs_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_logs_request_id ON public.communication_logs USING btree (request_id);


--
-- Name: idx_departures_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departures_start_date ON public.departures USING btree (start_date);


--
-- Name: idx_departures_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departures_status ON public.departures USING btree (status);


--
-- Name: idx_departures_tour_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departures_tour_id ON public.departures USING btree (tour_id);


--
-- Name: idx_hotel_vouchers_accommodation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_vouchers_accommodation_id ON public.hotel_vouchers USING btree (accommodation_id);


--
-- Name: idx_hotel_vouchers_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_vouchers_booking_id ON public.hotel_vouchers USING btree (booking_id);


--
-- Name: idx_hotel_vouchers_departure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_vouchers_departure_id ON public.hotel_vouchers USING btree (departure_id);


--
-- Name: idx_hotel_vouchers_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_vouchers_quote_id ON public.hotel_vouchers USING btree (quote_id);


--
-- Name: idx_hotel_vouchers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_vouchers_status ON public.hotel_vouchers USING btree (status);


--
-- Name: idx_hotel_vouchers_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hotel_vouchers_token ON public.hotel_vouchers USING btree (token);


--
-- Name: idx_leads_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_created_at ON public.leads USING btree (created_at DESC);


--
-- Name: idx_leads_phone_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_phone_number ON public.leads USING btree (phone_number);


--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_status ON public.leads USING btree (status);


--
-- Name: idx_motorbikes_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_motorbikes_is_active ON public.motorbikes USING btree (is_active);


--
-- Name: idx_motorbikes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_motorbikes_status ON public.motorbikes USING btree (status);


--
-- Name: idx_quote_acceptances_delivery_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_acceptances_delivery_id ON public.quote_acceptances USING btree (delivery_id);


--
-- Name: idx_quote_acceptances_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_acceptances_quote_id ON public.quote_acceptances USING btree (quote_id);


--
-- Name: idx_quote_day_items_accommodation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_day_items_accommodation_id ON public.quote_day_items USING btree (accommodation_id);


--
-- Name: idx_quote_day_items_activity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_day_items_activity_id ON public.quote_day_items USING btree (activity_id);


--
-- Name: idx_quote_day_items_room_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_day_items_room_id ON public.quote_day_items USING btree (room_id);


--
-- Name: idx_quote_day_items_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_day_items_staff_id ON public.quote_day_items USING btree (staff_id);


--
-- Name: idx_quote_day_items_vehicle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_day_items_vehicle_id ON public.quote_day_items USING btree (vehicle_id);


--
-- Name: idx_quote_days_destination_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_days_destination_id ON public.quote_days USING btree (destination_id);


--
-- Name: idx_quote_deliveries_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_deliveries_quote_id ON public.quote_deliveries USING btree (quote_id);


--
-- Name: idx_quote_deliveries_quote_version_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_deliveries_quote_version_id ON public.quote_deliveries USING btree (quote_version_id);


--
-- Name: idx_quote_price_lines_quote_day_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_price_lines_quote_day_id ON public.quote_price_lines USING btree (quote_day_id);


--
-- Name: idx_quote_price_lines_rate_card_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_price_lines_rate_card_id ON public.quote_price_lines USING btree (rate_card_id);


--
-- Name: idx_quote_price_lines_supplier_rate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_price_lines_supplier_rate_id ON public.quote_price_lines USING btree (supplier_rate_id);


--
-- Name: idx_quote_travellers_age_band_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_travellers_age_band_id ON public.quote_travellers USING btree (age_band_id);


--
-- Name: idx_quotes_accepted_version_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_accepted_version_id ON public.quotes USING btree (accepted_version_id);


--
-- Name: idx_quotes_departure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_departure_id ON public.quotes USING btree (departure_id);


--
-- Name: idx_quotes_tour_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_tour_id ON public.quotes USING btree (tour_id);


--
-- Name: idx_request_staff_assignments_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_staff_assignments_staff_id ON public.request_staff_assignments USING btree (staff_id);


--
-- Name: idx_request_vehicle_assignments_vehicle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_vehicle_assignments_vehicle_id ON public.request_vehicle_assignments USING btree (vehicle_id);


--
-- Name: idx_requests_handled_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_handled_by ON public.requests USING btree (handled_by);


--
-- Name: idx_requests_tour_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_tour_id ON public.requests USING btree (tour_id);


--
-- Name: idx_supplier_payments_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_payments_quote_id ON public.supplier_payments USING btree (quote_id);


--
-- Name: idx_tour_days_accommodation_alt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tour_days_accommodation_alt_id ON public.tour_days USING btree (accommodation_alt_id);


--
-- Name: idx_tour_days_accommodation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tour_days_accommodation_id ON public.tour_days USING btree (accommodation_id);


--
-- Name: idx_tour_days_destination_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tour_days_destination_id ON public.tour_days USING btree (destination_id);


--
-- Name: idx_traveller_agreements_agreement_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_traveller_agreements_agreement_template_id ON public.traveller_agreements USING btree (agreement_template_id);


--
-- Name: invoice_lines_invoice_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_lines_invoice_idx ON public.invoice_lines USING btree (invoice_id, sort_order);


--
-- Name: invoice_lines_trip_service_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_lines_trip_service_idx ON public.invoice_lines USING btree (trip_service_id);


--
-- Name: invoices_booking_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_booking_idx ON public.invoices USING btree (booking_id);


--
-- Name: invoices_client_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_client_idx ON public.invoices USING btree (client_id);


--
-- Name: invoices_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_due_idx ON public.invoices USING btree (due_date) WHERE (status = 'issued'::text);


--
-- Name: invoices_number_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoices_number_uniq ON public.invoices USING btree (invoice_number) WHERE (invoice_number IS NOT NULL);


--
-- Name: invoices_quote_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_quote_idx ON public.invoices USING btree (quote_id);


--
-- Name: invoices_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_status_idx ON public.invoices USING btree (status);


--
-- Name: parks_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX parks_active_idx ON public.parks USING btree (is_active);


--
-- Name: parks_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX parks_country_idx ON public.parks USING btree (country);


--
-- Name: quote_day_items_day_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_day_items_day_idx ON public.quote_day_items USING btree (quote_day_id, sort_order);


--
-- Name: quote_days_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_days_version_idx ON public.quote_days USING btree (quote_version_id, day_number);


--
-- Name: quote_deliveries_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_deliveries_token_idx ON public.quote_deliveries USING btree (access_token);


--
-- Name: quote_payments_quote_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_payments_quote_idx ON public.quote_payments USING btree (quote_id);


--
-- Name: quote_price_lines_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_price_lines_version_idx ON public.quote_price_lines USING btree (quote_version_id, cost_category);


--
-- Name: quote_travellers_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_travellers_version_idx ON public.quote_travellers USING btree (quote_version_id);


--
-- Name: quote_versions_compare_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_versions_compare_idx ON public.quote_versions USING btree (compare_group) WHERE (compare_group IS NOT NULL);


--
-- Name: quote_versions_cost_base_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_versions_cost_base_idx ON public.quote_versions USING btree (cost_base_usd) WHERE (cost_base_usd IS NOT NULL);


--
-- Name: quote_versions_quote_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_versions_quote_idx ON public.quote_versions USING btree (quote_id, version_number DESC);


--
-- Name: quote_versions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_versions_status_idx ON public.quote_versions USING btree (status, valid_until);


--
-- Name: quotes_client_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_client_idx ON public.quotes USING btree (client_id);


--
-- Name: quotes_is_template_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_is_template_idx ON public.quotes USING btree (is_template) WHERE is_template;


--
-- Name: quotes_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_request_idx ON public.quotes USING btree (request_id);


--
-- Name: quotes_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_status_idx ON public.quotes USING btree (status);


--
-- Name: request_flights_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX request_flights_request_idx ON public.request_flights USING btree (request_id, sort_order);


--
-- Name: request_staff_assignments_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX request_staff_assignments_request_idx ON public.request_staff_assignments USING btree (request_id);


--
-- Name: request_vehicle_assignments_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX request_vehicle_assignments_request_idx ON public.request_vehicle_assignments USING btree (request_id);


--
-- Name: requests_archived_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX requests_archived_at_idx ON public.requests USING btree (archived_at) WHERE (archived_at IS NOT NULL);


--
-- Name: requests_client_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX requests_client_idx ON public.requests USING btree (client_id);


--
-- Name: requests_stage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX requests_stage_idx ON public.requests USING btree (stage);


--
-- Name: requests_status_changed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX requests_status_changed_idx ON public.requests USING btree (status_changed_at);


--
-- Name: rooms_accommodation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rooms_accommodation_idx ON public.rooms USING btree (accommodation_id, sort_order);


--
-- Name: security_deposits_booking_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_deposits_booking_idx ON public.security_deposits USING btree (booking_id);


--
-- Name: security_deposits_held_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_deposits_held_idx ON public.security_deposits USING btree (booking_id) WHERE (returned_at IS NULL);


--
-- Name: security_deposits_traveller_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_deposits_traveller_idx ON public.security_deposits USING btree (booking_traveller_id);


--
-- Name: services_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX services_active_idx ON public.services USING btree (is_active, sort_order);


--
-- Name: services_name_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX services_name_uniq ON public.services USING btree (lower(btrim(name_en)));


--
-- Name: supplier_payments_supplier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_payments_supplier_idx ON public.supplier_payments USING btree (supplier_id);


--
-- Name: supplier_rate_cards_match_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_rate_cards_match_idx ON public.supplier_rate_cards USING btree (entity_type, entity_id, valid_from, valid_to, is_active);


--
-- Name: supplier_rate_cards_supplier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_rate_cards_supplier_idx ON public.supplier_rate_cards USING btree (supplier_id) WHERE (supplier_id IS NOT NULL);


--
-- Name: supplier_rates_card_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supplier_rates_card_idx ON public.supplier_rates USING btree (rate_card_id);


--
-- Name: tasks_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_request_idx ON public.tasks USING btree (request_id, sort_order);


--
-- Name: tour_days_tour_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tour_days_tour_idx ON public.tour_days USING btree (tour_id, day_number);


--
-- Name: tour_staff_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tour_staff_is_active_idx ON public.tour_staff USING btree (is_active);


--
-- Name: tour_staff_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tour_staff_role_idx ON public.tour_staff USING btree (role);


--
-- Name: traveller_agreements_departure_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX traveller_agreements_departure_idx ON public.traveller_agreements USING btree (departure_id);


--
-- Name: traveller_agreements_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX traveller_agreements_status_idx ON public.traveller_agreements USING btree (status);


--
-- Name: traveller_agreements_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX traveller_agreements_token_idx ON public.traveller_agreements USING btree (access_token);


--
-- Name: trip_payments_booking_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trip_payments_booking_idx ON public.trip_payments USING btree (booking_id);


--
-- Name: trip_payments_invoice_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trip_payments_invoice_idx ON public.trip_payments USING btree (invoice_id);


--
-- Name: trip_payments_quote_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trip_payments_quote_idx ON public.trip_payments USING btree (quote_id);


--
-- Name: trip_payments_received_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trip_payments_received_idx ON public.trip_payments USING btree (received_at DESC);


--
-- Name: trip_payments_source_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX trip_payments_source_uniq ON public.trip_payments USING btree (source_table, source_id) WHERE (source_id IS NOT NULL);


--
-- Name: trip_services_booking_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trip_services_booking_idx ON public.trip_services USING btree (booking_id);


--
-- Name: trip_services_quote_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trip_services_quote_idx ON public.trip_services USING btree (quote_id);


--
-- Name: trip_services_service_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trip_services_service_idx ON public.trip_services USING btree (service_id);


--
-- Name: vehicles_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vehicles_is_active_idx ON public.vehicles USING btree (is_active);


--
-- Name: whatsapp_conversations_wa_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX whatsapp_conversations_wa_id_idx ON public.whatsapp_conversations USING btree (wa_id);


--
-- Name: accommodations accommodations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accommodations_updated_at BEFORE UPDATE ON public.accommodations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activities activities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices assert_invoice_deletable_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER assert_invoice_deletable_trigger BEFORE DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.assert_invoice_deletable();


--
-- Name: invoice_lines assert_invoice_lines_mutable_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER assert_invoice_lines_mutable_trigger BEFORE INSERT OR DELETE OR UPDATE ON public.invoice_lines FOR EACH ROW EXECUTE FUNCTION public.assert_invoice_lines_mutable();


--
-- Name: invoices assert_invoice_transition_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER assert_invoice_transition_trigger BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.assert_invoice_transition();


--
-- Name: invoices assign_invoice_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER assign_invoice_number_trigger BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();


--
-- Name: booking_traveller_flights booking_traveller_flights_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER booking_traveller_flights_updated_at BEFORE UPDATE ON public.booking_traveller_flights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clients clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_settings company_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: default_tasks default_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER default_tasks_updated_at BEFORE UPDATE ON public.default_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: destinations destinations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER destinations_updated_at BEFORE UPDATE ON public.destinations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quote_day_items quote_day_items_require_mutable_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quote_day_items_require_mutable_version BEFORE INSERT OR DELETE OR UPDATE ON public.quote_day_items FOR EACH ROW EXECUTE FUNCTION public.enforce_quote_day_item_mutable();


--
-- Name: quote_day_items quote_day_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quote_day_items_updated_at BEFORE UPDATE ON public.quote_day_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quote_days quote_days_require_mutable_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quote_days_require_mutable_version BEFORE INSERT OR DELETE OR UPDATE ON public.quote_days FOR EACH ROW EXECUTE FUNCTION public.enforce_direct_quote_child_mutable();


--
-- Name: quote_days quote_days_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quote_days_updated_at BEFORE UPDATE ON public.quote_days FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quote_price_lines quote_price_lines_require_mutable_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quote_price_lines_require_mutable_version BEFORE INSERT OR DELETE OR UPDATE ON public.quote_price_lines FOR EACH ROW EXECUTE FUNCTION public.enforce_direct_quote_child_mutable();


--
-- Name: quote_price_lines quote_price_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quote_price_lines_updated_at BEFORE UPDATE ON public.quote_price_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quote_travellers quote_travellers_require_mutable_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quote_travellers_require_mutable_version BEFORE INSERT OR DELETE OR UPDATE ON public.quote_travellers FOR EACH ROW EXECUTE FUNCTION public.enforce_direct_quote_child_mutable();


--
-- Name: quote_travellers quote_travellers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quote_travellers_updated_at BEFORE UPDATE ON public.quote_travellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quote_versions quote_versions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quote_versions_updated_at BEFORE UPDATE ON public.quote_versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quotes quotes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: request_flights request_flights_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER request_flights_updated_at BEFORE UPDATE ON public.request_flights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: request_staff_assignments request_staff_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER request_staff_assignments_updated_at BEFORE UPDATE ON public.request_staff_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: request_vehicle_assignments request_vehicle_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER request_vehicle_assignments_updated_at BEFORE UPDATE ON public.request_vehicle_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: requests requests_stamp_status_changed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER requests_stamp_status_changed BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.requests_stamp_status_changed();


--
-- Name: requests requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rooms rooms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: supplier_rate_cards supplier_rate_cards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_rate_cards_updated_at BEFORE UPDATE ON public.supplier_rate_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: supplier_rates supplier_rates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supplier_rates_updated_at BEFORE UPDATE ON public.supplier_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoice_lines sync_invoice_total_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_invoice_total_trigger AFTER INSERT OR DELETE OR UPDATE ON public.invoice_lines FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_total();


--
-- Name: tour_days tour_days_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tour_days_updated_at BEFORE UPDATE ON public.tour_days FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tour_staff tour_staff_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tour_staff_updated_at BEFORE UPDATE ON public.tour_staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tours tours_set_slug_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tours_set_slug_trigger BEFORE INSERT OR UPDATE ON public.tours FOR EACH ROW EXECUTE FUNCTION public.tours_set_slug();


--
-- Name: tours tours_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tours_updated_at BEFORE UPDATE ON public.tours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: traveller_age_bands traveller_age_bands_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER traveller_age_bands_updated_at BEFORE UPDATE ON public.traveller_age_bands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quote_versions trg_auto_advance_request; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_advance_request AFTER INSERT OR UPDATE OF status ON public.quote_versions FOR EACH ROW EXECUTE FUNCTION public.auto_advance_request_stage();


--
-- Name: requests trg_generate_booking_tasks; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generate_booking_tasks AFTER UPDATE OF stage ON public.requests FOR EACH ROW EXECUTE FUNCTION public.generate_booking_tasks();


--
-- Name: requests trg_log_request_stage_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_request_stage_change AFTER UPDATE OF stage ON public.requests FOR EACH ROW EXECUTE FUNCTION public.log_request_stage_change();


--
-- Name: agreement_templates update_agreement_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agreement_templates_updated_at BEFORE UPDATE ON public.agreement_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: booking_links update_booking_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_booking_links_updated_at BEFORE UPDATE ON public.booking_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: booking_travellers update_booking_travellers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_booking_travellers_updated_at BEFORE UPDATE ON public.booking_travellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bookings update_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: departures update_departures_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_departures_updated_at BEFORE UPDATE ON public.departures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hotel_vouchers update_hotel_vouchers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_hotel_vouchers_updated_at BEFORE UPDATE ON public.hotel_vouchers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoice_lines update_invoice_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoice_lines_updated_at BEFORE UPDATE ON public.invoice_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leads update_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: motorbikes update_motorbikes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_motorbikes_updated_at BEFORE UPDATE ON public.motorbikes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: proposal_templates update_proposal_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_proposal_templates_updated_at BEFORE UPDATE ON public.proposal_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: security_deposits update_security_deposits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_security_deposits_updated_at BEFORE UPDATE ON public.security_deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: services update_services_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: traveller_agreements update_traveller_agreements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_traveller_agreements_updated_at BEFORE UPDATE ON public.traveller_agreements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trip_payments update_trip_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_trip_payments_updated_at BEFORE UPDATE ON public.trip_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trip_services update_trip_services_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_trip_services_updated_at BEFORE UPDATE ON public.trip_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vehicles vehicles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: whatsapp_conversations whatsapp_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER whatsapp_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accommodations accommodations_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accommodations
    ADD CONSTRAINT accommodations_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id) ON DELETE SET NULL;


--
-- Name: activities activities_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id) ON DELETE SET NULL;


--
-- Name: activity_locations activity_locations_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_locations
    ADD CONSTRAINT activity_locations_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: activity_locations activity_locations_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_locations
    ADD CONSTRAINT activity_locations_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id) ON DELETE CASCADE;


--
-- Name: activity_locations activity_locations_park_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_locations
    ADD CONSTRAINT activity_locations_park_id_fkey FOREIGN KEY (park_id) REFERENCES public.parks(id) ON DELETE CASCADE;


--
-- Name: booking_links booking_links_departure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_links
    ADD CONSTRAINT booking_links_departure_id_fkey FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE CASCADE;


--
-- Name: booking_payments booking_payments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_payments
    ADD CONSTRAINT booking_payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_traveller_flights booking_traveller_flights_booking_traveller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_traveller_flights
    ADD CONSTRAINT booking_traveller_flights_booking_traveller_id_fkey FOREIGN KEY (booking_traveller_id) REFERENCES public.booking_travellers(id) ON DELETE CASCADE;


--
-- Name: booking_travellers booking_travellers_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_travellers
    ADD CONSTRAINT booking_travellers_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_travellers booking_travellers_motorbike_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_travellers
    ADD CONSTRAINT booking_travellers_motorbike_id_fkey FOREIGN KEY (motorbike_id) REFERENCES public.motorbikes(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_departure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_departure_id_fkey FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: communication_logs communication_logs_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_logs
    ADD CONSTRAINT communication_logs_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: departures departures_tour_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departures
    ADD CONSTRAINT departures_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE CASCADE;


--
-- Name: hotel_vouchers hotel_vouchers_accommodation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_vouchers
    ADD CONSTRAINT hotel_vouchers_accommodation_id_fkey FOREIGN KEY (accommodation_id) REFERENCES public.accommodations(id) ON DELETE SET NULL;


--
-- Name: hotel_vouchers hotel_vouchers_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_vouchers
    ADD CONSTRAINT hotel_vouchers_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- Name: hotel_vouchers hotel_vouchers_departure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_vouchers
    ADD CONSTRAINT hotel_vouchers_departure_id_fkey FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE CASCADE;


--
-- Name: hotel_vouchers hotel_vouchers_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_vouchers
    ADD CONSTRAINT hotel_vouchers_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: invoice_lines invoice_lines_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_lines invoice_lines_trip_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_trip_service_id_fkey FOREIGN KEY (trip_service_id) REFERENCES public.trip_services(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE RESTRICT;


--
-- Name: invoices invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE RESTRICT;


--
-- Name: quote_acceptances quote_acceptances_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_acceptances
    ADD CONSTRAINT quote_acceptances_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.quote_deliveries(id) ON DELETE SET NULL;


--
-- Name: quote_acceptances quote_acceptances_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_acceptances
    ADD CONSTRAINT quote_acceptances_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_acceptances quote_acceptances_quote_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_acceptances
    ADD CONSTRAINT quote_acceptances_quote_version_id_fkey FOREIGN KEY (quote_version_id) REFERENCES public.quote_versions(id) ON DELETE RESTRICT;


--
-- Name: quote_day_items quote_day_items_accommodation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_day_items
    ADD CONSTRAINT quote_day_items_accommodation_id_fkey FOREIGN KEY (accommodation_id) REFERENCES public.accommodations(id) ON DELETE SET NULL;


--
-- Name: quote_day_items quote_day_items_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_day_items
    ADD CONSTRAINT quote_day_items_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE SET NULL;


--
-- Name: quote_day_items quote_day_items_quote_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_day_items
    ADD CONSTRAINT quote_day_items_quote_day_id_fkey FOREIGN KEY (quote_day_id) REFERENCES public.quote_days(id) ON DELETE CASCADE;


--
-- Name: quote_day_items quote_day_items_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_day_items
    ADD CONSTRAINT quote_day_items_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;


--
-- Name: quote_day_items quote_day_items_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_day_items
    ADD CONSTRAINT quote_day_items_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.tour_staff(id) ON DELETE SET NULL;


--
-- Name: quote_day_items quote_day_items_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_day_items
    ADD CONSTRAINT quote_day_items_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: quote_days quote_days_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_days
    ADD CONSTRAINT quote_days_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id) ON DELETE SET NULL;


--
-- Name: quote_days quote_days_quote_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_days
    ADD CONSTRAINT quote_days_quote_version_id_fkey FOREIGN KEY (quote_version_id) REFERENCES public.quote_versions(id) ON DELETE CASCADE;


--
-- Name: quote_deliveries quote_deliveries_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_deliveries
    ADD CONSTRAINT quote_deliveries_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_deliveries quote_deliveries_quote_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_deliveries
    ADD CONSTRAINT quote_deliveries_quote_version_id_fkey FOREIGN KEY (quote_version_id) REFERENCES public.quote_versions(id) ON DELETE CASCADE;


--
-- Name: quote_payments quote_payments_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_payments
    ADD CONSTRAINT quote_payments_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE RESTRICT;


--
-- Name: quote_price_lines quote_price_lines_quote_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_price_lines
    ADD CONSTRAINT quote_price_lines_quote_day_id_fkey FOREIGN KEY (quote_day_id) REFERENCES public.quote_days(id) ON DELETE CASCADE;


--
-- Name: quote_price_lines quote_price_lines_quote_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_price_lines
    ADD CONSTRAINT quote_price_lines_quote_version_id_fkey FOREIGN KEY (quote_version_id) REFERENCES public.quote_versions(id) ON DELETE CASCADE;


--
-- Name: quote_price_lines quote_price_lines_rate_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_price_lines
    ADD CONSTRAINT quote_price_lines_rate_card_id_fkey FOREIGN KEY (rate_card_id) REFERENCES public.supplier_rate_cards(id) ON DELETE SET NULL;


--
-- Name: quote_price_lines quote_price_lines_supplier_rate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_price_lines
    ADD CONSTRAINT quote_price_lines_supplier_rate_id_fkey FOREIGN KEY (supplier_rate_id) REFERENCES public.supplier_rates(id) ON DELETE SET NULL;


--
-- Name: quote_travellers quote_travellers_age_band_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_travellers
    ADD CONSTRAINT quote_travellers_age_band_id_fkey FOREIGN KEY (age_band_id) REFERENCES public.traveller_age_bands(id) ON DELETE SET NULL;


--
-- Name: quote_travellers quote_travellers_quote_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_travellers
    ADD CONSTRAINT quote_travellers_quote_version_id_fkey FOREIGN KEY (quote_version_id) REFERENCES public.quote_versions(id) ON DELETE CASCADE;


--
-- Name: quote_versions quote_versions_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_versions
    ADD CONSTRAINT quote_versions_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_accepted_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_accepted_version_id_fkey FOREIGN KEY (accepted_version_id) REFERENCES public.quote_versions(id) ON DELETE SET NULL;


--
-- Name: quotes quotes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- Name: quotes quotes_departure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_departure_id_fkey FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE SET NULL;


--
-- Name: quotes quotes_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE SET NULL;


--
-- Name: quotes quotes_tour_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE SET NULL;


--
-- Name: request_flights request_flights_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_flights
    ADD CONSTRAINT request_flights_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: request_staff_assignments request_staff_assignments_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_staff_assignments
    ADD CONSTRAINT request_staff_assignments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: request_staff_assignments request_staff_assignments_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_staff_assignments
    ADD CONSTRAINT request_staff_assignments_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.tour_staff(id) ON DELETE RESTRICT;


--
-- Name: request_vehicle_assignments request_vehicle_assignments_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_vehicle_assignments
    ADD CONSTRAINT request_vehicle_assignments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: request_vehicle_assignments request_vehicle_assignments_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_vehicle_assignments
    ADD CONSTRAINT request_vehicle_assignments_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE RESTRICT;


--
-- Name: requests requests_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: requests requests_handled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: requests requests_tour_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE SET NULL;


--
-- Name: rooms rooms_accommodation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_accommodation_id_fkey FOREIGN KEY (accommodation_id) REFERENCES public.accommodations(id) ON DELETE CASCADE;


--
-- Name: security_deposits security_deposits_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_deposits
    ADD CONSTRAINT security_deposits_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE RESTRICT;


--
-- Name: security_deposits security_deposits_booking_traveller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_deposits
    ADD CONSTRAINT security_deposits_booking_traveller_id_fkey FOREIGN KEY (booking_traveller_id) REFERENCES public.booking_travellers(id) ON DELETE SET NULL;


--
-- Name: security_deposits security_deposits_motorbike_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_deposits
    ADD CONSTRAINT security_deposits_motorbike_id_fkey FOREIGN KEY (motorbike_id) REFERENCES public.motorbikes(id) ON DELETE SET NULL;


--
-- Name: supplier_payments supplier_payments_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: supplier_payments supplier_payments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: supplier_rate_cards supplier_rate_cards_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_rate_cards
    ADD CONSTRAINT supplier_rate_cards_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: supplier_rates supplier_rates_rate_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_rates
    ADD CONSTRAINT supplier_rates_rate_card_id_fkey FOREIGN KEY (rate_card_id) REFERENCES public.supplier_rate_cards(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: tour_days tour_days_accommodation_alt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_days
    ADD CONSTRAINT tour_days_accommodation_alt_id_fkey FOREIGN KEY (accommodation_alt_id) REFERENCES public.accommodations(id) ON DELETE SET NULL;


--
-- Name: tour_days tour_days_accommodation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_days
    ADD CONSTRAINT tour_days_accommodation_id_fkey FOREIGN KEY (accommodation_id) REFERENCES public.accommodations(id) ON DELETE SET NULL;


--
-- Name: tour_days tour_days_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_days
    ADD CONSTRAINT tour_days_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id) ON DELETE SET NULL;


--
-- Name: tour_days tour_days_tour_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tour_days
    ADD CONSTRAINT tour_days_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE CASCADE;


--
-- Name: traveller_agreements traveller_agreements_agreement_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveller_agreements
    ADD CONSTRAINT traveller_agreements_agreement_template_id_fkey FOREIGN KEY (agreement_template_id) REFERENCES public.agreement_templates(id) ON DELETE SET NULL;


--
-- Name: traveller_agreements traveller_agreements_booking_traveller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveller_agreements
    ADD CONSTRAINT traveller_agreements_booking_traveller_id_fkey FOREIGN KEY (booking_traveller_id) REFERENCES public.booking_travellers(id) ON DELETE CASCADE;


--
-- Name: traveller_agreements traveller_agreements_departure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveller_agreements
    ADD CONSTRAINT traveller_agreements_departure_id_fkey FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE SET NULL;


--
-- Name: trip_payments trip_payments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_payments
    ADD CONSTRAINT trip_payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE RESTRICT;


--
-- Name: trip_payments trip_payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_payments
    ADD CONSTRAINT trip_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: trip_payments trip_payments_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_payments
    ADD CONSTRAINT trip_payments_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE RESTRICT;


--
-- Name: trip_services trip_services_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_services
    ADD CONSTRAINT trip_services_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE RESTRICT;


--
-- Name: trip_services trip_services_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_services
    ADD CONSTRAINT trip_services_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE RESTRICT;


--
-- Name: trip_services trip_services_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_services
    ADD CONSTRAINT trip_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE RESTRICT;


--
-- Name: booking_links Admins can manage booking_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage booking_links" ON public.booking_links TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());


--
-- Name: clients Admins can manage clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage clients" ON public.clients TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());


--
-- Name: communication_logs Admins can manage communication_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage communication_logs" ON public.communication_logs TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());


--
-- Name: hotel_vouchers Admins can manage hotel_vouchers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage hotel_vouchers" ON public.hotel_vouchers TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());


--
-- Name: leads Admins can manage leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage leads" ON public.leads TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());


--
-- Name: proposal_templates Admins can manage proposal_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage proposal_templates" ON public.proposal_templates TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());


--
-- Name: requests Admins can manage requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage requests" ON public.requests TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());


--
-- Name: services Admins can manage services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage services" ON public.services TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());


--
-- Name: accommodations Public read active accommodations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read active accommodations" ON public.accommodations FOR SELECT USING ((is_active = true));


--
-- Name: activities Public read active activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read active activities" ON public.activities FOR SELECT USING ((is_active = true));


--
-- Name: departures Public read active departures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read active departures" ON public.departures FOR SELECT USING ((is_active = true));


--
-- Name: destinations Public read active destinations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read active destinations" ON public.destinations FOR SELECT USING ((is_active = true));


--
-- Name: rooms Public read active rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read active rooms" ON public.rooms FOR SELECT USING ((is_active AND (EXISTS ( SELECT 1
   FROM public.accommodations a
  WHERE ((a.id = rooms.accommodation_id) AND a.is_active)))));


--
-- Name: tour_staff Public read active tour_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read active tour_staff" ON public.tour_staff FOR SELECT USING ((is_active = true));


--
-- Name: tours Public read active tours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read active tours" ON public.tours FOR SELECT USING ((status = 'active'::text));


--
-- Name: activity_locations Public read activity locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read activity locations" ON public.activity_locations FOR SELECT USING (true);


--
-- Name: tour_days Public read tour_days of active tours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read tour_days of active tours" ON public.tour_days FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.tours t
  WHERE ((t.id = tour_days.tour_id) AND (t.status = 'active'::text)))));


--
-- Name: accommodations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;

--
-- Name: activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: agreement_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_links ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_staff ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_traveller_flights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_traveller_flights ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_travellers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_travellers ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: communication_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: company_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: corporate_enquiries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.corporate_enquiries ENABLE ROW LEVEL SECURITY;

--
-- Name: default_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.default_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: departures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departures ENABLE ROW LEVEL SECURITY;

--
-- Name: destinations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: gift_vouchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gift_vouchers ENABLE ROW LEVEL SECURITY;

--
-- Name: hotel_pricing; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hotel_pricing ENABLE ROW LEVEL SECURITY;

--
-- Name: hotel_vouchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hotel_vouchers ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: motorbikes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.motorbikes ENABLE ROW LEVEL SECURITY;

--
-- Name: park_fees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.park_fees ENABLE ROW LEVEL SECURITY;

--
-- Name: parks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parks ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: proposal_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_acceptances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_acceptances ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_day_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_day_items ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_days; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_days ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_price_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_price_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_travellers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_travellers ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: request_flights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_flights ENABLE ROW LEVEL SECURITY;

--
-- Name: request_staff_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_staff_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: request_vehicle_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_vehicle_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: security_deposits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.security_deposits ENABLE ROW LEVEL SECURITY;

--
-- Name: services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_costs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_costs ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_rate_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_rate_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: tour_day_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tour_day_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: tour_days; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tour_days ENABLE ROW LEVEL SECURITY;

--
-- Name: tour_staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tour_staff ENABLE ROW LEVEL SECURITY;

--
-- Name: tours; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;

--
-- Name: traveller_age_bands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.traveller_age_bands ENABLE ROW LEVEL SECURITY;

--
-- Name: traveller_agreements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.traveller_agreements ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trip_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trip_services ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicle_pricing; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicle_pricing ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

--
-- Name: waitlists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.waitlists ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


