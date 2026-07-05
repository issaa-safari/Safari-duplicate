-- Group 38: Smart tasks — typed tasks, default-task templates, auto-generation
--
-- Extends the bare `tasks` table (group_00: id/request_id/title/is_done) with a
-- type, workflow status, an auto-generated flag and sort order. Adds a
-- company-level `default_tasks` template list and a DB trigger that generates a
-- task checklist automatically when a request enters the `booked` stage — no
-- matter which code path flipped it (manual stage selector or quote acceptance).
--
-- Idempotent — safe to re-run. Run after group_37.

-- ── Extend tasks ──────────────────────────────────────────────────────────────
alter table tasks
  add column if not exists type text not null default 'other'
    check (type in ('payment', 'accommodation', 'activity', 'other')),
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'paid', 'cancelled')),
  add column if not exists auto_generated boolean not null default false,
  add column if not exists sort_order integer not null default 0,
  add column if not exists due_date date;

create index if not exists tasks_request_idx on tasks (request_id, sort_order);

-- ── Default task templates (single-company config) ────────────────────────────
create table if not exists default_tasks (
  id uuid primary key default gen_random_uuid(),
  stage text not null default 'booked',
  description text not null,
  type text not null default 'other'
    check (type in ('payment', 'accommodation', 'activity', 'other')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists default_tasks_updated_at on default_tasks;
create trigger default_tasks_updated_at before update on default_tasks
  for each row execute function update_updated_at_column();

-- Admin-only table — reads/writes go through the service-role client, which
-- bypasses RLS. Enable RLS with no policies so the anon/auth API cannot reach it.
alter table default_tasks enable row level security;

-- Seed a sensible starter checklist (only if the table is empty).
insert into default_tasks (stage, description, type, sort_order)
select * from (values
  ('booked', 'Send booking confirmation to client', 'other', 10),
  ('booked', 'Confirm all accommodation reservations', 'accommodation', 20),
  ('booked', 'Arrange airport transfers', 'other', 30),
  ('booked', 'Collect balance payment before travel', 'payment', 40)
) as v(stage, description, type, sort_order)
where not exists (select 1 from default_tasks);

-- ── Auto-generate the task checklist on transition into 'booked' ──────────────
create or replace function generate_booking_tasks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sort   integer := 0;
  v_total  numeric(14,2);
  v_day    record;
begin
  if new.stage = 'booked' and (old.stage is distinct from new.stage) then
    -- Guard against double-generation if a request re-enters 'booked'.
    if exists (select 1 from tasks where request_id = new.id and auto_generated) then
      return new;
    end if;

    -- 1) Payment task for the accepted (or latest) quote's selling total.
    select coalesce(qv.total_selling_usd, 0) into v_total
    from quotes q
    join quote_versions qv
      on qv.id = coalesce(q.accepted_version_id, qv.id)
    where q.request_id = new.id
    order by qv.version_number desc
    limit 1;

    insert into tasks (request_id, title, type, auto_generated, sort_order)
    values (
      new.id,
      case when v_total is not null and v_total > 0
        then format('Collect payment — total $%s', trim(to_char(v_total, 'FM999,999,990.00')))
        else 'Collect deposit / balance payment' end,
      'payment', true, v_sort
    );
    v_sort := v_sort + 10;

    -- 2) Company default tasks.
    insert into tasks (request_id, title, type, auto_generated, sort_order)
    select new.id, dt.description, dt.type, true, v_sort + (dt.sort_order)
    from default_tasks dt
    where dt.is_active and dt.stage = 'booked'
    order by dt.sort_order;
    v_sort := v_sort + 1000;

    -- 3) One task per accommodation item on the accepted/latest version's days.
    for v_day in
      select distinct qdi.title_snapshot, qd.day_number
      from quotes q
      join quote_versions qv on qv.id = coalesce(q.accepted_version_id, qv.id)
      join quote_days qd on qd.quote_version_id = qv.id
      join quote_day_items qdi on qdi.quote_day_id = qd.id
      where q.request_id = new.id
        and qdi.item_type = 'accommodation'
      order by qd.day_number
    loop
      insert into tasks (request_id, title, type, auto_generated, sort_order)
      values (
        new.id,
        format('Confirm accommodation: %s (Day %s)', v_day.title_snapshot, v_day.day_number),
        'accommodation', true, v_sort
      );
      v_sort := v_sort + 10;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_generate_booking_tasks on requests;
create trigger trg_generate_booking_tasks
  after update of stage on requests
  for each row execute function generate_booking_tasks();
