-- Group 50: tour_days.accommodation_alt_id
--
-- The tour itinerary builder saves a primary and an optional alternative
-- accommodation per day (save-itinerary route writes accommodation_alt_id),
-- but the column was never added by any migration — so saving a tour
-- itinerary failed with a schema error on fresh databases. Adds the
-- nullable column the builder already uses.
--
-- Idempotent — safe to re-run.

alter table tour_days
  add column if not exists accommodation_alt_id uuid references accommodations(id) on delete set null;
