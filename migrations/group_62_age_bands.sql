-- Group 62: age bands per operator policy.
--
--   Infant  0–3   free           (was 0–2)
--   Child   4–12  50% by default (was 3–15)
--   Adult   13+   full price     (was 16+)
--
-- Travellers already priced keep their age_band_snapshot, so existing quotes
-- are unaffected; the new boundaries apply to travellers added/saved after
-- this migration. The matching hardcoded cutoffs in the Trip Builder
-- (app/admin/trip-builder) are updated in the same change.
--
-- Idempotent — safe to re-run.

update traveller_age_bands set min_age = 0,  max_age = 3    where code = 'infant';
update traveller_age_bands set min_age = 4,  max_age = 12   where code = 'child';
update traveller_age_bands set min_age = 13, max_age = null where code = 'adult';
