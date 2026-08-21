-- Group 88: tour_days road distances + generated route map
--
-- Mirrors quote_days.road_distance_km (group_61) for tours: a driving
-- distance (km) computed via the Google Routes API and persisted at
-- itinerary-save time, so the public tour/departure pages don't need to
-- call Google on every page view.
--
-- Same precedence as the proposal map (app/quote/[token]/page.tsx):
--   distance_km (staff override) ?? road_distance_km (computed at save) ??
--   haversineKm(prev stop, this stop) (render-time straight-line fallback,
--   no key required).
--
-- tour_days has no column-level lockdown (only `departures` does — see
-- group_30/group_85) so this new column is automatically covered by the
-- existing public SELECT grant; nothing else to grant.
--
-- Idempotent — safe to re-run. Run after group_87.

alter table tour_days add column if not exists road_distance_km numeric(10,1);

comment on column tour_days.road_distance_km is
  'Google Routes API driving distance (km) of the leg from the previous stop, computed and persisted when the itinerary is saved in admin. Null falls back to distance_km (manual override) or a straight-line estimate computed at render time. See lib/google-routes.ts and lib/tour-map.ts.';
