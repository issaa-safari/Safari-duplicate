-- Group 45: Flow polish — handled_by, prebooked toggle, preview + share fields
--
-- Supporting columns for the Safari-app flow build:
--   * requests.handled_by            — agent attribution + inbox "Handled by" filter
--   * company_settings.prebooked_enabled — accept lands on Pre-Booked when true
--   * quote_versions.preview_layout / preview_theme — proposal Preview step
--   * quote_deliveries.sender_email/subject/message — Finish/share step + share log
--
-- Idempotent — safe to re-run. Run after group_44.

alter table requests
  add column if not exists handled_by uuid references admin_users(id) on delete set null;

alter table company_settings
  add column if not exists prebooked_enabled boolean not null default false;

alter table quote_versions
  add column if not exists preview_layout jsonb not null default '[]'::jsonb,
  add column if not exists preview_theme text;

alter table quote_deliveries
  add column if not exists sender_email text,
  add column if not exists subject text,
  add column if not exists message text;
