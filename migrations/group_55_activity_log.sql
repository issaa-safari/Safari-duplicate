-- Group 55: Activity / audit log.
--
-- A generic, append-only record of who changed what and when, so the app has
-- a history beyond per-request communication notes. Written only via the
-- service-role admin client from server actions, so — like the Category 2
-- tables in group_31 — RLS is enabled with no policies: anon/authenticated
-- are fully locked out, the service role bypasses RLS unchanged.
--
-- Idempotent — safe to re-run. Run after group_54.

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_log_created_at on activity_log (created_at desc);
create index if not exists idx_activity_log_entity on activity_log (entity_type, entity_id);

alter table activity_log enable row level security;
