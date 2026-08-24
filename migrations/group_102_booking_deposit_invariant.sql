-- Group 102: keep the booking deposit field true to its original contract.
--
-- bookings.deposit_due_usd is the refundable security deposit expected for
-- the riders on a departure. The commercial payment deposit is calculated by
-- Finance from the accepted proposal policy and must never be stored here.

create or replace function public.enforce_booking_security_deposit_due()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_security_deposit_per_seat numeric(12,2);
begin
  if new.departure_id is null then
    return new;
  end if;

  select coalesce(security_deposit_usd, 0)
  into v_security_deposit_per_seat
  from public.departures
  where id = new.departure_id;

  if found then
    new.deposit_due_usd := round(
      v_security_deposit_per_seat * greatest(coalesce(new.number_of_travellers, 0), 0),
      2
    );
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_booking_security_deposit_due()
  from public, anon, authenticated;

drop trigger if exists bookings_security_deposit_due_invariant on public.bookings;
create trigger bookings_security_deposit_due_invariant
before insert or update of departure_id, number_of_travellers, deposit_due_usd
on public.bookings
for each row execute function public.enforce_booking_security_deposit_due();

-- Repair any rows written before the invariant existed. The WHERE clause
-- makes this a no-op when all snapshots are already correct.
update public.bookings b
set deposit_due_usd = round(d.security_deposit_usd * b.number_of_travellers, 2)
from public.departures d
where d.id = b.departure_id
  and b.deposit_due_usd is distinct from round(d.security_deposit_usd * b.number_of_travellers, 2);

-- Reinstall the legacy commercial-value repair with the same invariant. The
-- original group_101 function was already permission-locked; this replaces
-- only its implementation and preserves those grants below.
create or replace function public.correct_legacy_trip_value_atomic(
  p_booking_id uuid,
  p_total_price_usd numeric
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_booking_ref record;
  v_booking public.bookings%rowtype;
  v_quote public.quotes%rowtype;
  v_version public.quote_versions%rowtype;
  v_departure public.departures%rowtype;
  v_group_size integer;
  v_per_person numeric(14,2);
  v_security_deposit_due numeric(12,2);
begin
  if p_booking_id is null or p_total_price_usd is null or p_total_price_usd <= 0 then
    raise exception using errcode = 'P0001', message = 'TRIP_VALUE_POSITIVE_REQUIRED';
  end if;

  select quote_id, departure_id into v_booking_ref
  from public.bookings
  where id = p_booking_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'TRIP_VALUE_BOOKING_NOT_FOUND';
  end if;
  if v_booking_ref.quote_id is null or v_booking_ref.departure_id is null then
    raise exception using errcode = 'P0001', message = 'TRIP_VALUE_LEGACY_CUSTOM_REQUIRED';
  end if;

  select * into v_quote
  from public.quotes
  where id = v_booking_ref.quote_id
  for update;

  if not found or v_quote.status <> 'accepted' or v_quote.accepted_version_id is null then
    raise exception using errcode = 'P0001', message = 'TRIP_VALUE_ACCEPTED_QUOTE_REQUIRED';
  end if;

  select * into v_version
  from public.quote_versions
  where id = v_quote.accepted_version_id and quote_id = v_quote.id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'TRIP_VALUE_VERSION_NOT_FOUND';
  end if;

  select * into v_departure
  from public.departures
  where id = v_booking_ref.departure_id
  for update;

  if not found
     or v_departure.kind <> 'private_custom'
     or v_departure.source_quote_id <> v_quote.id then
    raise exception using errcode = 'P0001', message = 'TRIP_VALUE_LEGACY_CUSTOM_REQUIRED';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
    and quote_id = v_quote.id
    and departure_id = v_departure.id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'TRIP_VALUE_BOOKING_CHANGED';
  end if;

  if coalesce(v_booking.total_price_usd, 0) > 0
     and coalesce(v_version.total_selling_usd, 0) > 0 then
    raise exception using errcode = 'P0001', message = 'TRIP_VALUE_CORRECTION_NOT_REQUIRED';
  end if;

  v_group_size := greatest(1, coalesce(v_booking.number_of_travellers, 1));
  v_per_person := round(p_total_price_usd / v_group_size, 2);
  v_security_deposit_due := round(
    coalesce(v_departure.security_deposit_usd, 0) * v_group_size,
    2
  );

  update public.quote_versions
  set total_selling_usd = round(p_total_price_usd, 2),
      sharing_price_per_person_usd = case
        when coalesce(sharing_price_per_person_usd, 0) <= 0 then v_per_person
        else sharing_price_per_person_usd
      end,
      gross_margin_usd = round(p_total_price_usd - coalesce(total_cost_usd, 0), 2),
      gross_margin_percent = round(
        ((p_total_price_usd - coalesce(total_cost_usd, 0)) / p_total_price_usd) * 100,
        2
      )
  where id = v_version.id;

  update public.bookings
  set total_price_usd = round(p_total_price_usd, 2),
      deposit_due_usd = v_security_deposit_due
  where id = v_booking.id;

  update public.departures
  set price_usd = v_per_person
  where id = v_departure.id;

  update public.tasks
  set is_done = true
  where booking_id = v_booking.id
    and auto_generated = true
    and title = 'Urgent: confirm proposal price and payment schedule'
    and is_done = false;

  return jsonb_build_object(
    'bookingId', v_booking.id,
    'quoteId', v_quote.id,
    'versionId', v_version.id,
    'departureId', v_departure.id,
    'totalPriceUsd', round(p_total_price_usd, 2),
    'perPersonUsd', v_per_person,
    'securityDepositDueUsd', v_security_deposit_due
  );
end;
$$;

revoke all on function public.correct_legacy_trip_value_atomic(uuid, numeric)
  from public, anon, authenticated;
grant execute on function public.correct_legacy_trip_value_atomic(uuid, numeric)
  to service_role;
