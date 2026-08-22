-- Group 97: one atomic sales-intake operation.
--
-- The common admin path previously performed client, request, quote version,
-- language and traveller writes independently. This RPC creates the complete
-- request and optional proposal shell in one transaction, so the operator can
-- start pricing immediately without duplicate entry or partial records.

create or replace function public.create_sales_request_atomic(
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
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_client public.clients%rowtype;
  v_client_id uuid;
  v_request_id uuid;
  v_quote_id uuid;
  v_version_id uuid;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_language text := case when p_language = 'ar' then 'ar' else 'en' end;
  v_group_size integer;
  v_band record;
  v_count integer;
  v_label text;
  v_sort integer := 0;
  v_i integer;
begin
  if p_adults < 1 or p_adults > 50
     or p_children_older < 0 or p_children_younger < 0
     or p_adults + p_children_older + p_children_younger > 50 then
    raise exception using errcode = 'P0001', message = 'SALES_INVALID_TRAVELLERS';
  end if;
  if p_trip_length_nights is not null and (p_trip_length_nights < 1 or p_trip_length_nights > 90) then
    raise exception using errcode = 'P0001', message = 'SALES_INVALID_DURATION';
  end if;
  if p_preferred_room_type is not null
     and p_preferred_room_type not in ('sharing', 'single', 'family') then
    raise exception using errcode = 'P0001', message = 'SALES_INVALID_ROOM_TYPE';
  end if;

  if p_existing_client_id is not null then
    select * into v_client
    from public.clients
    where id = p_existing_client_id
    for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'SALES_CLIENT_NOT_FOUND';
    end if;
    v_client_id := v_client.id;
    v_language := case when coalesce(v_client.preferred_language, v_client.language) = 'ar' then 'ar' else 'en' end;
  else
    if v_email = '' or v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
      raise exception using errcode = 'P0001', message = 'SALES_VALID_EMAIL_REQUIRED';
    end if;
    if nullif(btrim(coalesce(p_first_name, '')), '') is null
       or nullif(btrim(coalesce(p_last_name, '')), '') is null then
      raise exception using errcode = 'P0001', message = 'SALES_CLIENT_NAME_REQUIRED';
    end if;

    select * into v_client
    from public.clients
    where lower(email) = v_email
    limit 1
    for update;

    if found then
      update public.clients
      set first_name = btrim(p_first_name),
          last_name = btrim(p_last_name),
          phone = nullif(btrim(coalesce(p_phone, '')), ''),
          whatsapp = nullif(btrim(coalesce(p_whatsapp, '')), ''),
          country = nullif(btrim(coalesce(p_country, '')), ''),
          language = v_language,
          preferred_language = v_language
      where id = v_client.id
      returning * into v_client;
      v_client_id := v_client.id;
    else
      begin
        insert into public.clients (
          email, first_name, last_name, phone, whatsapp, country,
          language, preferred_language, source
        ) values (
          v_email,
          btrim(p_first_name),
          btrim(p_last_name),
          nullif(btrim(coalesce(p_phone, '')), ''),
          nullif(btrim(coalesce(p_whatsapp, '')), ''),
          nullif(btrim(coalesce(p_country, '')), ''),
          v_language,
          v_language,
          left(coalesce(nullif(btrim(p_source), ''), 'admin'), 100)
        ) returning * into v_client;
        v_client_id := v_client.id;
      exception when unique_violation then
        select * into v_client
        from public.clients
        where lower(email) = v_email
        limit 1
        for update;
        v_client_id := v_client.id;
      end;
    end if;
  end if;

  v_group_size := p_adults + p_children_older + p_children_younger;

  insert into public.requests (
    client_id, stage, source, travelers_adults, travelers_children_older,
    travelers_children_younger, group_size, preferred_start_date,
    trip_length_nights, preferred_room_type, client_question, priority, tour_id
  ) values (
    v_client_id,
    case when p_create_quote then 'working_on' else 'new' end,
    nullif(btrim(coalesce(p_source, '')), ''),
    p_adults,
    p_children_older,
    p_children_younger,
    v_group_size,
    p_preferred_start_date,
    p_trip_length_nights,
    nullif(btrim(coalesce(p_preferred_room_type, '')), ''),
    nullif(btrim(coalesce(p_client_question, '')), ''),
    p_priority,
    p_tour_id
  ) returning id into v_request_id;

  if not p_create_quote then
    return jsonb_build_object(
      'clientId', v_client_id,
      'requestId', v_request_id,
      'quoteId', null,
      'quoteVersionId', null
    );
  end if;

  if p_quote_mode not in ('custom', 'fixed_departure') then
    raise exception using errcode = 'P0001', message = 'SALES_INVALID_QUOTE_MODE';
  end if;
  if p_quote_mode = 'fixed_departure' then
    if p_departure_id is null or not exists (
      select 1 from public.departures
      where id = p_departure_id
        and kind = 'scheduled_group'
        and is_active = true
        and status = 'available'
    ) then
      raise exception using errcode = 'P0001', message = 'SALES_DEPARTURE_UNAVAILABLE';
    end if;
  end if;

  v_quote_id := public.create_quote_with_version(
    v_client_id,
    v_request_id,
    p_quote_mode,
    p_tour_id,
    p_departure_id,
    nullif(btrim(coalesce(p_quote_title, '')), ''),
    p_created_by
  );

  select id into v_version_id
  from public.quote_versions
  where quote_id = v_quote_id
  order by version_number
  limit 1;

  update public.quote_versions
  set language = v_language
  where id = v_version_id;

  for v_band in
    select * from public.traveller_age_bands
    where code in ('adult', 'child', 'infant') and is_active = true
    order by sort_order, id
  loop
    if v_band.code = 'adult' then
      v_count := p_adults;
      v_label := 'Adult';
    elsif v_band.code = 'child' then
      v_count := p_children_older;
      v_label := 'Child';
    else
      v_count := p_children_younger;
      v_label := 'Infant';
    end if;

    for v_i in 1..v_count loop
      insert into public.quote_travellers (
        quote_version_id, display_name, age_band_id, age_band_snapshot,
        traveller_category, room_category, is_paying, is_complimentary, sort_order
      ) values (
        v_version_id,
        v_label || ' ' || v_i,
        v_band.id,
        jsonb_build_object(
          'id', v_band.id,
          'name', v_band.name,
          'code', v_band.code,
          'min_age', v_band.min_age,
          'max_age', v_band.max_age,
          'default_pricing_method', v_band.default_pricing_method,
          'default_percentage', case when v_band.default_pricing_method = 'percentage' then v_band.default_percentage else null end,
          'default_fixed_amount_usd', case when v_band.default_pricing_method = 'fixed' then v_band.default_fixed_amount_usd else null end
        ),
        v_band.code,
        case when p_preferred_room_type = 'single' then 'single' else 'sharing' end,
        v_band.default_pricing_method <> 'free',
        false,
        v_sort
      );
      v_sort := v_sort + 1;
    end loop;
  end loop;

  return jsonb_build_object(
    'clientId', v_client_id,
    'requestId', v_request_id,
    'quoteId', v_quote_id,
    'quoteVersionId', v_version_id
  );
end;
$$;

revoke all on function public.create_sales_request_atomic(
  uuid, text, text, text, text, text, text, text, text, text, date,
  integer, text, integer, integer, integer, boolean, boolean, text, uuid,
  uuid, text, uuid
) from public, anon, authenticated;
grant execute on function public.create_sales_request_atomic(
  uuid, text, text, text, text, text, text, text, text, text, date,
  integer, text, integer, integer, integer, boolean, boolean, text, uuid,
  uuid, text, uuid
) to service_role;
