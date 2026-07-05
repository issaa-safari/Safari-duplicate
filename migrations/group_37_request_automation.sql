-- Group 37: Request stage automation + archive lifecycle
--
-- Adds the plumbing behind the daily automation cron (`/api/cron/daily-automation`)
-- and the new `archived` stage. `requests.stage` is free text (no check constraint,
-- see group_00), so `archived` needs no enum change — only supporting columns,
-- a status-change timestamp, and per-company automation toggles.
--
-- Idempotent — safe to re-run. Run after group_36.

-- ── Requests: lifecycle timestamps + spec fields ──────────────────────────────
alter table requests
  add column if not exists status_changed_at timestamptz not null default now(),
  add column if not exists archived_at timestamptz,
  add column if not exists total_booking_value numeric(14,2),
  add column if not exists date_received date not null default current_date;

create index if not exists requests_status_changed_idx on requests (status_changed_at);
create index if not exists requests_archived_at_idx on requests (archived_at) where archived_at is not null;

-- Stamp status_changed_at whenever the stage actually changes. Also clears/sets
-- archived_at so the auto-delete sweep has a reliable "archived since" anchor.
create or replace function requests_stamp_status_changed()
returns trigger language plpgsql as $$
begin
  if new.stage is distinct from old.stage then
    new.status_changed_at = now();
    if new.stage = 'archived' then
      new.archived_at = coalesce(new.archived_at, now());
    else
      new.archived_at = null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists requests_stamp_status_changed on requests;
create trigger requests_stamp_status_changed before update on requests
  for each row execute function requests_stamp_status_changed();

-- ── Company settings: automation configuration (single row) ───────────────────
alter table company_settings
  add column if not exists auto_complete_on_end_date boolean not null default false,
  add column if not exists auto_archive_enabled boolean not null default false,
  add column if not exists auto_archive_days integer not null default 30 check (auto_archive_days >= 0),
  add column if not exists auto_archive_stages text[] not null default array['not_booked','completed'],
  add column if not exists auto_delete_enabled boolean not null default false,
  add column if not exists auto_delete_days integer not null default 90 check (auto_delete_days >= 0);
