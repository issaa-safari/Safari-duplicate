-- Group 98: make the complete proposal pricing save atomic and enforce ready
-- state invariants at the database boundary.
--
-- save_trip() already writes itinerary-derived pricing transactionally, but
-- the application then wrote per-band prices, inclusions/exclusions and ready
-- status separately. A failure in those follow-up writes left a partly-saved
-- proposal. This wrapper keeps the whole commercial save in one transaction.

create or replace function public.save_proposal_pricing_atomic(
  p_payload jsonb,
  p_band_prices jsonb default '{}'::jsonb,
  p_inclusions text[] default null,
  p_exclusions text[] default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_quote_id uuid;
  v_version_id uuid;
  v_version public.quote_versions%rowtype;
  v_best_status text;
begin
  v_result := public.save_trip(p_payload);
  v_quote_id := nullif(v_result ->> 'quoteId', '')::uuid;
  v_version_id := nullif(v_result ->> 'versionId', '')::uuid;

  if v_quote_id is null or v_version_id is null then
    raise exception using errcode = 'P0001', message = 'PRICING_SAVE_RESULT_INVALID';
  end if;

  select * into v_version
  from public.quote_versions
  where id = v_version_id and quote_id = v_quote_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'PRICING_VERSION_NOT_FOUND';
  end if;
  if v_version.status not in ('draft', 'ready') then
    raise exception using errcode = 'P0001', message = 'PRICING_VERSION_LOCKED';
  end if;
  if v_version.travel_start_date is null or v_version.travel_end_date is null then
    raise exception using errcode = 'P0001', message = 'PRICING_DATES_REQUIRED';
  end if;
  if v_version.total_selling_usd <= 0 then
    raise exception using errcode = 'P0001', message = 'PRICING_POSITIVE_SALE_REQUIRED';
  end if;
  if not exists (select 1 from public.quote_days where quote_version_id = v_version_id) then
    raise exception using errcode = 'P0001', message = 'PRICING_ITINERARY_REQUIRED';
  end if;
  if not exists (
    select 1 from public.quote_travellers
    where quote_version_id = v_version_id and is_paying = true
  ) then
    raise exception using errcode = 'P0001', message = 'PRICING_PAYING_TRAVELLER_REQUIRED';
  end if;

  update public.quote_travellers
  set pricing_fixed_amount_usd = case
    when p_band_prices ? traveller_category
      then nullif(p_band_prices ->> traveller_category, '')::numeric
    else null
  end
  where quote_version_id = v_version_id;

  update public.quote_versions
  set inclusions = case when cardinality(p_inclusions) > 0 then p_inclusions else null end,
      exclusions = case when cardinality(p_exclusions) > 0 then p_exclusions else null end,
      status = 'ready'
  where id = v_version_id;

  select qv.status into v_best_status
  from public.quote_versions qv
  where qv.quote_id = v_quote_id
  order by
    case qv.status
      when 'accepted' then 6
      when 'declined' then 5
      when 'viewed' then 4
      when 'expired' then 4
      when 'sent' then 3
      when 'ready' then 2
      when 'draft' then 1
      else 0
    end desc,
    qv.version_number desc
  limit 1;

  update public.quotes set status = coalesce(v_best_status, 'ready') where id = v_quote_id;

  return v_result || jsonb_build_object('ready', true);
end;
$$;

revoke all on function public.save_proposal_pricing_atomic(jsonb, jsonb, text[], text[])
  from public, anon, authenticated;
grant execute on function public.save_proposal_pricing_atomic(jsonb, jsonb, text[], text[])
  to service_role;
