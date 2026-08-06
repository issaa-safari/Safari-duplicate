-- Group 72: capture objects that existed only in production
--
-- These 12 columns, 2 trigger functions and 2 triggers were applied to the
-- live database by hand and never written back to a migration. A database
-- rebuilt from migrations/ was therefore missing all of them — silently, since
-- nothing in the repo recorded that they should exist. Found by diffing the
-- live project against a replay of every group_*.sql; see
-- docs/current/schema-drift.md.
--
-- Everything here is transcribed from production via pg_get_functiondef /
-- pg_get_triggerdef / pg_attribute, so applying this to production is a no-op.
-- Its purpose is to make a rebuilt database match.
--
-- Idempotent — safe to re-run. Run after group_71.

-- ── Columns ────────────────────────────────────────────────────────────────

alter table company_settings
  add column if not exists prebooked_enabled boolean not null default false;

alter table quote_day_items
  add column if not exists is_alternative boolean not null default false,
  add column if not exists nights integer default 1;

-- A stay spans nights; zero or negative would be meaningless.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.quote_day_items'::regclass
      and conname = 'quote_day_items_nights_check'
  ) then
    alter table quote_day_items
      add constraint quote_day_items_nights_check
      check (nights is null or nights > 0);
  end if;
end
$$;

-- Closing day of a multi-day span (day_number is the opening day).
alter table quote_days
  add column if not exists day_end integer;

alter table quote_deliveries
  add column if not exists message text,
  add column if not exists sender_email text,
  add column if not exists subject text;

alter table quote_versions
  add column if not exists arrival_notes text,
  add column if not exists departure_notes text,
  add column if not exists preview_layout jsonb not null default '[]'::jsonb,
  add column if not exists preview_theme text;

-- Consultant who owns the request. ON DELETE SET NULL so removing an admin
-- never deletes their requests.
alter table requests
  add column if not exists handled_by uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.requests'::regclass
      and conname = 'requests_handled_by_fkey'
  ) then
    alter table requests
      add constraint requests_handled_by_fkey
      foreign key (handled_by) references admin_users(id) on delete set null;
  end if;
end
$$;

-- ── Request-stage automation ───────────────────────────────────────────────

-- Moves a request along its pipeline when a quote version is created or its
-- status changes: sending or viewing a quote opens the request; any other
-- activity on a brand-new request marks it as being worked on.
create or replace function public.auto_advance_request_stage()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_request uuid;
  v_stage   text;
begin
  select q.request_id into v_request from quotes q where q.id = new.quote_id;
  if v_request is null then
    return new;
  end if;

  select stage into v_stage from requests where id = v_request;

  if new.status in ('sent', 'viewed') and v_stage in ('new', 'working_on') then
    update requests set stage = 'open' where id = v_request and stage in ('new', 'working_on');
  elsif v_stage = 'new' then
    update requests set stage = 'working_on' where id = v_request and stage = 'new';
  end if;

  return new;
end;
$function$;

-- Writes a note into the request's communication log on every stage change,
-- so the timeline shows how a request progressed.
create or replace function public.log_request_stage_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.stage is distinct from old.stage then
    insert into communication_logs (request_id, type, summary)
    values (new.id, 'note', format('Status changed: %s → %s', coalesce(old.stage, '—'), new.stage));
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_auto_advance_request on quote_versions;
create trigger trg_auto_advance_request
  after insert or update of status on quote_versions
  for each row execute function auto_advance_request_stage();

drop trigger if exists trg_log_request_stage_change on requests;
create trigger trg_log_request_stage_change
  after update of stage on requests
  for each row execute function log_request_stage_change();
