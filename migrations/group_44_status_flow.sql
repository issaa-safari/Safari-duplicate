-- Group 44: Computed status flow + immutable transition notes
--
-- Two behaviours from the spec's §2 status workflow:
--   1. Early stages (new → working_on → open) are COMPUTED from quote activity,
--      not set by hand. A trigger on quote_versions advances the parent request:
--        - a quote/version exists (draft)      -> working_on   (from new)
--        - a version is sent/viewed            -> open         (from new/working_on)
--      It never overrides manual/terminal stages (pre_booked, booked, completed,
--      not_booked, archived), so accept->booked and manual moves are safe.
--   2. Every stage change writes an immutable system note (communication_logs),
--      no matter the source: manual selector, computed trigger, quote accept, or
--      the daily cron. One trigger on requests covers them all uniformly.
--
-- Idempotent — safe to re-run. Run after group_43.

-- ── 1. Auto-advance early stages from quote activity ──────────────────────────
create or replace function auto_advance_request_stage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

drop trigger if exists trg_auto_advance_request on quote_versions;
create trigger trg_auto_advance_request
  after insert or update of status on quote_versions
  for each row execute function auto_advance_request_stage();

-- ── 2. Log every stage change as an immutable system note ─────────────────────
create or replace function log_request_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stage is distinct from old.stage then
    insert into communication_logs (request_id, type, summary)
    values (new.id, 'note', format('Status changed: %s → %s', coalesce(old.stage, '—'), new.stage));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_request_stage_change on requests;
create trigger trg_log_request_stage_change
  after update of stage on requests
  for each row execute function log_request_stage_change();

-- Harden (match group_43): these are trigger functions, not meant for RPC.
revoke execute on function auto_advance_request_stage() from public, anon, authenticated;
revoke execute on function log_request_stage_change() from public, anon, authenticated;
