-- Safari Adventure Riders â€” consolidated schema baseline
--
-- WHAT THIS IS
-- A single-file reconstruction of the schema that migrations/group_*.sql
-- describes, generated with pg_dump after replaying every group in order.
--
-- WHY IT EXISTS
-- The group_NN files no longer apply cleanly in one pass: 21 of them reference
-- tables that a *later* group creates (group_12 uses `departures`, added in
-- group_21, and so on). They all succeed on a second pass, so nothing is
-- missing â€” but a fresh database cannot be built by running them once in
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
  -- draft â†’ issued â†’ void, and nothing comes back: an issued number that
  -- reverts to a draft is a number reused. A draft is not voided, it is
  -- deleted â€” it was never a document.
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
  -- be null â€” a client-direct copy that isn't tied to a request yet.
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

  -- â”€â”€ Day-skeleton pre-fill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      ) returning …68398 tokens truncated…id_fkey'
      and conrelid = 'public.quotes'::regclass
  ) then
    alter table public.quotes
      add constraint quotes_owner_id_fkey
      foreign key (owner_id) references public.admin_users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_quote_id_fkey'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_quote_id_fkey
      foreign key (quote_id) references public.quotes(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_owner_id_fkey'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_owner_id_fkey
      foreign key (owner_id) references public.admin_users(id) on delete set null;
  end if;
end $$;

alter table public.tasks drop constraint if exists tasks_priority_check;
alter table public.tasks
  add constraint tasks_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));

alter table public.company_settings drop constraint if exists company_settings_request_proposal_due_hours_check;
alter table public.company_settings
  add constraint company_settings_request_proposal_due_hours_check
  check (request_proposal_due_hours between 1 and 720);

alter table public.company_settings drop constraint if exists company_settings_proposal_expiry_warning_days_check;
alter table public.company_settings
  add constraint company_settings_proposal_expiry_warning_days_check
  check (proposal_expiry_warning_days between 1 and 30);

alter table public.company_settings drop constraint if exists company_settings_operations_readiness_window_days_check;
alter table public.company_settings
  add constraint company_settings_operations_readiness_window_days_check
  check (operations_readiness_window_days between 1 and 180);

-- Existing records inherit ownership once. Future records are assigned in the
-- application actions, while unassigned records remain visible in Sales Desk.
update public.quotes q
set owner_id = r.handled_by
from public.requests r
where q.request_id = r.id
  and q.owner_id is null
  and r.handled_by is not null;

-- Backfill accepted request planning into the trip workspace.
insert into public.departure_staff_assignments (
  departure_id, staff_id, role, notes, created_at, updated_at
)
select distinct on (q.departure_id, rsa.staff_id)
  q.departure_id, rsa.staff_id, rsa.role, rsa.notes, rsa.created_at, rsa.updated_at
from public.quotes q
join public.request_staff_assignments rsa on rsa.request_id = q.request_id
where q.status = 'accepted' and q.departure_id is not null
order by q.departure_id, rsa.staff_id, rsa.created_at
on conflict (departure_id, staff_id) do nothing;

insert into public.departure_vehicle_assignments (
  departure_id, vehicle_id, seats_used, notes, created_at, updated_at
)
select distinct on (q.departure_id, rva.vehicle_id)
  q.departure_id, rva.vehicle_id, rva.seats_used, rva.notes, rva.created_at, rva.updated_at
from public.quotes q
join public.request_vehicle_assignments rva on rva.request_id = q.request_id
where q.status = 'accepted' and q.departure_id is not null
order by q.departure_id, rva.vehicle_id, rva.created_at
on conflict (departure_id, vehicle_id) do nothing;

update public.tasks t
set departure_id = coalesce(t.departure_id, q.departure_id),
    booking_id = coalesce(t.booking_id, q.provisional_booking_id),
    quote_id = coalesce(t.quote_id, q.id)
from public.quotes q
where q.status = 'accepted'
  and q.request_id = t.request_id
  and q.departure_id is not null;

-- Adopt follow-up tasks created by the previous title-based implementation so
-- rollout does not create a second task for an already active proposal.
with candidates as (
  select
    t.id,
    q.id as quote_id,
    row_number() over (partition by q.id order by t.created_at, t.id) as task_rank
  from public.tasks t
  join public.quotes q
    on q.request_id = t.request_id
   and t.title = 'Follow up proposal ' || q.quote_number
  where t.automation_key is null
)
update public.tasks t
set quote_id = candidates.quote_id,
    automation_key = case
      when candidates.task_rank = 1 then 'proposal_follow_up:' || candidates.quote_id::text
      else null
    end
from candidates
where t.id = candidates.id;

create index if not exists requests_work_queue_idx
  on public.requests (handled_by, next_action_due_at, created_at)
  where archived_at is null;

create index if not exists quotes_work_queue_idx
  on public.quotes (owner_id, next_action_due_at, updated_at)
  where is_template = false;

create index if not exists tasks_open_owner_due_idx
  on public.tasks (owner_id, due_date, priority)
  where is_done = false;

create index if not exists tasks_quote_id_idx
  on public.tasks (quote_id)
  where quote_id is not null;

create unique index if not exists tasks_automation_key_uidx
  on public.tasks (automation_key)
  where automation_key is not null;

-- Quote creators normally own the proposal; where the auth identity matches an
-- active admin profile this trigger avoids depending on every creation path.
create or replace function public.assign_quote_workflow_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.owner_id is null then
    if new.request_id is not null then
      select handled_by into new.owner_id
      from public.requests
      where id = new.request_id;
    end if;

    if new.owner_id is null and new.created_by is not null then
      select id into new.owner_id
      from public.admin_users
      where id = new.created_by and is_active = true;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_assign_workflow_owner on public.quotes;
create trigger quotes_assign_workflow_owner
before insert on public.quotes
for each row execute function public.assign_quote_workflow_owner();

revoke all on function public.assign_quote_workflow_owner() from public, anon, authenticated;

-- The acceptance RPC remains the transaction boundary. This trigger runs in
-- that same transaction and moves provisional people/vehicle planning plus all
-- request tasks into the operational trip atomically.
create or replace function public.handoff_accepted_quote_operations()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'accepted'
     and new.request_id is not null
     and new.departure_id is not null then
    insert into public.departure_staff_assignments (
      departure_id, staff_id, role, notes, created_at, updated_at
    )
    select new.departure_id, staff_id, role, notes, created_at, updated_at
    from public.request_staff_assignments
    where request_id = new.request_id
    on conflict (departure_id, staff_id) do nothing;

    insert into public.departure_vehicle_assignments (
      departure_id, vehicle_id, seats_used, notes, created_at, updated_at
    )
    select new.departure_id, vehicle_id, seats_used, notes, created_at, updated_at
    from public.request_vehicle_assignments
    where request_id = new.request_id
    on conflict (departure_id, vehicle_id) do nothing;

    update public.tasks
    set departure_id = coalesce(departure_id, new.departure_id),
        booking_id = coalesce(booking_id, new.provisional_booking_id),
        quote_id = coalesce(quote_id, new.id)
    where request_id = new.request_id;
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_handoff_accepted_operations on public.quotes;
create trigger quotes_handoff_accepted_operations
after insert or update of status, departure_id, provisional_booking_id on public.quotes
for each row execute function public.handoff_accepted_quote_operations();

revoke all on function public.handoff_accepted_quote_operations() from public, anon, authenticated;

create or replace function public.prepare_accepted_quote_workflow()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status is distinct from new.status then
    new.next_action := 'Open trip operations and review handoff';
    new.next_action_due_at := now();
    new.last_contact_at := now();
    new.follow_up_outcome := 'Proposal accepted';
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_prepare_accepted_workflow on public.quotes;
create trigger quotes_prepare_accepted_workflow
before update of status on public.quotes
for each row execute function public.prepare_accepted_quote_workflow();

revoke all on function public.prepare_accepted_quote_workflow() from public, anon, authenticated;

-- END migrations/group_103_commercial_workflow_automation.sql

-- BEGIN migrations/group_104_atomic_commercial_creation.sql

-- Group 104: keep commercial workflow metadata inside the creation transaction.
--
-- The underlying creation functions remain the single source of truth. These
-- service-role-only wrappers add owner and next-action metadata before the
-- transaction commits, so a metadata failure cannot leave a successful record
-- that the operator accidentally recreates on retry.

create or replace function public.create_sales_request_with_workflow_atomic(
  p_existing_client_id uuid default null,
  p_email text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_phone text default null,
  p_whatsapp text default null,
  p_country text default null,
  p_language text default 'en',
  p_source text default null,
  p_client_question text default null,
  p_preferred_start_date date default null,
  p_trip_length_nights integer default null,
  p_preferred_room_type text default null,
  p_adults integer default 2,
  p_children_older integer default 0,
  p_children_younger integer default 0,
  p_priority boolean default false,
  p_create_quote boolean default true,
  p_quote_mode text default 'custom',
  p_tour_id uuid default null,
  p_departure_id uuid default null,
  p_quote_title text default null,
  p_created_by uuid default null,
  p_owner_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_request_id uuid;
  v_quote_id uuid;
  v_due_hours integer := 24;
begin
  if p_owner_id is not null and not exists (
    select 1 from public.admin_users where id = p_owner_id and is_active = true
  ) then
    raise exception using errcode = 'P0001', message = 'SALES_INVALID_OWNER';
  end if;

  v_result := public.create_sales_request_atomic(
    p_existing_client_id, p_email, p_first_name, p_last_name, p_phone,
    p_whatsapp, p_country, p_language, p_source, p_client_question,
    p_preferred_start_date, p_trip_length_nights, p_preferred_room_type,
    p_adults, p_children_older, p_children_younger, p_priority,
    p_create_quote, p_quote_mode, p_tour_id, p_departure_id,
    p_quote_title, p_created_by
  );

  v_request_id := nullif(v_result->>'requestId', '')::uuid;
  v_quote_id := nullif(v_result->>'quoteId', '')::uuid;

  select coalesce(request_proposal_due_hours, 24)
  into v_due_hours
  from public.company_settings
  limit 1;

  update public.requests
  set handled_by = p_owner_id,
      next_action = case when p_create_quote
        then 'Build and price proposal'
        else 'Qualify request and create proposal'
      end,
      next_action_due_at = now() + make_interval(hours => v_due_hours)
  where id = v_request_id;

  if v_quote_id is not null then
    update public.quotes
    set owner_id = p_owner_id,
        next_action = 'Build itinerary and price proposal',
        next_action_due_at = now() + make_interval(hours => v_due_hours)
    where id = v_quote_id;
  end if;

  return v_result;
end;
$$;

revoke all on function public.create_sales_request_with_workflow_atomic(
  uuid, text, text, text, text, text, text, text, text, text, date,
  integer, text, integer, integer, integer, boolean, boolean, text, uuid,
  uuid, text, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.create_sales_request_with_workflow_atomic(
  uuid, text, text, text, text, text, text, text, text, text, date,
  integer, text, integer, integer, integer, boolean, boolean, text, uuid,
  uuid, text, uuid, uuid
) to service_role;

create or replace function public.create_quote_with_workflow_atomic(
  p_client_id uuid,
  p_request_id uuid,
  p_mode text,
  p_tour_id uuid,
  p_departure_id uuid,
  p_title text,
  p_created_by uuid,
  p_owner_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quote_id uuid;
  v_due_hours integer := 24;
begin
  if p_owner_id is not null and not exists (
    select 1 from public.admin_users where id = p_owner_id and is_active = true
  ) then
    raise exception using errcode = 'P0001', message = 'SALES_INVALID_OWNER';
  end if;

  v_quote_id := public.create_quote_with_version(
    p_client_id, p_request_id, p_mode, p_tour_id, p_departure_id,
    p_title, p_created_by
  );

  select coalesce(request_proposal_due_hours, 24)
  into v_due_hours
  from public.company_settings
  limit 1;

  update public.quotes
  set owner_id = p_owner_id,
      next_action = 'Build itinerary and price proposal',
      next_action_due_at = now() + make_interval(hours => v_due_hours)
  where id = v_quote_id;

  return v_quote_id;
end;
$$;

revoke all on function public.create_quote_with_workflow_atomic(
  uuid, uuid, text, uuid, uuid, text, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.create_quote_with_workflow_atomic(
  uuid, uuid, text, uuid, uuid, text, uuid, uuid
) to service_role;

-- END migrations/group_104_atomic_commercial_creation.sql

-- BEGIN migrations/group_105_proposal_template_productivity.sql

-- Group 105: atomic proposal-template productivity workflow.
--
-- The original template copy predates traveller details, Arabic day fields,
-- multi-day spans, photos, route distances, rooms and alternative pricing.
-- This wrapper keeps the proven deep-copy routine, completes the newer fields,
-- and attaches workflow ownership in the same transaction.

create or replace function public.copy_proposal_template_atomic(
  p_source_quote_id uuid,
  p_client_id uuid,
  p_request_id uuid default null,
  p_created_by uuid default null,
  p_owner_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_version uuid;
  v_new_quote_id uuid;
  v_new_version uuid;
  v_request_start_date date;
  v_request_end_date date;
begin
  if not exists (
    select 1 from public.quotes
    where id = p_source_quote_id and is_template = true
  ) then
    raise exception using errcode = 'P0001', message = 'PROPOSAL_TEMPLATE_NOT_FOUND';
  end if;

  if not exists (select 1 from public.clients where id = p_client_id) then
    raise exception using errcode = 'P0001', message = 'PROPOSAL_CLIENT_NOT_FOUND';
  end if;

  if p_request_id is not null then
    select preferred_start_date, preferred_end_date
      into v_request_start_date, v_request_end_date
    from public.requests
    where id = p_request_id and client_id = p_client_id;

    if not found then
      raise exception using errcode = 'P0001', message = 'PROPOSAL_REQUEST_CLIENT_MISMATCH';
    end if;
  end if;

  select coalesce(q.accepted_version_id, qv.id)
    into v_source_version
  from public.quotes q
  join public.quote_versions qv on qv.quote_id = q.id
  where q.id = p_source_quote_id
  order by qv.version_number desc
  limit 1;

  v_new_quote_id := public.copy_quote_for_client(
    p_source_quote_id,
    p_client_id,
    p_request_id
  );

  select id into v_new_version
  from public.quote_versions
  where quote_id = v_new_quote_id
  order by version_number
  limit 1;

  -- Complete reusable itinerary fields introduced after the legacy copy
  -- routine. Customer-specific dates and notes are deliberately reset. When
  -- the new quote belongs to a request, its dates come from that request.
  update public.quote_versions destination
  set builder_state = null,
      preview_layout = source.preview_layout,
      preview_theme = source.preview_theme,
      travel_start_date = v_request_start_date,
      travel_end_date = v_request_end_date,
      valid_until = null,
      arrival_notes = null,
      departure_notes = null,
      client_snapshot = '{}'::jsonb,
      internal_notes = null,
      track_label = source.track_label,
      compare_group = source.compare_group,
      cost_base_usd = source.cost_base_usd
  from public.quote_versions source
  where destination.id = v_new_version
    and source.id = v_source_version;

  update public.quote_days destination
  set title_ar = source.title_ar,
      client_notes = null,
      client_notes_ar = null,
      internal_notes = null,
      day_date = case
        when v_request_start_date is null then null
        else v_request_start_date + (destination.day_number - 1)
      end,
      day_end = case
        when v_request_start_date is null or source.day_number_end is null then null
        else v_request_start_date + (source.day_number_end - 1)
      end,
      day_number_end = source.day_number_end,
      distance_km = source.distance_km,
      road_distance_km = source.road_distance_km,
      photos = source.photos,
      activities = source.activities
  from public.quote_days source
  where destination.quote_version_id = v_new_version
    and source.quote_version_id = v_source_version
    and destination.day_number = source.day_number;

  update public.quote_day_items destination
  set room_id = source_item.room_id,
      nights = source_item.nights,
      is_alternative = source_item.is_alternative,
      additional_price_usd = source_item.additional_price_usd,
      client_notes = null,
      internal_notes = null
  from public.quote_day_items source_item
  join public.quote_days source_day on source_day.id = source_item.quote_day_id
  join public.quote_days destination_day
    on destination_day.quote_version_id = v_new_version
   and destination_day.day_number = source_day.day_number
  where source_day.quote_version_id = v_source_version
    and destination.quote_day_id = destination_day.id
    and destination.sort_order = source_item.sort_order
    and destination.item_type = source_item.item_type;

  -- Traveller rows are intentionally not copied. Names, ages, room choices,
  -- dietary requirements and allergies belong to the original customer. The
  -- server action populates fresh anonymous traveller rows from the linked
  -- request after this transaction completes.

  update public.quotes
  set created_by = p_created_by,
      owner_id = p_owner_id,
      next_action = 'Review itinerary and pricing',
      next_action_due_at = now() + interval '1 day',
      updated_at = now()
  where id = v_new_quote_id;

  if p_request_id is not null then
    update public.requests
    set stage = case when stage = 'new' then 'working_on' else stage end,
        next_action = 'Review and send proposal',
        next_action_due_at = now() + interval '1 day',
        updated_at = now()
    where id = p_request_id;
  end if;

  return v_new_quote_id;
end;
$$;

revoke all on function public.copy_proposal_template_atomic(uuid, uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.copy_proposal_template_atomic(uuid, uuid, uuid, uuid, uuid)
  to service_role;

-- END migrations/group_105_proposal_template_productivity.sql

--
-- PostgreSQL database dump complete
--

