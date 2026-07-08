-- Group 47: pre-fill quote_days when a quote is created
--
-- create_quote_with_version only ever inserted a bare quotes + quote_versions
-- row — every new quote (including request -> "+ Create Quote", the common
-- W1 path) landed on the itinerary builder completely blank, regardless of
-- request tour details. This adds day-skeleton pre-fill:
--   * fixed_departure / any quote with a resolved tour_id: deep-copy that
--     tour's tour_days (title/description EN+AR/destination/meals/activities)
--     into quote_days — richest pre-fill, reuses curated content.
--   * custom mode bound to a request with requests.trip_length_nights set
--     (and no tour): generate (nights + 1) blank day rows so the itinerary
--     builder opens with day cards ready to fill in, not an empty page.
-- Also seeds travel_start_date/travel_end_date on the new version from the
-- request's preferred_start_date + trip_length_nights when in custom mode,
-- since only fixed_departure previously set these.
--
-- Idempotent — safe to re-run (create_or_replace).

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
      insert into quote_days (
        quote_version_id, day_number,
        day_date, title, title_ar, description_en, description_ar,
        destination_id, meals, activities, sort_order
      ) values (
        v_version_id, v_td.day_number,
        case when v_start_date is not null then v_start_date + (v_td.day_number - 1) else null end,
        v_td.title_en, v_td.title_ar, v_td.description_en, v_td.description_ar,
        v_td.destination_id, v_meals, coalesce(v_td.activities, '[]'::jsonb), v_td.day_number
      );
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
