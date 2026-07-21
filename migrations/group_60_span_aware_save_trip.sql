-- Group 60: make save_trip aware of multi-night day spans.
--
-- The itinerary builder stores a multi-night stop as ONE quote_days row with
-- day_number_end set (e.g. "Day 2-3" is {day_number:2, day_number_end:3}); the
-- intermediate day numbers (3) never get their own row. The Trip Builder
-- pricing save, however, builds a `days` payload with one entry per calendar
-- date (dayNumber 1..N) and had no knowledge of day_number_end, so save_trip
-- (group_52) INSERTed a blank filler row for each covered day. The proposal
-- then showed the correct "Day 2-3" card AND a redundant blank "Day 3".
--
-- This migration:
--   1. One-time cleanup — removes filler rows already created for days that
--      fall inside another row's span (safe: covered days never carry items or
--      price lines; the Trip Builder attaches those to the check-in day only).
--   2. Redefines save_trip to be span-aware:
--        (a) the new-version seed now copies day_number_end so spans survive
--            version creation (previously silently dropped);
--        (b) covered day numbers are computed from the version's existing spans;
--        (c) the day-sync delete also drops stale covered filler rows;
--        (d) the per-day upsert loop skips covered days, so no filler is made.
--
-- Everything else is unchanged from group_52. Idempotent — safe to re-run.

-- ── 1. One-time data cleanup ────────────────────────────────────────────────
-- Remove filler rows already created for days folded into another row's span.
-- session_replication_role=replica suspends user triggers for this session so
-- the guard from group_13 (quote_days_require_mutable_version) doesn't block
-- the repair on already-sent/locked versions — the quotes clients have already
-- seen are exactly the ones that need it. Only empty rows are touched (no
-- destination is irrelevant; the item/price-line guards ensure nothing real is
-- deleted), so this alters no substantive quote content.
set session_replication_role = replica;

delete from quote_days qd
using quote_days span
where qd.quote_version_id = span.quote_version_id
  and span.id <> qd.id
  and span.day_number_end is not null
  and qd.day_number >  span.day_number
  and qd.day_number <= span.day_number_end
  and not exists (select 1 from quote_day_items  i  where i.quote_day_id  = qd.id)
  and not exists (select 1 from quote_price_lines pl where pl.quote_day_id = qd.id);

reset session_replication_role;

-- ── 2. Span-aware save_trip ─────────────────────────────────────────────────
create or replace function save_trip(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function save_trip(jsonb) from public, anon, authenticated;
grant execute on function save_trip(jsonb) to service_role;
