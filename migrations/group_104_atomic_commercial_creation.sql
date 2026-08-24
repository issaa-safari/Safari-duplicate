-- Group 104: keep commercial workflow metadata inside the creation transaction.
--
-- The underlying creation functions remain the single source of truth. These
-- service-role-only wrappers add owner and next-action metadata before the
-- transaction commits, so a metadata failure cannot leave a successful record
-- that the operator accidentally recreates on retry.

create or replace function public.create_sales_request_with_workflow_atomic(
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
  p_created_by uuid default null,
  p_owner_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_request_id uuid;
  v_quote_id uuid;
  v_due_hours integer := 24;
begin
  if p_owner_id is not null and not exists (
    select 1 from public.admin_users where id = p_owner_id and is_active = true
  ) then
    raise exception using errcode = 'P0001', message = 'SALES_INVALID_OWNER';
  end if;

  v_result := public.create_sales_request_atomic(
    p_existing_client_id, p_email, p_first_name, p_last_name, p_phone,
    p_whatsapp, p_country, p_language, p_source, p_client_question,
    p_preferred_start_date, p_trip_length_nights, p_preferred_room_type,
    p_adults, p_children_older, p_children_younger, p_priority,
    p_create_quote, p_quote_mode, p_tour_id, p_departure_id,
    p_quote_title, p_created_by
  );

  v_request_id := nullif(v_result->>'requestId', '')::uuid;
  v_quote_id := nullif(v_result->>'quoteId', '')::uuid;

  select coalesce(request_proposal_due_hours, 24)
  into v_due_hours
  from public.company_settings
  limit 1;

  update public.requests
  set handled_by = p_owner_id,
      next_action = case when p_create_quote
        then 'Build and price proposal'
        else 'Qualify request and create proposal'
      end,
      next_action_due_at = now() + make_interval(hours => v_due_hours)
  where id = v_request_id;

  if v_quote_id is not null then
    update public.quotes
    set owner_id = p_owner_id,
        next_action = 'Build itinerary and price proposal',
        next_action_due_at = now() + make_interval(hours => v_due_hours)
    where id = v_quote_id;
  end if;

  return v_result;
end;
$$;

revoke all on function public.create_sales_request_with_workflow_atomic(
  uuid, text, text, text, text, text, text, text, text, text, date,
  integer, text, integer, integer, integer, boolean, boolean, text, uuid,
  uuid, text, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.create_sales_request_with_workflow_atomic(
  uuid, text, text, text, text, text, text, text, text, text, date,
  integer, text, integer, integer, integer, boolean, boolean, text, uuid,
  uuid, text, uuid, uuid
) to service_role;

create or replace function public.create_quote_with_workflow_atomic(
  p_client_id uuid,
  p_request_id uuid,
  p_mode text,
  p_tour_id uuid,
  p_departure_id uuid,
  p_title text,
  p_created_by uuid,
  p_owner_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quote_id uuid;
  v_due_hours integer := 24;
begin
  if p_owner_id is not null and not exists (
    select 1 from public.admin_users where id = p_owner_id and is_active = true
  ) then
    raise exception using errcode = 'P0001', message = 'SALES_INVALID_OWNER';
  end if;

  v_quote_id := public.create_quote_with_version(
    p_client_id, p_request_id, p_mode, p_tour_id, p_departure_id,
    p_title, p_created_by
  );

  select coalesce(request_proposal_due_hours, 24)
  into v_due_hours
  from public.company_settings
  limit 1;

  update public.quotes
  set owner_id = p_owner_id,
      next_action = 'Build itinerary and price proposal',
      next_action_due_at = now() + make_interval(hours => v_due_hours)
  where id = v_quote_id;

  return v_quote_id;
end;
$$;

revoke all on function public.create_quote_with_workflow_atomic(
  uuid, uuid, text, uuid, uuid, text, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.create_quote_with_workflow_atomic(
  uuid, uuid, text, uuid, uuid, text, uuid, uuid
) to service_role;
