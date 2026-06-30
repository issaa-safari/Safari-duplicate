-- ============================================================
--  group_30_public_read_access.sql
--  Let the PUBLIC (anon) website client read only ACTIVE, safe data.
--  Required before swapping the public tour/departure pages off
--  createAdminClient and onto the normal client.
-- ============================================================
--  SECURITY MODEL:
--   • RLS policy = which ROWS are readable (here: active only).
--   • Column GRANT = which COLUMNS are readable. RLS does NOT restrict
--     columns, and the anon key is public — so a row policy alone would
--     expose every column (e.g. departures.internal_notes). We lock those.
--   • Admin reads are unaffected: service_role bypasses RLS and grants.
-- ============================================================


-- ---- STEP 0 (read-only): confirm the "active" column on each table ----
-- Run this first. The policies below assume `is_active` exists on
-- activities / destinations / accommodations / tour_staff. If any is
-- missing, tell me and I'll adjust that one policy.
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('activities','destinations','accommodations','tour_staff','tour_days')
  AND column_name IN ('is_active','status','has_content')
ORDER BY table_name, column_name;


-- ============================================================
--  STEP 1 — content tables: public can read ACTIVE rows
--  (Full row is safe here — descriptive marketing content.)
-- ============================================================

-- tours: RLS is currently OFF, so its "Public can view active tours"
-- policy is INERT and all draft tours are publicly readable. Enabling RLS
-- activates that existing policy → only status='active' tours are exposed.
-- (No new policy needed; admin + public policies already exist.)
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

ALTER TABLE activities     ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active activities" ON activities
  FOR SELECT USING (is_active = true);

ALTER TABLE destinations   ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active destinations" ON destinations
  FOR SELECT USING (is_active = true);

ALTER TABLE accommodations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active accommodations" ON accommodations
  FOR SELECT USING (is_active = true);

ALTER TABLE tour_staff     ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active tour_staff" ON tour_staff
  FOR SELECT USING (is_active = true);

-- tour_days has no own active flag — expose only days of ACTIVE tours.
ALTER TABLE tour_days       ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read tour_days of active tours" ON tour_days
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tours t
            WHERE t.id = tour_days.tour_id AND t.status = 'active')
  );


-- ============================================================
--  STEP 2 — departures: ACTIVE rows only, AND hide internal columns
-- ============================================================

ALTER TABLE departures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active departures" ON departures
  FOR SELECT USING (is_active = true);

-- Column lockdown: non-admin roles get only safe columns (no internal_notes).
REVOKE SELECT ON departures FROM anon, authenticated;
GRANT  SELECT (id, tour_id, start_date, end_date, max_seats,
               booked_seats, price_usd, status, is_active,
               created_at, updated_at)
  ON departures TO anon, authenticated;


-- ============================================================
--  AFTER APPLYING — quick verification (read-only)
--  Run each as the public would see it; expect only active rows,
--  and selecting internal_notes on departures as anon should FAIL.
-- ============================================================
-- SELECT count(*) FROM activities     WHERE is_active = true;
-- SELECT count(*) FROM departures     WHERE is_active = true;
-- SELECT internal_notes FROM departures LIMIT 1;  -- expect permission error for anon
