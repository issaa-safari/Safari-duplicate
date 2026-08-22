-- Group 96: make every accepted quote an operational trip.
--
-- Scheduled departures continue to use the existing departures table. A
-- tailor-made quote now creates a private operational departure in the same
-- transaction as its acceptance and booking, which immediately makes it
-- available to manifests, logistics, tasks, agreements and vouchers.
--
-- This migration also closes two commercial integrity gaps:
--   * a custom quote cannot be accepted without dates and a positive price;
--   * a fixed-departure quote with no explicit price snapshot derives its total
--     from the locked departure prices instead of creating a zero-value booking.

alter table public.departures
  add column if not exists kind text not null default 'scheduled_group',
  add column if not exists operation_title text,
  add column if not exists is_public boolean not null default true,
  add column if not exists source_quote_id uuid,
  add column if not exists source_quote_version_id uuid;

alter table public.tasks
  add column if not exists departure_id uuid,
  add column if not exists booking_id uuid;

-- Private custom trips may be based on a library itinerary, but they do not
-- require one. Scheduled operations keep their tour identity and cannot be
-- deleted accidentally through a public-tour deletion.
alter table public.departures drop constraint if exists departures_tour_id_fkey;
alter table public.departures alter column tour_id drop not null;
alter table public.departures
  add constraint departures_tour_id_fkey
  foreign key (tour_id) references public.tours(id) on delete restrict;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'departures_kind_check'
      and conrelid = 'public.departures'::regclass
  ) then
    alter table public.departures
      add constraint departures_kind_check
      check (kind in ('scheduled_group', 'private_custom'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'departures_operational_identity_check'
      and conrelid = 'public.departures'::regclass
  ) then
    alter table public.departures
      add constraint departures_operational_identity_check
      check (
        (kind = 'scheduled_group' and tour_id is not null)
        or
        (
          kind = 'private_custom'
          and source_quote_id is not null
          and source_quote_version_id is not null
          and nullif(btrim(operation_title), '') is not null
          and is_public = false
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'departures_source_quote_id_fkey'
      and conrelid = 'public.departures'::regclass
  ) then
    alter table public.departures
      add constraint departures_source_quote_id_fkey
      foreign key (source_quote_id) references public.quotes(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'departures_source_quote_version_id_fkey'
      and conrelid = 'public.departures'::regclass
  ) then
    alter table public.departures
      add constraint departures_source_quote_version_id_fkey
      foreign key (source_quote_version_id) references public.quote_versions(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_departure_id_fkey'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_departure_id_fkey
      foreign key (departure_id) references public.departures(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_booking_id_fkey'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_booking_id_fkey
      foreign key (booking_id) references public.bookings(id) on delete cascade;
  end if;
end $$;

create unique index if not exists departures_source_quote_id_uidx
  on public.departures (source_quote_id)
  where source_quote_id is not null;

create unique index if not exists departures_source_quote_version_id_uidx
  on public.departures (source_quote_version_id)
  where source_quote_version_id is not null;

create index if not exists departures_kind_start_date_idx
  on public.departures (kind, start_date);

create index if not exists departures_public_start_date_idx
  on public.departures (start_date)
  where is_public = true and is_active = true;

create index if not exists tasks_departure_id_idx
  on public.tasks (departure_id)
  where departure_id is not null;

create index if not exists tasks_booking_id_idx
  on public.tasks (booking_id)
  where booking_id is not null;

-- Bring historical accepted custom proposals into Operations without inventing
-- commercial data. Zero-value legacy bookings remain unchanged and receive an
-- explicit review task; all future acceptance is blocked until pricing is valid.
do $$
declare
  v_record record;
  v_departure_id uuid;
  v_group_size integer;
begin
  for v_record in
    select
      q.id as quote_id,
      q.quote_number,
      q.request_id,
      q.tour_id,
      q.accepted_version_id as version_id,
      qv.title,
      qv.travel_start_date,
      qv.travel_end_date,
      b.id as booking_id,
      b.number_of_travellers,
      b.total_price_usd
    from public.quotes q
    join public.quote_versions qv on qv.id = q.accepted_version_id
    join public.bookings b on b.quote_id = q.id
    where q.status = 'accepted'
      and q.mode = 'custom'
      and q.departure_id is null
      and b.departure_id is null
      and qv.travel_start_date is not null
      and qv.travel_end_date is not null
      and not exists (
        select 1 from public.departures d where d.source_quote_id = q.id
      )
    order by q.created_at, q.id
  loop
    v_group_size := greatest(1, coalesce(v_record.number_of_travellers, 1));

    insert into public.departures (
      tour_id, start_date, end_date, max_seats, booked_seats, price_usd,
      status, internal_notes, is_active, security_deposit_usd, kind,
      operation_title, is_public, source_quote_id, source_quote_version_id
    ) values (
      v_record.tour_id,
      v_record.travel_start_date,
      v_record.travel_end_date,
      v_group_size,
      v_group_size,
      round(coalesce(v_record.total_price_usd, 0) / v_group_size, 2),
      'full',
      'Backfilled from accepted custom proposal ' || v_record.quote_number,
      true,
      0,
      'private_custom',
      left(coalesce(nullif(btrim(v_record.title), ''), v_record.quote_number, 'Private safari'), 200),
      false,
      v_record.quote_id,
      v_record.version_id
    ) returning id into v_departure_id;

    update public.bookings
    set departure_id = v_departure_id,
        start_date = coalesce(start_date, v_record.travel_start_date),
        end_date = coalesce(end_date, v_record.travel_end_date)
    where id = v_record.booking_id;

    update public.quotes set departure_id = v_departure_id where id = v_record.quote_id;

    update public.tasks
    set departure_id = v_departure_id,
        booking_id = v_record.booking_id
    where request_id = v_record.request_id
      and v_record.request_id is not null
      and departure_id is null;

    if coalesce(v_record.total_price_usd, 0) <= 0 then
      insert into public.tasks (
        request_id, departure_id, booking_id, title, type, auto_generated, sort_order
      ) values (
        v_record.request_id,
        v_departure_id,
        v_record.booking_id,
        'Urgent: confirm proposal price and payment schedule',
        'payment',
        true,
        -100
      );
    end if;
  end loop;
end $$;

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
  v_departure_id uuid;
  v_client_name text;
  v_operation_title text;
  v_ip inet;
  v_total_price numeric(14,2);
  v_deposit_due numeric(12,2);
  v_deposit_percent numeric(7,2);
  v_created_operational_trip boolean := false;
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

  if exists (select 1 from public.quote_acceptances where quote_id = p_quote_id) then
    raise exception using errcode = 'P0001', message = 'QUOTE_ALREADY_ACCEPTED';
  end if;
  if exists (select 1 from public.bookings where quote_id = p_quote_id) then
    raise exception using errcode = 'P0001', message = 'QUOTE_BOOKING_ALREADY_EXISTS';
  end if;
  if not exists (select 1 from public.quote_days where quote_version_id = p_version_id) then
    raise exception using errcode = 'P0001', message = 'QUOTE_ITINERARY_REQUIRED';
  end if;

  select greatest(1, count(*))::integer into v_group_size
  from public.quote_travellers
  where quote_version_id = p_version_id;

  v_departure_id := v_quote.departure_id;
  v_total_price := coalesce(v_version.total_selling_usd, 0);

  if v_departure_id is not null then
    select * into v_departure
    from public.departures
    where id = v_departure_id
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

    -- Fixed-departure quotes historically had no quote price lines. Honour an
    -- explicit version total when present; otherwise derive a trustworthy total
    -- from the locked departure and each traveller's room category.
    if v_total_price <= 0 then
      select coalesce(sum(
        case
          when qt.room_category = 'single'
            then coalesce(v_departure.price_single_usd, v_departure.price_usd)
          else coalesce(v_departure.price_usd, v_departure.price_single_usd)
        end
      ), 0)::numeric(14,2)
      into v_total_price
      from public.quote_travellers qt
      where qt.quote_version_id = p_version_id;

      if v_total_price <= 0 then
        v_total_price := (
          coalesce(v_departure.price_usd, v_departure.price_single_usd, 0) * v_group_size
        )::numeric(14,2);
      end if;
    end if;

    v_deposit_due := (v_departure.security_deposit_usd * v_group_size)::numeric(12,2);
  else
    if v_version.travel_start_date is null or v_version.travel_end_date is null then
      raise exception using errcode = 'P0001', message = 'QUOTE_DATES_REQUIRED';
    end if;
    if v_version.travel_end_date < v_version.travel_start_date then
      raise exception using errcode = 'P0001', message = 'QUOTE_DATES_INVALID';
    end if;
    if v_total_price <= 0 then
      raise exception using errcode = 'P0001', message = 'QUOTE_POSITIVE_PRICE_REQUIRED';
    end if;

    v_operation_title := left(
      coalesce(nullif(btrim(v_version.title), ''), v_quote.quote_number, 'Private safari'),
      200
    );

    insert into public.departures (
      tour_id,
      start_date,
      end_date,
      max_seats,
      booked_seats,
      price_usd,
      status,
      internal_notes,
      is_active,
      security_deposit_usd,
      kind,
      operation_title,
      is_public,
      source_quote_id,
      source_quote_version_id
    ) values (
      v_quote.tour_id,
      v_version.travel_start_date,
      v_version.travel_end_date,
      v_group_size,
      v_group_size,
      round(v_total_price / v_group_size, 2),
      'full',
      'Created automatically from accepted custom proposal ' || v_quote.quote_number,
      true,
      0,
      'private_custom',
      v_operation_title,
      false,
      p_quote_id,
      p_version_id
    )
    returning * into v_departure;

    v_departure_id := v_departure.id;
    v_created_operational_trip := true;

    select coalesce(deposit_percent, 0) into v_deposit_percent
    from public.company_settings
    order by created_at
    limit 1;
    v_deposit_percent := coalesce(
      nullif(v_version.policy_snapshot ->> 'deposit_percent', '')::numeric,
      v_deposit_percent,
      0
    );
    v_deposit_due := round(v_total_price * v_deposit_percent / 100, 2)::numeric(12,2);
  end if;

  if v_total_price <= 0 then
    raise exception using errcode = 'P0001', message = 'QUOTE_POSITIVE_PRICE_REQUIRED';
  end if;

  select * into v_client
  from public.clients
  where id = v_quote.client_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'QUOTE_CLIENT_NOT_FOUND';
  end if;

  insert into public.bookings (
    quote_id,
    request_id,
    client_id,
    departure_id,
    start_date,
    end_date,
    number_of_travellers,
    total_price_usd,
    deposit_due_usd,
    status
  ) values (
    p_quote_id,
    v_quote.request_id,
    v_quote.client_id,
    v_departure_id,
    v_departure.start_date,
    v_departure.end_date,
    v_group_size,
    v_total_price,
    v_deposit_due,
    'confirmed'
  )
  returning id into v_booking_id;

  if exists (select 1 from public.quote_travellers where quote_version_id = p_version_id) then
    insert into public.booking_travellers (
      booking_id, first_name, last_name, email, phone, room_type,
      dietary_requirements, allergies, is_rider
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

  if not v_created_operational_trip then
    update public.departures
    set booked_seats = booked_seats + v_group_size
    where id = v_departure_id;
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
    quote_id, quote_version_id, delivery_id, client_name, client_email,
    terms_accepted, ip_address, user_agent, provisional_booking_id
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
      provisional_booking_id = v_booking_id,
      departure_id = v_departure_id
  where id = p_quote_id;

  if v_quote.request_id is not null then
    update public.requests set stage = 'booked' where id = v_quote.request_id;

    -- The existing request-stage trigger creates the configured default tasks.
    -- Attach them to the operational trip and booking so Operations no longer
    -- depends on re-discovering them through the request relationship.
    update public.tasks
    set departure_id = v_departure_id,
        booking_id = v_booking_id
    where request_id = v_quote.request_id
      and auto_generated = true
      and departure_id is null;
  else
    insert into public.tasks (
      departure_id, booking_id, title, type, auto_generated, sort_order
    )
    select v_departure_id, v_booking_id, dt.description, dt.type, true, dt.sort_order
    from public.default_tasks dt
    where dt.is_active = true and dt.stage = 'booked'
      and not exists (
        select 1 from public.tasks t
        where t.booking_id = v_booking_id and t.auto_generated = true
      );
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
    'departureId', v_departure_id,
    'createdOperationalTrip', v_created_operational_trip,
    'groupSize', v_group_size,
    'totalPriceUsd', v_total_price,
    'depositDueUsd', v_deposit_due
  );
end;
$$;

revoke all on function public.accept_quote_atomic(uuid, uuid, uuid, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.accept_quote_atomic(uuid, uuid, uuid, text, text, text, boolean)
  to service_role;

-- The data API must never surface a private operation through an existing
-- public-departure policy. Public queries also filter is_public in application
-- code, while this policy is the database backstop.
drop policy if exists "Public read active departures" on public.departures;
create policy "Public read active departures"
  on public.departures for select
  using (is_active = true and is_public = true);

-- group_30 uses a deliberate column allow-list. Public queries filter by this
-- flag, so grant only the non-sensitive visibility column added above.
grant select (is_public) on public.departures to anon, authenticated;
