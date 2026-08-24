-- Group 103: commercial workflow ownership, next actions and idempotent tasks.
--
-- Sales records now carry the operational fields needed to answer four daily
-- questions without opening several modules: who owns this, what happens next,
-- when is it due, and what was the last client outcome?

alter table public.requests
  add column if not exists next_action text,
  add column if not exists next_action_due_at timestamptz,
  add column if not exists last_contact_at timestamptz,
  add column if not exists follow_up_outcome text;

-- Historical checkbox values were stored in a text column. Normalise them
-- before the UI starts treating priority as an explicit commercial level.
update public.requests
set priority = case lower(btrim(priority))
  when 'true' then 'high'
  when 'false' then null
  when 'normal' then 'normal'
  when 'high' then 'high'
  when 'urgent' then 'urgent'
  else null
end
where priority is not null;

alter table public.requests drop constraint if exists requests_priority_check;
alter table public.requests
  add constraint requests_priority_check
  check (priority is null or priority in ('normal', 'high', 'urgent'));

-- Older intake RPCs accept a boolean priority parameter. Normalise their text
-- assignment before the new constraint is evaluated, keeping the RPC contract
-- backwards compatible while the interface moves to explicit levels.
create or replace function public.normalise_request_priority()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.priority := case lower(btrim(coalesce(new.priority, '')))
    when '' then null
    when 'false' then null
    when 'f' then null
    when 'true' then 'high'
    when 't' then 'high'
    when 'normal' then 'normal'
    when 'high' then 'high'
    when 'urgent' then 'urgent'
    else null
  end;
  return new;
end;
$$;

drop trigger if exists requests_normalise_priority on public.requests;
create trigger requests_normalise_priority
before insert or update of priority on public.requests
for each row execute function public.normalise_request_priority();

revoke all on function public.normalise_request_priority() from public, anon, authenticated;

alter table public.quotes
  add column if not exists owner_id uuid,
  add column if not exists next_action text,
  add column if not exists next_action_due_at timestamptz,
  add column if not exists last_contact_at timestamptz,
  add column if not exists follow_up_outcome text;

alter table public.tasks
  add column if not exists quote_id uuid,
  add column if not exists owner_id uuid,
  add column if not exists priority text not null default 'normal',
  add column if not exists automation_key text;

alter table public.company_settings
  add column if not exists request_proposal_due_hours integer not null default 24,
  add column if not exists proposal_expiry_warning_days integer not null default 3,
  add column if not exists operations_readiness_window_days integer not null default 30;

-- Operational resource allocation belongs to the trip after acceptance. These
-- tables are deliberately separate from request planning so there is one
-- editable source of truth during delivery.
create table if not exists public.departure_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  departure_id uuid not null references public.departures(id) on delete cascade,
  staff_id uuid not null references public.tour_staff(id) on delete restrict,
  role text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (departure_id, staff_id)
);

create table if not exists public.departure_vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  departure_id uuid not null references public.departures(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  seats_used integer check (seats_used is null or seats_used > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (departure_id, vehicle_id)
);

create index if not exists departure_staff_assignments_departure_idx
  on public.departure_staff_assignments (departure_id);
create index if not exists departure_staff_assignments_staff_idx
  on public.departure_staff_assignments (staff_id);
create index if not exists departure_vehicle_assignments_departure_idx
  on public.departure_vehicle_assignments (departure_id);
create index if not exists departure_vehicle_assignments_vehicle_idx
  on public.departure_vehicle_assignments (vehicle_id);

drop trigger if exists departure_staff_assignments_updated_at on public.departure_staff_assignments;
create trigger departure_staff_assignments_updated_at
before update on public.departure_staff_assignments
for each row execute function public.update_updated_at_column();

drop trigger if exists departure_vehicle_assignments_updated_at on public.departure_vehicle_assignments;
create trigger departure_vehicle_assignments_updated_at
before update on public.departure_vehicle_assignments
for each row execute function public.update_updated_at_column();

alter table public.departure_staff_assignments enable row level security;
alter table public.departure_vehicle_assignments enable row level security;
revoke all on public.departure_staff_assignments from public, anon, authenticated;
revoke all on public.departure_vehicle_assignments from public, anon, authenticated;
grant select, insert, update, delete on public.departure_staff_assignments to service_role;
grant select, insert, update, delete on public.departure_vehicle_assignments to service_role;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'quotes_owner_id_fkey'
      and conrelid = 'public.quotes'::regclass
  ) then
    alter table public.quotes
      add constraint quotes_owner_id_fkey
      foreign key (owner_id) references public.admin_users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_quote_id_fkey'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_quote_id_fkey
      foreign key (quote_id) references public.quotes(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_owner_id_fkey'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_owner_id_fkey
      foreign key (owner_id) references public.admin_users(id) on delete set null;
  end if;
end $$;

alter table public.tasks drop constraint if exists tasks_priority_check;
alter table public.tasks
  add constraint tasks_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));

alter table public.company_settings drop constraint if exists company_settings_request_proposal_due_hours_check;
alter table public.company_settings
  add constraint company_settings_request_proposal_due_hours_check
  check (request_proposal_due_hours between 1 and 720);

alter table public.company_settings drop constraint if exists company_settings_proposal_expiry_warning_days_check;
alter table public.company_settings
  add constraint company_settings_proposal_expiry_warning_days_check
  check (proposal_expiry_warning_days between 1 and 30);

alter table public.company_settings drop constraint if exists company_settings_operations_readiness_window_days_check;
alter table public.company_settings
  add constraint company_settings_operations_readiness_window_days_check
  check (operations_readiness_window_days between 1 and 180);

-- Existing records inherit ownership once. Future records are assigned in the
-- application actions, while unassigned records remain visible in Sales Desk.
update public.quotes q
set owner_id = r.handled_by
from public.requests r
where q.request_id = r.id
  and q.owner_id is null
  and r.handled_by is not null;

-- Backfill accepted request planning into the trip workspace.
insert into public.departure_staff_assignments (
  departure_id, staff_id, role, notes, created_at, updated_at
)
select distinct on (q.departure_id, rsa.staff_id)
  q.departure_id, rsa.staff_id, rsa.role, rsa.notes, rsa.created_at, rsa.updated_at
from public.quotes q
join public.request_staff_assignments rsa on rsa.request_id = q.request_id
where q.status = 'accepted' and q.departure_id is not null
order by q.departure_id, rsa.staff_id, rsa.created_at
on conflict (departure_id, staff_id) do nothing;

insert into public.departure_vehicle_assignments (
  departure_id, vehicle_id, seats_used, notes, created_at, updated_at
)
select distinct on (q.departure_id, rva.vehicle_id)
  q.departure_id, rva.vehicle_id, rva.seats_used, rva.notes, rva.created_at, rva.updated_at
from public.quotes q
join public.request_vehicle_assignments rva on rva.request_id = q.request_id
where q.status = 'accepted' and q.departure_id is not null
order by q.departure_id, rva.vehicle_id, rva.created_at
on conflict (departure_id, vehicle_id) do nothing;

update public.tasks t
set departure_id = coalesce(t.departure_id, q.departure_id),
    booking_id = coalesce(t.booking_id, q.provisional_booking_id),
    quote_id = coalesce(t.quote_id, q.id)
from public.quotes q
where q.status = 'accepted'
  and q.request_id = t.request_id
  and q.departure_id is not null;

-- Adopt follow-up tasks created by the previous title-based implementation so
-- rollout does not create a second task for an already active proposal.
with candidates as (
  select
    t.id,
    q.id as quote_id,
    row_number() over (partition by q.id order by t.created_at, t.id) as task_rank
  from public.tasks t
  join public.quotes q
    on q.request_id = t.request_id
   and t.title = 'Follow up proposal ' || q.quote_number
  where t.automation_key is null
)
update public.tasks t
set quote_id = candidates.quote_id,
    automation_key = case
      when candidates.task_rank = 1 then 'proposal_follow_up:' || candidates.quote_id::text
      else null
    end
from candidates
where t.id = candidates.id;

create index if not exists requests_work_queue_idx
  on public.requests (handled_by, next_action_due_at, created_at)
  where archived_at is null;

create index if not exists quotes_work_queue_idx
  on public.quotes (owner_id, next_action_due_at, updated_at)
  where is_template = false;

create index if not exists tasks_open_owner_due_idx
  on public.tasks (owner_id, due_date, priority)
  where is_done = false;

create index if not exists tasks_quote_id_idx
  on public.tasks (quote_id)
  where quote_id is not null;

create unique index if not exists tasks_automation_key_uidx
  on public.tasks (automation_key)
  where automation_key is not null;

-- Quote creators normally own the proposal; where the auth identity matches an
-- active admin profile this trigger avoids depending on every creation path.
create or replace function public.assign_quote_workflow_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.owner_id is null then
    if new.request_id is not null then
      select handled_by into new.owner_id
      from public.requests
      where id = new.request_id;
    end if;

    if new.owner_id is null and new.created_by is not null then
      select id into new.owner_id
      from public.admin_users
      where id = new.created_by and is_active = true;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_assign_workflow_owner on public.quotes;
create trigger quotes_assign_workflow_owner
before insert on public.quotes
for each row execute function public.assign_quote_workflow_owner();

revoke all on function public.assign_quote_workflow_owner() from public, anon, authenticated;

-- The acceptance RPC remains the transaction boundary. This trigger runs in
-- that same transaction and moves provisional people/vehicle planning plus all
-- request tasks into the operational trip atomically.
create or replace function public.handoff_accepted_quote_operations()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'accepted'
     and new.request_id is not null
     and new.departure_id is not null then
    insert into public.departure_staff_assignments (
      departure_id, staff_id, role, notes, created_at, updated_at
    )
    select new.departure_id, staff_id, role, notes, created_at, updated_at
    from public.request_staff_assignments
    where request_id = new.request_id
    on conflict (departure_id, staff_id) do nothing;

    insert into public.departure_vehicle_assignments (
      departure_id, vehicle_id, seats_used, notes, created_at, updated_at
    )
    select new.departure_id, vehicle_id, seats_used, notes, created_at, updated_at
    from public.request_vehicle_assignments
    where request_id = new.request_id
    on conflict (departure_id, vehicle_id) do nothing;

    update public.tasks
    set departure_id = coalesce(departure_id, new.departure_id),
        booking_id = coalesce(booking_id, new.provisional_booking_id),
        quote_id = coalesce(quote_id, new.id)
    where request_id = new.request_id;
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_handoff_accepted_operations on public.quotes;
create trigger quotes_handoff_accepted_operations
after insert or update of status, departure_id, provisional_booking_id on public.quotes
for each row execute function public.handoff_accepted_quote_operations();

revoke all on function public.handoff_accepted_quote_operations() from public, anon, authenticated;

create or replace function public.prepare_accepted_quote_workflow()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status is distinct from new.status then
    new.next_action := 'Open trip operations and review handoff';
    new.next_action_due_at := now();
    new.last_contact_at := now();
    new.follow_up_outcome := 'Proposal accepted';
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_prepare_accepted_workflow on public.quotes;
create trigger quotes_prepare_accepted_workflow
before update of status on public.quotes
for each row execute function public.prepare_accepted_quote_workflow();

revoke all on function public.prepare_accepted_quote_workflow() from public, anon, authenticated;
