-- Group 95: transactional booking creation and quote acceptance
--
-- The application previously coordinated these workflows as several independent
-- PostgREST writes. A failure after the first write could leave reserved seats
-- without a booking, a booking without travellers, or an accepted quote without
-- its booking. These service-role-only RPCs keep each business operation inside
-- one PostgreSQL transaction and lock capacity rows before changing them.
--
-- Groups 91-94 are reserved for the tour SEO/content work developed separately.
-- Idempotent — safe to re-run.

-- Database-level invariants close concurrency gaps even if another write path is
-- added later. PostgreSQL UNIQUE constraints allow multiple NULL values, so a
-- manual booking with no quote remains valid.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_quote_id_key'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_quote_id_key unique (quote_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'quote_acceptances_quote_id_key'
      and conrelid = 'public.quote_acceptances'::regclass
  ) then
    alter table public.quote_acceptances
      add constraint quote_acceptances_quote_id_key unique (quote_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'departures_booked_seats_capacity_check'
      and conrelid = 'public.departures'::regclass
  ) then
    alter table public.departures
      add constraint departures_booked_seats_capacity_check
      check (booked_seats <= max_seats);
  end if;
end $$;

create or replace function public.create_departure_booking_atomic(
  p_departure_id uuid,
  p_travellers jsonb,
  p_user_id uuid default null,
  p_source text default 'website',
  p_room_type text default 'sharing',
  p_booking_link_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_departure public.departures%rowtype;
  v_booking_link public.booking_links%rowtype;
  v_lead jsonb;
  v_group_size integer;
  v_email text;
  v_first_name text;
  v_last_name text;
  v_phone text;
  v_client_id uuid;
  v_request_id uuid;
  v_booking_id uuid;
  v_price_per_person numeric(14,2);
  v_total_price numeric(14,2);
  v_deposit_due numeric(12,2);
  v_booked_room_type text;
begin
  if p_departure_id is null then
    raise exception using errcode = 'P0001', message = 'BOOKING_DEPARTURE_REQUIRED';
  end if;

  if p_travellers is null or jsonb_typeof(p_travellers) <> 'array' then
    raise exception using errcode = 'P0001', message = 'BOOKING_INVALID_TRAVELLERS';
  end if;

  v_group_size := jsonb_array_length(p_travellers);
  if v_group_size < 1 or v_group_size > 50 then
    raise exception using errcode = 'P0001', message = 'BOOKING_INVALID_GROUP_SIZE';
  end if;

  if p_room_type is not null and p_room_type not in ('sharing', 'single') then
    raise exception using errcode = 'P0001', message = 'BOOKING_INVALID_ROOM_TYPE';
  end if;

  -- A token booking locks its link before the departure. Every invocation uses
  -- the same order, preventing a link-limit race and avoiding deadlocks.
  if p_booking_link_id is not null then
    select * into v_booking_link
    from public.booking_links
    where id = p_booking_link_id
    for update;

    if not found or v_booking_link.departure_id <> p_departure_id then
      raise exception using errcode = 'P0001', message = 'BOOKING_LINK_INVALID';
    end if;
    if not v_booking_link.is_active then
      raise exception using errcode = 'P0001', message = 'BOOKING_LINK_DISABLED';
    end if;
    if v_booking_link.expires_at is not null and v_booking_link.expires_at < now() then
      raise exception using errcode = 'P0001', message = 'BOOKING_LINK_EXPIRED';
    end if;
    if v_booking_link.max_bookings is not null
       and v_booking_link.use_count >= v_booking_link.max_bookings then
      raise exception using errcode = 'P0001', message = 'BOOKING_LINK_LIMIT_REACHED';
    end if;
  end if;

  select * into v_departure
  from public.departures
  where id = p_departure_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'BOOKING_DEPARTURE_NOT_FOUND';
  end if;
  if not v_departure.is_active or v_departure.status in ('full', 'closed', 'cancelled') then
    raise exception using errcode = 'P0001', message = 'BOOKING_DEPARTURE_UNAVAILABLE';
  end if;
  if v_departure.booked_seats + v_group_size > v_departure.max_seats then
    raise exception using errcode = 'P0001', message = 'BOOKING_NOT_ENOUGH_SEATS';
  end if;

  if p_room_type = 'single' and v_departure.price_single_usd is not null then
    v_price_per_person := v_departure.price_single_usd;
    v_booked_room_type := 'single';
  elsif coalesce(p_room_type, 'sharing') <> 'single' and v_departure.price_usd is not null then
    v_price_per_person := v_departure.price_usd;
    v_booked_room_type := 'sharing';
  elsif v_departure.price_single_usd is not null then
    v_price_per_person := v_departure.price_single_usd;
    v_booked_room_type := 'single';
  elsif v_departure.price_usd is not null then
    v_price_per_person := v_departure.price_usd;
    v_booked_room_type := 'sharing';
  else
    raise exception using errcode = 'P0001', message = 'BOOKING_PRICE_MISSING';
  end if;

  v_lead := p_travellers -> 0;
  v_email := lower(btrim(coalesce(v_lead ->> 'email', '')));
  v_first_name := nullif(btrim(coalesce(v_lead ->> 'firstName', v_lead ->> 'first_name', '')), '');
  v_last_name := nullif(btrim(coalesce(v_lead ->> 'lastName', v_lead ->> 'last_name', '')), '');
  v_phone := nullif(btrim(coalesce(v_lead ->> 'phone', '')), '');

  if v_email = '' then
    raise exception using errcode = 'P0001', message = 'BOOKING_EMAIL_REQUIRED';
  end if;
  if v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception using errcode = 'P0001', message = 'BOOKING_EMAIL_INVALID';
  end if;

  select id into v_client_id
  from public.clients
  where lower(email) = v_email
  limit 1
  for update;

  if v_client_id is null then
    begin
      insert into public.clients (email, first_name, last_name, phone, source)
      values (
        v_email,
        coalesce(v_first_name, ''),
        coalesce(v_last_name, ''),
        v_phone,
        left(coalesce(nullif(btrim(p_source), ''), 'website'), 100)
      )
      returning id into v_client_id;
    exception when unique_violation then
      select id into v_client_id
      from public.clients
      where lower(email) = v_email
      limit 1
      for update;
    end;
  else
    update public.clients
    set first_name = case when first_name = '' and v_first_name is not null then v_first_name else first_name end,
        last_name = case when last_name = '' and v_last_name is not null then v_last_name else last_name end,
        phone = coalesce(phone, v_phone)
    where id = v_client_id;
  end if;

  insert into public.requests (
    client_id, tour_id, stage, source, travelers_adults, group_size
  ) values (
    v_client_id,
    v_departure.tour_id,
    'booked',
    left(coalesce(nullif(btrim(p_source), ''), 'website'), 100),
    v_group_size,
    v_group_size
  )
  returning id into v_request_id;

  v_total_price := v_price_per_person * v_group_size;
  v_deposit_due := v_departure.security_deposit_usd * v_group_size;

  insert into public.bookings (
    departure_id,
    request_id,
    client_id,
    user_id,
    number_of_travellers,
    total_price_usd,
    deposit_due_usd,
    room_type,
    status
  ) values (
    p_departure_id,
    v_request_id,
    v_client_id,
    p_user_id,
    v_group_size,
    v_total_price,
    v_deposit_due,
    v_booked_room_type,
    'confirmed'
  )
  returning id into v_booking_id;

  insert into public.booking_travellers (
    booking_id,
    first_name,
    last_name,
    email,
    phone,
    date_of_birth,
    nationality,
    passport_number,
    room_type
  )
  select
    v_booking_id,
    nullif(btrim(coalesce(item ->> 'firstName', item ->> 'first_name', '')), ''),
    nullif(btrim(coalesce(item ->> 'lastName', item ->> 'last_name', '')), ''),
    nullif(lower(btrim(coalesce(item ->> 'email', ''))), ''),
    nullif(btrim(coalesce(item ->> 'phone', '')), ''),
    nullif(coalesce(item ->> 'dateOfBirth', item ->> 'date_of_birth', ''), '')::date,
    nullif(btrim(coalesce(item ->> 'nationality', '')), ''),
    nullif(btrim(coalesce(item ->> 'passportNumber', item ->> 'passport_number', '')), ''),
    v_booked_room_type
  from jsonb_array_elements(p_travellers) as traveller(item);

  update public.departures
  set booked_seats = booked_seats + v_group_size
  where id = p_departure_id;

  if p_booking_link_id is not null then
    update public.booking_links
    set use_count = use_count + 1
    where id = p_booking_link_id;
  end if;

  update public.clients c
  set total_bookings = totals.booking_count,
      total_spent_usd = totals.total_spent
  from (
    select count(*)::integer as booking_count,
           coalesce(sum(total_price_usd), 0)::numeric(14,2) as total_spent
    from public.bookings
    where client_id = v_client_id and status <> 'cancelled'
  ) totals
  where c.id = v_client_id;

  return jsonb_build_object(
    'bookingId', v_booking_id,
    'clientId', v_client_id,
    'requestId', v_request_id,
    'groupSize', v_group_size,
    'totalPriceUsd', v_total_price,
    'depositDueUsd', v_deposit_due,
    'roomType', v_booked_room_type
  );
end;
$$;

create or replace function public.accept_quote_atomic(
  p_quote_id uuid,
  p_version_id uuid,
  p_delivery_id uuid default null,
  p_client_name text default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_is_admin boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quote public.quotes%rowtype;
  v_version public.quote_versions%rowtype;
  v_delivery public.quote_deliveries%rowtype;
  v_departure public.departures%rowtype;
  v_client public.clients%rowtype;
  v_group_size integer;
  v_booking_id uuid;
  v_acceptance_id uuid;
  v_client_name text;
  v_ip inet;
begin
  if p_quote_id is null or p_version_id is null then
    raise exception using errcode = 'P0001', message = 'QUOTE_REQUIRED_FIELDS';
  end if;

  -- Consistent lock order: quote -> version -> delivery -> departure -> client.
  select * into v_quote
  from public.quotes
  where id = p_quote_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'QUOTE_NOT_FOUND';
  end if;
  if v_quote.status = 'accepted' then
    raise exception using errcode = 'P0001', message = 'QUOTE_ALREADY_ACCEPTED';
  end if;
  if v_quote.client_id is null then
    raise exception using errcode = 'P0001', message = 'QUOTE_CLIENT_REQUIRED';
  end if;

  select * into v_version
  from public.quote_versions
  where id = p_version_id and quote_id = p_quote_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'QUOTE_VERSION_NOT_FOUND';
  end if;
  if v_version.status = 'accepted' then
    raise exception using errcode = 'P0001', message = 'QUOTE_ALREADY_ACCEPTED';
  end if;

  if p_is_admin then
    if v_version.status in ('declined', 'expired', 'superseded') then
      raise exception using errcode = 'P0001', message = 'QUOTE_CANNOT_ACCEPT';
    end if;
  else
    if p_delivery_id is null then
      raise exception using errcode = 'P0001', message = 'QUOTE_DELIVERY_REQUIRED';
    end if;

    select * into v_delivery
    from public.quote_deliveries
    where id = p_delivery_id
    for update;

    if not found
       or v_delivery.quote_id <> p_quote_id
       or v_delivery.quote_version_id <> p_version_id then
      raise exception using errcode = 'P0001', message = 'QUOTE_LINK_INVALID';
    end if;
    if v_delivery.revoked_at is not null then
      raise exception using errcode = 'P0001', message = 'QUOTE_LINK_REVOKED';
    end if;
    if v_delivery.expires_at is not null and v_delivery.expires_at < now() then
      raise exception using errcode = 'P0001', message = 'QUOTE_LINK_EXPIRED';
    end if;
    if v_version.valid_until is not null and v_version.valid_until < current_date then
      raise exception using errcode = 'P0001', message = 'QUOTE_EXPIRED';
    end if;
    if v_version.status not in ('ready', 'sent', 'viewed') then
      raise exception using errcode = 'P0001', message = 'QUOTE_CANNOT_ACCEPT';
    end if;
  end if;

  if exists (
    select 1 from public.quote_acceptances where quote_id = p_quote_id
  ) then
    raise exception using errcode = 'P0001', message = 'QUOTE_ALREADY_ACCEPTED';
  end if;
  if exists (
    select 1 from public.bookings where quote_id = p_quote_id
  ) then
    raise exception using errcode = 'P0001', message = 'QUOTE_BOOKING_ALREADY_EXISTS';
  end if;
  if not exists (
    select 1 from public.quote_days where quote_version_id = p_version_id
  ) then
    raise exception using errcode = 'P0001', message = 'QUOTE_ITINERARY_REQUIRED';
  end if;

  select * into v_client
  from public.clients
  where id = v_quote.client_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'QUOTE_CLIENT_NOT_FOUND';
  end if;

  select greatest(1, count(*))::integer into v_group_size
  from public.quote_travellers
  where quote_version_id = p_version_id;

  if v_quote.departure_id is not null then
    select * into v_departure
    from public.departures
    where id = v_quote.departure_id
    for update;

    if not found then
      raise exception using errcode = 'P0001', message = 'QUOTE_DEPARTURE_NOT_FOUND';
    end if;
    if not v_departure.is_active or v_departure.status in ('full', 'closed', 'cancelled') then
      raise exception using errcode = 'P0001', message = 'QUOTE_DEPARTURE_UNAVAILABLE';
    end if;
    if v_departure.booked_seats + v_group_size > v_departure.max_seats then
      raise exception using errcode = 'P0001', message = 'QUOTE_NOT_ENOUGH_SEATS';
    end if;
  end if;

  insert into public.bookings (
    quote_id,
    request_id,
    client_id,
    departure_id,
    number_of_travellers,
    total_price_usd,
    deposit_due_usd,
    status
  ) values (
    p_quote_id,
    v_quote.request_id,
    v_quote.client_id,
    v_quote.departure_id,
    v_group_size,
    v_version.total_selling_usd,
    case when v_quote.departure_id is null
      then 0
      else v_departure.security_deposit_usd * v_group_size
    end,
    'confirmed'
  )
  returning id into v_booking_id;

  if exists (
    select 1 from public.quote_travellers where quote_version_id = p_version_id
  ) then
    insert into public.booking_travellers (
      booking_id,
      first_name,
      last_name,
      email,
      phone,
      room_type,
      dietary_requirements,
      allergies,
      is_rider
    )
    select
      v_booking_id,
      case
        when btrim(coalesce(qt.display_name, '')) = '' and row_number() over w = 1
          then nullif(btrim(v_client.first_name), '')
        else nullif(split_part(btrim(qt.display_name), ' ', 1), '')
      end,
      case
        when btrim(coalesce(qt.display_name, '')) = '' and row_number() over w = 1
          then nullif(btrim(v_client.last_name), '')
        when position(' ' in btrim(coalesce(qt.display_name, ''))) > 0
          then nullif(btrim(substring(btrim(qt.display_name) from position(' ' in btrim(qt.display_name)) + 1)), '')
        else null
      end,
      case when row_number() over w = 1 then v_client.email else null end,
      case when row_number() over w = 1 then v_client.phone else null end,
      qt.room_category,
      qt.dietary_requirements,
      qt.allergies,
      true
    from public.quote_travellers qt
    where qt.quote_version_id = p_version_id
    window w as (order by qt.sort_order, qt.id);
  else
    insert into public.booking_travellers (
      booking_id, first_name, last_name, email, phone, is_rider
    ) values (
      v_booking_id,
      nullif(btrim(v_client.first_name), ''),
      nullif(btrim(v_client.last_name), ''),
      v_client.email,
      v_client.phone,
      true
    );
  end if;

  if v_quote.departure_id is not null then
    update public.departures
    set booked_seats = booked_seats + v_group_size
    where id = v_quote.departure_id;
  end if;

  v_client_name := nullif(btrim(coalesce(p_client_name, '')), '');
  if v_client_name is null then
    v_client_name := nullif(btrim(concat_ws(' ', v_client.first_name, v_client.last_name)), '');
  end if;
  v_client_name := left(coalesce(v_client_name, 'Accepted by operator'), 200);

  begin
    v_ip := nullif(btrim(coalesce(p_ip_address, '')), '')::inet;
  exception when invalid_text_representation then
    v_ip := null;
  end;

  insert into public.quote_acceptances (
    quote_id,
    quote_version_id,
    delivery_id,
    client_name,
    client_email,
    terms_accepted,
    ip_address,
    user_agent,
    provisional_booking_id
  ) values (
    p_quote_id,
    p_version_id,
    case when p_is_admin then null else p_delivery_id end,
    v_client_name,
    v_client.email,
    true,
    v_ip,
    left(p_user_agent, 1000),
    v_booking_id
  )
  returning id into v_acceptance_id;

  update public.quote_versions
  set status = 'accepted', accepted_at = now()
  where id = p_version_id;

  update public.quotes
  set status = 'accepted',
      accepted_version_id = p_version_id,
      provisional_booking_id = v_booking_id
  where id = p_quote_id;

  if v_quote.request_id is not null then
    update public.requests
    set stage = 'booked'
    where id = v_quote.request_id;
  end if;

  update public.clients c
  set total_bookings = totals.booking_count,
      total_spent_usd = totals.total_spent
  from (
    select count(*)::integer as booking_count,
           coalesce(sum(total_price_usd), 0)::numeric(14,2) as total_spent
    from public.bookings
    where client_id = v_quote.client_id and status <> 'cancelled'
  ) totals
  where c.id = v_quote.client_id;

  return jsonb_build_object(
    'acceptanceId', v_acceptance_id,
    'bookingId', v_booking_id,
    'clientId', v_quote.client_id,
    'groupSize', v_group_size,
    'totalPriceUsd', v_version.total_selling_usd
  );
end;
$$;

create or replace function public.create_manual_booking_atomic(
  p_departure_id uuid default null,
  p_request_id uuid default null,
  p_client_id uuid default null,
  p_start_date date default null,
  p_end_date date default null,
  p_traveller_count integer default 1,
  p_total_price_usd numeric default 0,
  p_status text default 'confirmed',
  p_travellers jsonb default '[]'::jsonb,
  p_deposit_usd numeric default 0,
  p_deposit_method text default null,
  p_deposit_reference text default null,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_departure public.departures%rowtype;
  v_request public.requests%rowtype;
  v_lead jsonb;
  v_detail_count integer;
  v_group_size integer;
  v_client_id uuid := p_client_id;
  v_booking_id uuid;
  v_email text;
  v_first_name text;
  v_last_name text;
  v_phone text;
  v_deposit_due numeric(12,2) := 0;
begin
  if p_status not in ('pending', 'confirmed') then
    raise exception using errcode = 'P0001', message = 'MANUAL_BOOKING_INVALID_STATUS';
  end if;
  if p_total_price_usd is null or p_total_price_usd < 0 then
    raise exception using errcode = 'P0001', message = 'MANUAL_BOOKING_INVALID_TOTAL';
  end if;
  if coalesce(p_deposit_usd, 0) < 0 or coalesce(p_deposit_usd, 0) > p_total_price_usd then
    raise exception using errcode = 'P0001', message = 'MANUAL_BOOKING_INVALID_DEPOSIT';
  end if;
  if p_start_date is not null and p_end_date is not null and p_end_date < p_start_date then
    raise exception using errcode = 'P0001', message = 'MANUAL_BOOKING_INVALID_DATES';
  end if;
  if p_travellers is null or jsonb_typeof(p_travellers) <> 'array' then
    raise exception using errcode = 'P0001', message = 'MANUAL_BOOKING_INVALID_TRAVELLERS';
  end if;
  if p_deposit_method is not null
     and p_deposit_method not in ('bank_transfer', 'card', 'cash', 'mpesa', 'cheque', 'other') then
    raise exception using errcode = 'P0001', message = 'MANUAL_BOOKING_INVALID_PAYMENT_METHOD';
  end if;

  v_detail_count := jsonb_array_length(p_travellers);
  v_group_size := greatest(coalesce(p_traveller_count, 1), v_detail_count, 1);
  if v_group_size > 100 or v_detail_count > 100 then
    raise exception using errcode = 'P0001', message = 'MANUAL_BOOKING_INVALID_GROUP_SIZE';
  end if;

  if p_request_id is not null then
    select * into v_request
    from public.requests
    where id = p_request_id
    for update;

    if not found then
      raise exception using errcode = 'P0001', message = 'MANUAL_BOOKING_REQUEST_NOT_FOUND';
    end if;
    v_client_id := coalesce(v_client_id, v_request.client_id);
  end if;

  if v_client_id is not null then
    perform 1 from public.clients where id = v_client_id for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'MANUAL_BOOKING_CLIENT_NOT_FOUND';
    end if;
  end if;

  if p_departure_id is not null then
    select * into v_departure
    from public.departures
    where id = p_departure_id
    for update;

    if not found then
      raise exception using errcode = 'P0001', message = 'MANUAL_BOOKING_DEPARTURE_NOT_FOUND';
    end if;
    if not v_departure.is_active or v_departure.status in ('full', 'closed', 'cancelled') then
      raise exception using errcode = 'P0001', message = 'MANUAL_BOOKING_DEPARTURE_UNAVAILABLE';
    end if;
    if v_departure.booked_seats + v_group_size > v_departure.max_seats then
      raise exception using errcode = 'P0001', message = 'MANUAL_BOOKING_NOT_ENOUGH_SEATS';
    end if;
    v_deposit_due := v_departure.security_deposit_usd * v_group_size;
  end if;

  if v_detail_count > 0 then
    v_lead := p_travellers -> 0;
    v_email := lower(btrim(coalesce(v_lead ->> 'email', '')));
    v_first_name := nullif(btrim(coalesce(v_lead ->> 'firstName', '')), '');
    v_last_name := nullif(btrim(coalesce(v_lead ->> 'lastName', '')), '');
    v_phone := nullif(btrim(coalesce(v_lead ->> 'phone', '')), '');
  end if;

  if v_client_id is null and v_email <> '' then
    if v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
      raise exception using errcode = 'P0001', message = 'MANUAL_BOOKING_EMAIL_INVALID';
    end if;

    select id into v_client_id
    from public.clients
    where lower(email) = v_email
    limit 1
    for update;

    if v_client_id is null then
      begin
        insert into public.clients (email, first_name, last_name, phone, source)
        values (
          v_email,
          coalesce(v_first_name, ''),
          coalesce(v_last_name, ''),
          v_phone,
          'admin'
        )
        returning id into v_client_id;
      exception when unique_violation then
        select id into v_client_id
        from public.clients
        where lower(email) = v_email
        limit 1
        for update;
      end;
    end if;
  end if;

  if p_departure_id is null
     and p_request_id is null
     and v_client_id is null
     and v_detail_count = 0 then
    raise exception using errcode = 'P0001', message = 'MANUAL_BOOKING_IDENTITY_REQUIRED';
  end if;

  insert into public.bookings (
    departure_id,
    request_id,
    client_id,
    start_date,
    end_date,
    number_of_travellers,
    total_price_usd,
    deposit_due_usd,
    status
  ) values (
    p_departure_id,
    p_request_id,
    v_client_id,
    case when p_departure_id is null then p_start_date else null end,
    case when p_departure_id is null then p_end_date else null end,
    v_group_size,
    p_total_price_usd,
    v_deposit_due,
    p_status
  )
  returning id into v_booking_id;

  if v_detail_count > 0 then
    insert into public.booking_travellers (
      booking_id,
      first_name,
      last_name,
      email,
      phone,
      nationality,
      passport_number,
      date_of_birth,
      is_rider,
      emergency_contact
    )
    select
      v_booking_id,
      nullif(btrim(coalesce(item ->> 'firstName', '')), ''),
      nullif(btrim(coalesce(item ->> 'lastName', '')), ''),
      nullif(lower(btrim(coalesce(item ->> 'email', ''))), ''),
      nullif(btrim(coalesce(item ->> 'phone', '')), ''),
      nullif(btrim(coalesce(item ->> 'nationality', '')), ''),
      nullif(btrim(coalesce(item ->> 'passportNumber', '')), ''),
      nullif(coalesce(item ->> 'dateOfBirth', ''), '')::date,
      coalesce((item ->> 'isRider')::boolean, true),
      nullif(btrim(coalesce(item ->> 'emergencyContact', '')), '')
    from jsonb_array_elements(p_travellers) as traveller(item);
  end if;

  if p_departure_id is not null then
    update public.departures
    set booked_seats = booked_seats + v_group_size
    where id = p_departure_id;
  end if;

  if coalesce(p_deposit_usd, 0) > 0 then
    insert into public.trip_payments (
      booking_id,
      amount_usd,
      payment_type,
      method,
      reference,
      notes,
      created_by
    ) values (
      v_booking_id,
      p_deposit_usd,
      'deposit',
      p_deposit_method,
      nullif(btrim(coalesce(p_deposit_reference, '')), ''),
      'Deposit at booking (admin)',
      p_created_by
    );
  end if;

  if p_request_id is not null and p_status = 'confirmed' then
    update public.requests set stage = 'booked' where id = p_request_id;
  end if;

  if v_client_id is not null then
    update public.clients c
    set total_bookings = totals.booking_count,
        total_spent_usd = totals.total_spent
    from (
      select count(*)::integer as booking_count,
             coalesce(sum(total_price_usd), 0)::numeric(14,2) as total_spent
      from public.bookings
      where client_id = v_client_id and status <> 'cancelled'
    ) totals
    where c.id = v_client_id;
  end if;

  return jsonb_build_object(
    'bookingId', v_booking_id,
    'clientId', v_client_id,
    'groupSize', v_group_size,
    'depositDueUsd', v_deposit_due
  );
end;
$$;

-- Functions in the exposed public schema are executable by PUBLIC by default.
-- These are internal application operations and must only be called through the
-- server's service-role client after endpoint/admin authorization.
revoke all on function public.create_departure_booking_atomic(uuid, jsonb, uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_departure_booking_atomic(uuid, jsonb, uuid, text, text, uuid)
  to service_role;

revoke all on function public.accept_quote_atomic(uuid, uuid, uuid, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.accept_quote_atomic(uuid, uuid, uuid, text, text, text, boolean)
  to service_role;

revoke all on function public.create_manual_booking_atomic(
  uuid, uuid, uuid, date, date, integer, numeric, text, jsonb, numeric, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.create_manual_booking_atomic(
  uuid, uuid, uuid, date, date, integer, numeric, text, jsonb, numeric, text, text, uuid
) to service_role;
