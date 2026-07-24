-- Group 67: Rooming list + agreement email/language support
--
-- Extends the group_66 fixed-departure tooling:
--   * booking_travellers gains rooming-list fields (who shares which room)
--   * traveller_agreements gains language snapshot + email-reminder tracking
--     so the signing link can be emailed and chased automatically, and the
--     signing page can render in the traveller's language (EN/AR, RTL).
--
-- Idempotent — safe to re-run. Run after group_66.

alter table booking_travellers
  add column if not exists room_label text,
  add column if not exists room_type text;

alter table traveller_agreements
  add column if not exists language_snapshot text,
  add column if not exists last_emailed_at timestamptz,
  add column if not exists reminder_count integer not null default 0;
