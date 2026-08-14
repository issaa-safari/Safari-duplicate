-- Group 78: a booking does not have to be a seat on a departure
--
-- `bookings` was built around fixed departures: the admin's New Booking screen
-- required one, derived the client from the lead traveller's email, and reserved
-- seats. That is the right shape for a group departure and the wrong shape for
-- most of what this operator actually sells — a private trip with no scheduled
-- departure, a booking taken against an enquiry before anything is scheduled, or
-- one recorded for a client who is already on file.
--
-- `departure_id` and `client_id` have always been nullable in the table; only the
-- UI insisted. What was genuinely missing is a link back to the request a booking
-- came from, which is what this file adds.
--
-- `on delete set null`, not cascade: a request being deleted must not take a
-- booking — and the money hanging off it — with it. Same reasoning as
-- `trip_payments.invoice_id`.
--
-- Idempotent — safe to re-run. Run after group_77.

alter table bookings add column if not exists request_id uuid
  references requests(id) on delete set null;

create index if not exists bookings_request_idx on bookings (request_id);

-- Worth recording on the columns themselves, because "why is this nullable?" is
-- exactly the question the next person will ask of a bookings table.
comment on column bookings.departure_id is
  'Null for a booking that is not a seat on a scheduled departure — a private trip, or one taken before anything is scheduled. Seat accounting only applies when this is set.';
comment on column bookings.request_id is
  'The enquiry this booking came from, when there was one. Set null on delete so losing a request never loses the booking.';
comment on column bookings.client_id is
  'Null only for a booking recorded before the client is known. Normally resolved from the request, the chosen client, or the lead traveller''s email.';
