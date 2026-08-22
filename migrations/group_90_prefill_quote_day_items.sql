-- Group 90: fix fixed-departure / tour-linked quote prefill silently dropping
-- accommodation, activities, and destination names
--
-- create_quote_with_version's tour_days -> quote_days deep-copy (group_47)
-- only ever copied title/description/destination_id/meals/a raw activities
-- jsonb blob into quote_days. It never populated quote_days.destination_snapshot
-- (the {id, name} jsonb the client-facing quote page reads instead of
-- destination_id), and never created quote_day_items rows for the tour day's
-- accommodation_id or activities (the client-facing page reads quote_day_items,
-- not quote_days.activities). Any quote created from a fixed departure, or a
-- custom quote against a tour template, rendered with blank destinations and
-- no accommodation/activities on /quote/[token] until the admin manually
-- re-opened and re-saved the day in the itinerary builder.
--
-- Also copies day_number_end (multi-night stops collapsed to single days)
-- and image_url -> photos, which the same copy silently dropped.
--
-- Idempotent — safe to re-run (create_or_replace + a backfill guarded by
-- "destination_snapshot is still empty and no items exist yet").

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

revoke all on function create_quote_with_version(uuid, uuid, text, uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function create_quote_with_version(uuid, uuid, text, uuid, uuid, text, uuid)
  to service_role;

-- ── Backfill existing quotes hit by the bug ─────────────────────────────────
-- For any quote_days row that a tour-linked quote produced via the old
-- (broken) prefill — recognisable by an empty destination_snapshot and no
-- quote_day_items yet, meaning the admin never re-saved the day — recover
-- destination/accommodation/activities from the same tour's tour_days row at
-- the same day_number. Skips any day the admin already touched (non-empty
-- destination_snapshot, or items already present), so this is safe to re-run
-- and safe against days that were always meant to be blank.
do $$
declare
  v_row record;
  v_td record;
  v_dest_snapshot jsonb;
  v_acc record;
  v_act jsonb;
  v_act_row record;
  v_sort int;
begin
  for v_row in
    select qd.id as quote_day_id, qd.day_number, q.tour_id
    from quote_days qd
    join quote_versions qv on qv.id = qd.quote_version_id
    join quotes q on q.id = qv.quote_id
    where q.tour_id is not null
      and qd.destination_snapshot = '{}'::jsonb
      and not exists (select 1 from quote_day_items qi where qi.quote_day_id = qd.id)
  loop
    select * into v_td from tour_days
    where tour_id = v_row.tour_id and day_number = v_row.day_number
    limit 1;

    if v_td.id is null then
      continue;
    end if;

    v_dest_snapshot := '{}'::jsonb;
    if v_td.destination_id is not null then
      select jsonb_build_object('id', id, 'name', name) into v_dest_snapshot
      from destinations where id = v_td.destination_id;
      v_dest_snapshot := coalesce(v_dest_snapshot, '{}'::jsonb);
    end if;

    update quote_days set
      destination_snapshot = v_dest_snapshot,
      day_number_end = coalesce(quote_days.day_number_end, v_td.day_number_end),
      photos = case when v_td.image_url is not null and coalesce(array_length(photos, 1), 0) = 0
                    then array[v_td.image_url] else photos end
    where id = v_row.quote_day_id;

    v_sort := 0;

    if v_td.accommodation_id is not null then
      select id, name, destination_id, description_en into v_acc
      from accommodations where id = v_td.accommodation_id;
      if v_acc.id is not null then
        insert into quote_day_items (
          quote_day_id, item_type, accommodation_id, title_snapshot, content_snapshot, sort_order
        ) values (
          v_row.quote_day_id, 'accommodation', v_acc.id, v_acc.name,
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
            v_row.quote_day_id, 'activity', v_act_row.id, v_act_row.name,
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
end $$;
