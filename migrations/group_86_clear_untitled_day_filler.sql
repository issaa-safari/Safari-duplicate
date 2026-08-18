-- group_86 — clear the 'Untitled day' filler out of tour_days.title_en
--
-- app/api/admin/save-itinerary/route.ts used to substitute the literal string
-- 'Untitled day' for any day title left blank in the admin itinerary builder:
--
--     title_en: (d.title_en && d.title_en.trim()) || 'Untitled day',
--
-- The builder's "Generate Days" button creates one blank day per duration_days,
-- so generating an itinerary and saving it before writing the titles published
-- 'Untitled day' to the public departure and tour pages as though it were real
-- copy. It is indistinguishable from a genuine title once stored.
--
-- The route now stores NULL instead, and every reader already tolerates it:
-- the public pages fall back to the day label ("DAY 1"), and the admin tour
-- page shows 'No title set'. This migration retires the rows already written.
--
-- Scoped to the exact filler string. A day a human deliberately named
-- "Untitled day" would also be cleared, which is the intended reading: it is
-- the same placeholder either way, and clearing it shows the day label instead.

update tour_days
   set title_en  = null,
       updated_at = now()
 where title_en = 'Untitled day';

-- ── Verification (read-only) ────────────────────────────────────────────────
-- Expect 0:
--   SELECT count(*) FROM tour_days WHERE title_en = 'Untitled day';
-- Days now showing their label alone on the public site:
--   SELECT tour_id, day_number FROM tour_days WHERE title_en IS NULL
--   ORDER BY tour_id, day_number;
