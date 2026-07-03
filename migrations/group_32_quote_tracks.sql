-- Group 32: Dual-track quotes (Standard vs Premium) + atomic trip save
-- Run in Supabase SQL Editor after Group 31.
-- Requires: group_12 (quote builder tables), group_13/17 (assert_quote_version_mutable,
-- mutability triggers, snapshot conventions).
--
-- Adds:
--   * quote_versions.track_label / compare_group — sibling versions sharing a
--     compare_group are one proposal priced twice (standard/premium hotels,
--     identical transport + park lines).
--   * save_trip(jsonb) — one transactional, idempotent write for the Trip
--     Builder: upserts the quote + both track versions + travellers, days,
--     items and price lines. Re-saving a draft updates it in place; any error
--     rolls the whole save back. Locked (sent/accepted/…) versions are
--     rejected by assert_quote_version_mutable.

alter table quote_versions
  add column if not exists track_label text
    check (track_label is null or track_label in ('standard','premium')),
  add column if not exists compare_group uuid,
  -- Raw Trip Builder form state, so a saved draft reopens in the builder
  -- exactly as entered (price lines are derived data and lossy to reverse).
  add column if not exists builder_state jsonb;

create index if not exists quote_versions_compare_idx
  on quote_versions (compare_group) where compare_group is not null;

-- Atomic Trip Builder save. Payload shape (all keys camelCase, matching
-- save_quote_itinerary conventions):
-- {
--   "quoteId":  null | uuid,          -- null = create a new quote
--   "clientId": uuid,
--   "title": text | null,
--   "travelStartDate": date, "travelEndDate": date,
--   "compareGroup": null | uuid,      -- null = mint a new group
--   "createdBy": null | uuid,
--   "exchangeRatesSnapshot": jsonb,   -- e.g. {"usd_to_kes": 129}
--   "builderState": jsonb | null,     -- raw builder form state (both versions)
--   "tracks": [{
--     "trackLabel": "standard" | "premium",
--     "versionId": null | uuid,       -- null = create a new version
--     "defaultMarkupPercent": numeric,
--     "travellers": [{ "displayName", "ageOnTravelDate", "ageBandId",
--                      "ageBandSnapshot", "travellerCategory", "roomCategory",
--                      "isPaying", "sortOrder" }],
--     "days":  [{ "dayNumber", "dayDate", "title",
--                 "items": [{ "itemType", "entityId", "titleSnapshot",
--                             "roomCategory", "sortOrder" }] }],
--     "priceLines": [{ "dayNumber" | null, "costCategory", "description",
--                      "rateCardId", "supplierRateId", "pricingUnit",
--                      "travellerCategory", "roomCategory", "quantity",
--                      "sourceCurrency", "sourceUnitCost", "exchangeRateToUsd",
--                      "unitCostUsd", "totalCostUsd", "totalSellingUsd",
--                      "internalNotes", "sortOrder" }]
--   }]
-- }
-- Line-level totals are computed by the server action (lib/pricing.ts is the
-- single markup formula); version totals are recomputed here from the rows
-- actually written, so client math is never trusted.
create or replace function save_trip(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid := nullif(p_payload->>'quoteId', '')::uuid;
  v_client_id uuid := nullif(p_payload->>'clientId', '')::uuid;
  v_compare_group uuid := coalesce(nullif(p_payload->>'compareGroup', '')::uuid, gen_random_uuid());
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
  v_day_id uuid;
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

  for v_track in select value from jsonb_array_elements(p_payload->'tracks')
  loop
    if coalesce(v_track->>'trackLabel', '') not in ('standard', 'premium') then
      raise exception 'Track label must be standard or premium.';
    end if;

    v_version_id := nullif(v_track->>'versionId', '')::uuid;

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

    -- Idempotent re-save: rewrite all children of this (mutable) version.
    delete from quote_price_lines where quote_version_id = v_version_id;
    delete from quote_travellers where quote_version_id = v_version_id;
    delete from quote_days where quote_version_id = v_version_id;

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
      if coalesce((v_day->>'dayNumber')::integer, 0) < 1 then
        raise exception 'Every day must have a positive day number.';
      end if;

      insert into quote_days (quote_version_id, day_number, day_date, title, sort_order)
      values (
        v_version_id,
        (v_day->>'dayNumber')::integer,
        nullif(v_day->>'dayDate', '')::date,
        nullif(trim(coalesce(v_day->>'title', '')), ''),
        (v_day->>'dayNumber')::integer
      ) returning id into v_day_id;

      v_item_index := 0;
      for v_item in
        select value from jsonb_array_elements(coalesce(v_day->'items', '[]'::jsonb))
      loop
        insert into quote_day_items (
          quote_day_id, item_type,
          accommodation_id, activity_id, vehicle_id, staff_id,
          title_snapshot, room_category, sort_order
        ) values (
          v_day_id,
          v_item->>'itemType',
          case when v_item->>'itemType' = 'accommodation' then nullif(v_item->>'entityId', '')::uuid end,
          case when v_item->>'itemType' = 'activity' then nullif(v_item->>'entityId', '')::uuid end,
          case when v_item->>'itemType' = 'vehicle' then nullif(v_item->>'entityId', '')::uuid end,
          case when v_item->>'itemType' = 'staff' then nullif(v_item->>'entityId', '')::uuid end,
          coalesce(nullif(trim(coalesce(v_item->>'titleSnapshot', '')), ''), 'Untitled item'),
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

    v_result := v_result
      || jsonb_build_object((v_track->>'trackLabel') || 'VersionId', v_version_id);
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
