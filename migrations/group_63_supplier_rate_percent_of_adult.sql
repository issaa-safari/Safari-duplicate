-- Group 63: per-hotel child/infant pricing as a % of the adult rate.
--
-- A child or infant rate row can now carry a price in one of two ways:
--   • an absolute `amount` (as before), or
--   • `percent_of_adult` — a percentage (0–100) of the same rate card's
--     adult/generic rate, resolved at pricing time.
-- Exactly one of the two is required per row (the new price-present check).
--
-- Existing rows keep their `amount` and leave `percent_of_adult` null, so
-- pricing is unchanged until an operator opts a row into percentage mode.
--
-- Idempotent — safe to re-run.

alter table supplier_rates
  add column if not exists percent_of_adult numeric(6,2)
    check (percent_of_adult is null or (percent_of_adult >= 0 and percent_of_adult <= 100));

-- `amount` becomes optional so a row can be priced purely by percentage.
alter table supplier_rates alter column amount drop not null;

-- Every rate must still carry a price: an absolute amount or a percent-of-adult.
alter table supplier_rates drop constraint if exists supplier_rates_price_present;
alter table supplier_rates
  add constraint supplier_rates_price_present
  check (amount is not null or percent_of_adult is not null);
