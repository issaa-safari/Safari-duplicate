-- Group 79: dates for a booking that has no departure
--
-- group_78 let a booking exist without a departure. Dates, though, only ever
-- lived on `departures` — so a private trip had none anywhere, and every screen
-- that showed a date fell back to an em dash or, worse, to `new Date(undefined)`,
-- which renders "Invalid Date" and compares false against everything. The client
-- dashboard splits its bookings on `end_date > now()`; a booking with no dates
-- landed in neither the upcoming list nor the completed one and simply vanished
-- from the client's view.
--
-- These columns are the booking's *own* dates, used when it is not a seat on a
-- scheduled departure. When there is a departure, the departure's dates win —
-- see `resolveTripDates` in lib/trip-dates.ts, which is the single place that
-- decides. Two sources, one rule, applied everywhere.
--
-- Both are nullable: "we haven't agreed dates yet" is a real state for an
-- enquiry-stage booking, and it has to be representable.
--
-- Idempotent — safe to re-run. Run after group_78.

alter table bookings add column if not exists start_date date;
alter table bookings add column if not exists end_date date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_date_order_chk') then
    alter table bookings add constraint bookings_date_order_chk
      check (start_date is null or end_date is null or end_date >= start_date);
  end if;
end $$;

-- "Which trips are running / coming up" is the query these columns exist for,
-- and it is the one the client dashboard and the admin list both make.
create index if not exists bookings_start_date_idx
  on bookings (start_date) where start_date is not null;

comment on column bookings.start_date is
  'The booking''s own start date, for a trip that is not on a scheduled departure. When departure_id is set the departure''s dates win — resolveTripDates in lib/trip-dates.ts is the one place that decides.';
comment on column bookings.end_date is
  'See start_date. Nullable: dates not yet agreed is a real state.';
