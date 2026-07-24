-- Group 68: Allow partial traveller records on a booking.
--
-- booking_travellers.first_name/last_name/email/phone were NOT NULL (group_21),
-- which assumed the public website flow where every field is collected up
-- front. Back-office bookings and quote-derived bookings often start with only
-- partial details (e.g. just a lead name, contact filled in later on the
-- manifest). Relax these to nullable — lib/types.ts already types them as
-- `string | null`.
--
-- Idempotent — safe to re-run. Run after group_67.

alter table booking_travellers alter column first_name drop not null;
alter table booking_travellers alter column last_name  drop not null;
alter table booking_travellers alter column email      drop not null;
alter table booking_travellers alter column phone      drop not null;
