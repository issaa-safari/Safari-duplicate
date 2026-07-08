-- Group 46: requests.trip_length_nights
--
-- requests already carries travelers_* and preferred_start_date but has no
-- trip-duration field, so a freeform request (no linked tour_id) can't seed
-- a day-count skeleton when a quote is created from it. Adds a nullable
-- nights column captured on the request form and consumed by
-- create_quote_with_version to pre-fill quote_days.
--
-- Idempotent — safe to re-run.

alter table requests
  add column if not exists trip_length_nights smallint;
