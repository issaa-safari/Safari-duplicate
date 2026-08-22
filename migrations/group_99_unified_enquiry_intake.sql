-- Group 99: unified, idempotent enquiry intake.
--
-- All public channels now create the same canonical client + request records.
-- Quote-intent channels additionally receive a valid quote/version workspace.
-- The intake event is retained for replay diagnostics and prevents duplicate
-- webhook/form deliveries from creating duplicate requests.

create table if not exists public.intake_events (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  external_event_id text not null,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed')),
  attempts integer not null default 1 check (attempts > 0),
  payload jsonb not null default '{}'::jsonb,
  client_id uuid references public.clients(id) on delete set null,
  request_id uuid references public.requests(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  error_message text,
  received_at timestamptz not null default now(),
  processing_started_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (channel, external_event_id)
);

create index if not exists intake_events_status_received_idx
  on public.intake_events (status, received_at desc);
create index if not exists intake_events_request_id_idx
  on public.intake_events (request_id)
  where request_id is not null;

alter table public.intake_events enable row level security;

drop policy if exists "Admins manage intake events" on public.intake_events;
create policy "Admins manage intake events"
  on public.intake_events
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create or replace function public.ingest_enquiry_atomic(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_channel text := lower(btrim(coalesce(p_payload ->> 'channel', '')));
  v_external_id text := btrim(coalesce(p_payload ->> 'externalEventId', ''));
  v_source text := lower(btrim(coalesce(p_payload ->> 'source', 'website')));
  v_email text := lower(btrim(coalesce(p_payload ->> 'email', '')));
  v_phone text := nullif(btrim(coalesce(p_payload ->> 'phone', '')), '');
  v_whatsapp text := nullif(btrim(coalesce(p_payload ->> 'whatsapp', '')), '');
  v_first_name text := btrim(coalesce(p_payload ->> 'firstName', ''));
  v_last_name text := btrim(coalesce(p_payload ->> 'lastName', ''));
  v_country text := nullif(btrim(coalesce(p_payload ->> 'country', '')), '');
  v_language text := case when p_payload ->> 'language' = 'ar' then 'ar' else 'en' end;
  v_question text := nullif(btrim(coalesce(p_payload ->> 'question', '')), '');
  v_subject text := nullif(btrim(coalesce(p_payload ->> 'subject', '')), '');
  v_heard text := nullif(btrim(coalesce(p_payload ->> 'heardAboutUs', '')), '');
  v_quote_intent boolean := coalesce((p_payload ->> 'quoteIntent')::boolean, false);
  v_adults integer := greatest(1, least(50, coalesce((p_payload ->> 'adults')::integer, 1)));
  v_trip_length integer := nullif(p_payload ->> 'tripLengthNights', '')::integer;
  v_start_date date := nullif(p_payload ->> 'preferredStartDate', '')::date;
  v_tour_id uuid := nullif(p_payload ->> 'tourId', '')::uuid;
  v_event public.intake_events%rowtype;
  v_client public.clients%rowtype;
  v_request_id uuid;
  v_quote_id uuid;
  v_version_id uuid;
  v_band public.traveller_age_bands%rowtype;
  v_i integer;
begin
  if v_channel not in ('website_quote', 'tour_enquiry', 'contact', 'whatsapp', 'whatsapp_flow') then
    raise exception using errcode = 'P0001', message = 'INTAKE_INVALID_CHANNEL';
  end if;
  if v_external_id = '' then
    raise exception using errcode = 'P0001', message = 'INTAKE_EVENT_ID_REQUIRED';
  end if;
  if v_email = '' and v_phone is null and v_whatsapp is null then
    raise exception using errcode = 'P0001', message = 'INTAKE_CONTACT_REQUIRED';
  end if;
  if v_email <> '' and v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception using errcode = 'P0001', message = 'INTAKE_INVALID_EMAIL';
  end if;
  if v_trip_length is not null and (v_trip_length < 1 or v_trip_length > 90) then
    raise exception using errcode = 'P0001', message = 'INTAKE_INVALID_DURATION';
  end if;

  insert into public.intake_events (
    channel, external_event_id, status, payload, processing_started_at
  ) values (
    v_channel, v_external_id, 'processing', p_payload, now()
  )
  on conflict (channel, external_event_id) do update
    set status = 'processing',
        attempts = public.intake_events.attempts + 1,
        payload = excluded.payload,
        error_message = null,
        processing_started_at = now(),
        updated_at = now()
    where public.intake_events.status = 'failed'
       or (
         public.intake_events.status = 'processing'
         and public.intake_events.processing_started_at < now() - interval '5 minutes'
       )
  returning * into v_event;

  if not found then
    select * into v_event
    from public.intake_events
    where channel = v_channel and external_event_id = v_external_id;

    return jsonb_build_object(
      'status', v_event.status,
      'duplicate', true,
      'eventId', v_event.id,
      'clientId', v_event.client_id,
      'requestId', v_event.request_id,
      'quoteId', v_event.quote_id
    );
  end if;

  begin
    if v_email <> '' then
      select * into v_client
      from public.clients
      where lower(email) = v_email
      order by created_at
      limit 1
      for update;
    end if;

    if v_client.id is null and v_whatsapp is not null then
      select * into v_client
      from public.clients
      where whatsapp = v_whatsapp
      order by created_at
      limit 1
      for update;
    end if;

    if v_client.id is null and v_phone is not null then
      select * into v_client
      from public.clients
      where phone = v_phone
      order by created_at
      limit 1
      for update;
    end if;

    if v_client.id is not null then
      update public.clients
      set first_name = coalesce(nullif(v_first_name, ''), first_name),
          last_name = coalesce(nullif(v_last_name, ''), last_name),
          email = coalesce(nullif(v_email, ''), email),
          phone = coalesce(v_phone, phone),
          whatsapp = coalesce(v_whatsapp, whatsapp),
          country = coalesce(v_country, country),
          language = v_language,
          preferred_language = v_language,
          updated_at = now()
      where id = v_client.id
      returning * into v_client;
    else
      insert into public.clients (
        first_name, last_name, email, phone, whatsapp, country,
        language, preferred_language, source
      ) values (
        coalesce(nullif(v_first_name, ''), 'Enquiry'),
        v_last_name,
        nullif(v_email, ''),
        v_phone,
        v_whatsapp,
        v_country,
        v_language,
        v_language,
        v_source
      ) returning * into v_client;
    end if;

    insert into public.requests (
      client_id, tour_id, stage, source, client_question,
      travelers_adults, group_size, preferred_start_date, trip_length_nights,
      heard_about_us
    ) values (
      v_client.id,
      v_tour_id,
      case when v_quote_intent then 'working_on' else 'new' end,
      v_source,
      concat_ws(E'\n\n', v_subject, v_question),
      v_adults,
      v_adults,
      v_start_date,
      v_trip_length,
      v_heard
    ) returning id into v_request_id;

    if v_quote_intent then
      v_quote_id := public.create_quote_with_version(
        v_client.id,
        v_request_id,
        'custom',
        v_tour_id,
        null,
        nullif(btrim(coalesce(p_payload ->> 'quoteTitle', '')), ''),
        null
      );

      select id into v_version_id
      from public.quote_versions
      where quote_id = v_quote_id
      order by version_number
      limit 1;

      update public.quote_versions
      set language = v_language
      where id = v_version_id;

      select * into v_band
      from public.traveller_age_bands
      where code = 'adult' and is_active = true
      order by sort_order, id
      limit 1;

      if found then
        for v_i in 1..v_adults loop
          insert into public.quote_travellers (
            quote_version_id, display_name, age_band_id, age_band_snapshot,
            traveller_category, room_category, is_paying, is_complimentary, sort_order
          ) values (
            v_version_id,
            'Adult ' || v_i,
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
            'adult',
            'sharing',
            v_band.default_pricing_method <> 'free',
            false,
            v_i - 1
          );
        end loop;
      end if;
    end if;

    update public.intake_events
    set status = 'processed',
        client_id = v_client.id,
        request_id = v_request_id,
        quote_id = v_quote_id,
        processed_at = now(),
        updated_at = now()
    where id = v_event.id;

    return jsonb_build_object(
      'status', 'processed',
      'duplicate', false,
      'eventId', v_event.id,
      'clientId', v_client.id,
      'requestId', v_request_id,
      'quoteId', v_quote_id,
      'quoteVersionId', v_version_id
    );
  exception when others then
    update public.intake_events
    set status = 'failed',
        error_message = left(sqlstate || ': ' || sqlerrm, 1000),
        updated_at = now()
    where id = v_event.id;

    return jsonb_build_object(
      'status', 'failed',
      'duplicate', false,
      'eventId', v_event.id,
      'error', 'INTAKE_PROCESSING_FAILED'
    );
  end;
end;
$$;

revoke all on function public.ingest_enquiry_atomic(jsonb)
  from public, anon, authenticated;
grant execute on function public.ingest_enquiry_atomic(jsonb)
  to service_role;
