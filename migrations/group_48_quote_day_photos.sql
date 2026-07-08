-- Group 48: per-day photos for the itinerary builder + public proposal.
--
-- W3 (itinerary richness) gap: quote_days already has bilingual
-- title/description/meals/activities wired end-to-end from builder to public
-- proposal, but no photo field — despite a public `tour-media` storage
-- bucket that has existed since group_24 specifically for "hero, gallery,
-- per-day photos". Adds the column and updates save_quote_itinerary to
-- persist it (mirrors the existing `meals` text[] handling).
--
-- Idempotent — safe to re-run.

alter table quote_days
  add column if not exists photos text[] not null default '{}';

create or replace function save_quote_itinerary(p_version_id uuid, p_days jsonb)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
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
        sort_order          = v_day_index
      where id = v_existing_id and quote_version_id = p_version_id
      returning id into v_day_id;

      if v_day_id is null then
        raise exception 'A quote day does not belong to this version.';
      end if;
    else
      insert into quote_days (
        quote_version_id, day_number, day_date,
        title, description_en, client_notes,
        title_ar, description_ar, client_notes_ar,
        destination_id, destination_snapshot, meals, photos, sort_order
      ) values (
        p_version_id,
        (v_day->>'dayNumber')::integer,
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
$function$;
