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

  if p_request_id is not null and not exists (
    select 1 from public.requests
    where id = p_request_id and client_id = p_client_id
  ) then
    raise exception using errcode = 'P0001', message = 'PROPOSAL_REQUEST_CLIENT_MISMATCH';
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

  -- Complete fields introduced after the legacy copy routine.
  update public.quote_versions destination
  set builder_state = source.builder_state,
      preview_layout = source.preview_layout,
      preview_theme = source.preview_theme,
      arrival_notes = source.arrival_notes,
      departure_notes = source.departure_notes,
      track_label = source.track_label,
      compare_group = source.compare_group,
      cost_base_usd = source.cost_base_usd
  from public.quote_versions source
  where destination.id = v_new_version
    and source.id = v_source_version;

  update public.quote_days destination
  set title_ar = source.title_ar,
      client_notes_ar = source.client_notes_ar,
      day_end = source.day_end,
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
      additional_price_usd = source_item.additional_price_usd
  from public.quote_day_items source_item
  join public.quote_days source_day on source_day.id = source_item.quote_day_id
  join public.quote_days destination_day
    on destination_day.quote_version_id = v_new_version
   and destination_day.day_number = source_day.day_number
  where source_day.quote_version_id = v_source_version
    and destination.quote_day_id = destination_day.id
    and destination.sort_order = source_item.sort_order
    and destination.item_type = source_item.item_type;

  insert into public.quote_travellers (
    quote_version_id, display_name, age_on_travel_date, age_band_id,
    age_band_snapshot, pricing_fixed_amount_usd, traveller_category,
    room_category, is_paying, is_complimentary, sort_order,
    dietary_requirements, allergies
  )
  select
    v_new_version, display_name, age_on_travel_date, age_band_id,
    age_band_snapshot, pricing_fixed_amount_usd, traveller_category,
    room_category, is_paying, is_complimentary, sort_order,
    dietary_requirements, allergies
  from public.quote_travellers
  where quote_version_id = v_source_version
    and not exists (
      select 1 from public.quote_travellers
      where quote_version_id = v_new_version
    );

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
