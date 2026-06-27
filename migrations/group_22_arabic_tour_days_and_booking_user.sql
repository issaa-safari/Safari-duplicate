-- Group 22: Arabic tour-day descriptions + link bookings to user accounts
-- Safe to run multiple times (idempotent guards).

-- 1) Arabic description on tour template days so Arabic content flows into
--    generated quotes and the public departure pages (the render logic already
--    prefers *_ar and falls back to English).
alter table tour_days
  add column if not exists description_ar text;

-- 2) Associate a booking with the signed-in client account.
--    Nullable so existing/anonymous bookings remain valid; the client dashboard
--    also matches by traveller email, so this is an additive robustness link.
alter table bookings
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_bookings_user_id on bookings(user_id);
