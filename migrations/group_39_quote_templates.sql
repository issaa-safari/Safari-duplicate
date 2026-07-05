-- Group 39: Quote templates — real live-copy of a quote's itinerary + pricing
--
-- Today "tour templates" just redirects to the static tour catalog and
-- create_quote_with_version() never copies itinerary rows. This adds:
--   * quotes.is_template — flags a quote as a reusable template
--   * copy_quote_as_new() — deep-copies a source quote's latest version (days,
--     day items, price lines, travellers) into a NEW quote bound to a request,
--     as an immutable snapshot (not a live reference).
--
-- Idempotent — safe to re-run. Run after group_38.

alter table quotes
  add column if not exists is_template boolean not null default false;

create index if not exists quotes_is_template_idx on quotes (is_template) where is_template;

-- Deep-copy the latest version of p_source_quote into a brand-new quote for
-- p_request_id / p_client_id. Returns the new quote id. The new version starts
-- as a draft (version 1); the source is only read, never mutated.
create or replace function copy_quote_as_new(
  p_source_quote_id uuid,
  p_request_id uuid,
  p_client_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src_version   uuid;
  v_new_quote     uuid;
  v_new_version   uuid;
  v_day           record;
  v_new_day       uuid;
begin
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

  -- New quote shell (quote_number auto-generates via default).
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

  -- Clone days (remember the old→new id mapping via a temp per-day copy).
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

  -- Clone version-level price lines (those not tied to a specific day; day-tied
  -- lines are re-derived by the trip builder, matching existing conventions).
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
