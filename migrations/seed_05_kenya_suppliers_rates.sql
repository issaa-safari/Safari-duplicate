-- Seed 05: Kenya suppliers, parks & Sarova season rates
-- Run in Supabase SQL Editor AFTER group_33 (needs suppliers + supplier_id on rate cards).
--
-- Creates:
--   * Destinations: Nairobi, Mombasa, Masai Mara, Nakuru, Amboseli, Kisumu
--   * Parks (country='Kenya'): Mara Conservancy, Ol Pejeta, Lake Nakuru NP, Amboseli NP
--   * Suppliers: Sarova Hotels, Kenya Wildlife Service, Mara Conservancy Authority,
--     Vehicle Supplier A–D (placeholders — rename in Admin → Suppliers)
--   * Sarova accommodations + season rate cards (Low / High / Festive 2026)
--   * Park fee rate cards per park: Jan–Jun + Jul–Dec seasons, non-resident &
--     resident rates in USD, citizen rates in KES
--   * Vehicles + 2026 day-rate cards: Landcruiser 230 / Sedan 80 /
--     Overlanding Truck 400 / Flight 500 USD per day
--
-- Data cleanups from the Excel workbook (per ops confirmation):
--   * "Narobi" → Nairobi, "Symara" → Masai Mara
--   * The "1Non-Residents" typo row is seeded as a proper Jul–Dec
--     non_resident season row on each park.
--   * TWIN rates are PER ROOM (pricing_unit='room', room_category='sharing').
--     SGL is per single room; 3rd-bed supplement is room_category='extra_bed'
--     with pricing_unit='night'. Meal plan is tagged in supplier_rates.metadata
--     as {"meal_plan":"BB"|"HB"} — the Trip Builder filters on it.
--   * Child park fees: the workbook says ages 9–17, the platform Child band is
--     3–15. Ops decided to KEEP the platform band 3–15; park child rates below
--     apply to that band. Revisit if gate checks ever dispute an 8-year-old.
--
-- Idempotent: suppliers upsert by name; destinations/parks/accommodations/
-- vehicles insert-if-absent by name; each rate card is looked up by name and
-- its rates are wiped and rewritten, so re-running refreshes prices safely.

DO $$
DECLARE
  d_nairobi uuid; d_mombasa uuid; d_mara uuid; d_nakuru uuid; d_amboseli uuid; d_kisumu uuid;
  s_sarova uuid; s_kws uuid; s_mara uuid; s_va uuid; s_vb uuid; s_vc uuid; s_vd uuid;
  a_ws uuid; a_ik uuid; a_mc uuid; a_st uuid; a_lh uuid; a_pf uuid;
  p_mara uuid; p_olp uuid; p_nak uuid; p_amb uuid;
  veh_lc uuid; veh_sd uuid; veh_tk uuid; veh_fl uuid;
  v_card uuid;
BEGIN

  -- ═══════════════════════════════════════════════════════════════
  -- 1. DESTINATIONS (typo cleanups: Narobi → Nairobi, Symara → Masai Mara)
  -- ═══════════════════════════════════════════════════════════════

  UPDATE destinations SET name = 'Nairobi' WHERE name = 'Narobi';
  UPDATE destinations SET name = 'Masai Mara' WHERE name = 'Symara';

  INSERT INTO destinations (name, country, is_active)
  SELECT 'Nairobi', 'Kenya', true
  WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Nairobi' AND country = 'Kenya');
  SELECT id INTO d_nairobi FROM destinations WHERE name = 'Nairobi' AND country = 'Kenya' LIMIT 1;

  INSERT INTO destinations (name, country, is_active)
  SELECT 'Mombasa', 'Kenya', true
  WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Mombasa' AND country = 'Kenya');
  SELECT id INTO d_mombasa FROM destinations WHERE name = 'Mombasa' AND country = 'Kenya' LIMIT 1;

  INSERT INTO destinations (name, country, is_active)
  SELECT 'Masai Mara', 'Kenya', true
  WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Masai Mara' AND country = 'Kenya');
  SELECT id INTO d_mara FROM destinations WHERE name = 'Masai Mara' AND country = 'Kenya' LIMIT 1;

  INSERT INTO destinations (name, country, is_active)
  SELECT 'Nakuru', 'Kenya', true
  WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Nakuru' AND country = 'Kenya');
  SELECT id INTO d_nakuru FROM destinations WHERE name = 'Nakuru' AND country = 'Kenya' LIMIT 1;

  INSERT INTO destinations (name, country, is_active)
  SELECT 'Amboseli', 'Kenya', true
  WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Amboseli' AND country = 'Kenya');
  SELECT id INTO d_amboseli FROM destinations WHERE name = 'Amboseli' AND country = 'Kenya' LIMIT 1;

  INSERT INTO destinations (name, country, is_active)
  SELECT 'Kisumu', 'Kenya', true
  WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Kisumu' AND country = 'Kenya');
  SELECT id INTO d_kisumu FROM destinations WHERE name = 'Kisumu' AND country = 'Kenya' LIMIT 1;

  RAISE NOTICE '✓ destinations ready';

  -- ═══════════════════════════════════════════════════════════════
  -- 2. PARKS (country='Kenya')
  -- ═══════════════════════════════════════════════════════════════

  INSERT INTO parks (name, country, park_type, is_active)
  SELECT 'Mara Conservancy', 'Kenya', 'conservancy', true
  WHERE NOT EXISTS (SELECT 1 FROM parks WHERE name = 'Mara Conservancy');
  SELECT id INTO p_mara FROM parks WHERE name = 'Mara Conservancy' LIMIT 1;
  UPDATE parks SET country = 'Kenya' WHERE id = p_mara;

  INSERT INTO parks (name, country, park_type, is_active)
  SELECT 'Ol Pejeta Conservancy', 'Kenya', 'conservancy', true
  WHERE NOT EXISTS (SELECT 1 FROM parks WHERE name = 'Ol Pejeta Conservancy');
  SELECT id INTO p_olp FROM parks WHERE name = 'Ol Pejeta Conservancy' LIMIT 1;
  UPDATE parks SET country = 'Kenya' WHERE id = p_olp;

  INSERT INTO parks (name, country, park_type, is_active)
  SELECT 'Lake Nakuru National Park', 'Kenya', 'national_park', true
  WHERE NOT EXISTS (SELECT 1 FROM parks WHERE name = 'Lake Nakuru National Park');
  SELECT id INTO p_nak FROM parks WHERE name = 'Lake Nakuru National Park' LIMIT 1;
  UPDATE parks SET country = 'Kenya' WHERE id = p_nak;

  INSERT INTO parks (name, country, park_type, is_active)
  SELECT 'Amboseli National Park', 'Kenya', 'national_park', true
  WHERE NOT EXISTS (SELECT 1 FROM parks WHERE name = 'Amboseli National Park');
  SELECT id INTO p_amb FROM parks WHERE name = 'Amboseli National Park' LIMIT 1;
  UPDATE parks SET country = 'Kenya' WHERE id = p_amb;

  RAISE NOTICE '✓ Kenya parks ready';

  -- ═══════════════════════════════════════════════════════════════
  -- 3. SUPPLIERS
  -- ═══════════════════════════════════════════════════════════════

  INSERT INTO suppliers (name, supplier_type, notes)
  VALUES ('Sarova Hotels', 'accommodation', 'Sarova Hotels, Resorts & Game Lodges — Kenya')
  ON CONFLICT (name) DO UPDATE SET supplier_type = EXCLUDED.supplier_type, is_active = true
  RETURNING id INTO s_sarova;

  INSERT INTO suppliers (name, supplier_type, notes)
  VALUES ('Kenya Wildlife Service', 'park', 'KWS — national park gate fees')
  ON CONFLICT (name) DO UPDATE SET supplier_type = EXCLUDED.supplier_type, is_active = true
  RETURNING id INTO s_kws;

  INSERT INTO suppliers (name, supplier_type, notes)
  VALUES ('Mara Conservancy Authority', 'park', 'Mara Conservancy / Ol Pejeta gate fees')
  ON CONFLICT (name) DO UPDATE SET supplier_type = EXCLUDED.supplier_type, is_active = true
  RETURNING id INTO s_mara;

  INSERT INTO suppliers (name, supplier_type, notes)
  VALUES ('Vehicle Supplier A', 'transport', 'Placeholder — replace with the real Landcruiser provider')
  ON CONFLICT (name) DO UPDATE SET supplier_type = EXCLUDED.supplier_type, is_active = true
  RETURNING id INTO s_va;

  INSERT INTO suppliers (name, supplier_type, notes)
  VALUES ('Vehicle Supplier B', 'transport', 'Placeholder — replace with the real sedan provider')
  ON CONFLICT (name) DO UPDATE SET supplier_type = EXCLUDED.supplier_type, is_active = true
  RETURNING id INTO s_vb;

  INSERT INTO suppliers (name, supplier_type, notes)
  VALUES ('Vehicle Supplier C', 'transport', 'Placeholder — replace with the real overlanding truck provider')
  ON CONFLICT (name) DO UPDATE SET supplier_type = EXCLUDED.supplier_type, is_active = true
  RETURNING id INTO s_vc;

  INSERT INTO suppliers (name, supplier_type, notes)
  VALUES ('Vehicle Supplier D', 'transport', 'Placeholder — replace with the real flight charter provider')
  ON CONFLICT (name) DO UPDATE SET supplier_type = EXCLUDED.supplier_type, is_active = true
  RETURNING id INTO s_vd;

  RAISE NOTICE '✓ suppliers ready';

  -- ═══════════════════════════════════════════════════════════════
  -- 4. SAROVA ACCOMMODATIONS
  -- ═══════════════════════════════════════════════════════════════

  INSERT INTO accommodations (name, destination_id, type, budget_tier, rating, is_active)
  SELECT 'Sarova Whitesands Beach Resort & Spa', d_mombasa, 'hotel', 'midrange', 4, true
  WHERE NOT EXISTS (SELECT 1 FROM accommodations WHERE name = 'Sarova Whitesands Beach Resort & Spa');
  SELECT id INTO a_ws FROM accommodations WHERE name = 'Sarova Whitesands Beach Resort & Spa' LIMIT 1;

  INSERT INTO accommodations (name, destination_id, type, budget_tier, rating, is_active)
  SELECT 'Sarova Imperial Hotel Kisumu', d_kisumu, 'hotel', 'luxury', 4, true
  WHERE NOT EXISTS (SELECT 1 FROM accommodations WHERE name = 'Sarova Imperial Hotel Kisumu');
  SELECT id INTO a_ik FROM accommodations WHERE name = 'Sarova Imperial Hotel Kisumu' LIMIT 1;

  INSERT INTO accommodations (name, destination_id, type, budget_tier, rating, is_active)
  SELECT 'Sarova Mara Game Camp', d_mara, 'camp', 'luxury', 4, true
  WHERE NOT EXISTS (SELECT 1 FROM accommodations WHERE name = 'Sarova Mara Game Camp');
  SELECT id INTO a_mc FROM accommodations WHERE name = 'Sarova Mara Game Camp' LIMIT 1;

  INSERT INTO accommodations (name, destination_id, type, budget_tier, rating, is_active)
  SELECT 'Sarova Stanley Nairobi', d_nairobi, 'hotel', 'luxury', 5, true
  WHERE NOT EXISTS (SELECT 1 FROM accommodations WHERE name = 'Sarova Stanley Nairobi');
  SELECT id INTO a_st FROM accommodations WHERE name = 'Sarova Stanley Nairobi' LIMIT 1;

  INSERT INTO accommodations (name, destination_id, type, budget_tier, rating, is_active)
  SELECT 'Sarova Lion Hill Game Lodge', d_nakuru, 'lodge', 'midrange', 4, true
  WHERE NOT EXISTS (SELECT 1 FROM accommodations WHERE name = 'Sarova Lion Hill Game Lodge');
  SELECT id INTO a_lh FROM accommodations WHERE name = 'Sarova Lion Hill Game Lodge' LIMIT 1;

  INSERT INTO accommodations (name, destination_id, type, budget_tier, rating, is_active)
  SELECT 'Sarova Panafric Nairobi', d_nairobi, 'hotel', 'midrange', 4, true
  WHERE NOT EXISTS (SELECT 1 FROM accommodations WHERE name = 'Sarova Panafric Nairobi');
  SELECT id INTO a_pf FROM accommodations WHERE name = 'Sarova Panafric Nairobi' LIMIT 1;

  RAISE NOTICE '✓ Sarova accommodations ready';

  -- ═══════════════════════════════════════════════════════════════
  -- 5. SAROVA SEASON RATE CARDS (per room per night, TWIN = per room)
  --    Seasons 2026: Low 03 Jan–30 Jun · High 01 Jul–22 Dec · Festive 23 Dec–02 Jan
  -- ═══════════════════════════════════════════════════════════════

  -- Sarova Whitesands — Low Season 2026
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sarova Whitesands — Low Season 2026';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sarova Whitesands — Low Season 2026', 'Sarova Hotels', s_sarova, 'accommodation', a_ws, 'accommodation', '2026-01-03', '2026-06-30', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_sarova, entity_id = a_ws, valid_from = '2026-01-03', valid_to = '2026-06-30', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) VALUES
    (v_card, 'single',    'all', 'room',  110, '{"meal_plan":"BB"}', 10),
    (v_card, 'sharing',   'all', 'room',  140, '{"meal_plan":"BB"}', 20),
    (v_card, 'extra_bed', 'all', 'night',  45, '{"meal_plan":"BB"}', 30),
    (v_card, 'single',    'all', 'room',  130, '{"meal_plan":"HB"}', 40),
    (v_card, 'sharing',   'all', 'room',  180, '{"meal_plan":"HB"}', 50),
    (v_card, 'extra_bed', 'all', 'night',  55, '{"meal_plan":"HB"}', 60);

  -- Sarova Whitesands — High Season 2026
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sarova Whitesands — High Season 2026';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sarova Whitesands — High Season 2026', 'Sarova Hotels', s_sarova, 'accommodation', a_ws, 'accommodation', '2026-07-01', '2026-12-22', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_sarova, entity_id = a_ws, valid_from = '2026-07-01', valid_to = '2026-12-22', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) VALUES
    (v_card, 'single',    'all', 'room',  150, '{"meal_plan":"BB"}', 10),
    (v_card, 'sharing',   'all', 'room',  200, '{"meal_plan":"BB"}', 20),
    (v_card, 'extra_bed', 'all', 'night',  60, '{"meal_plan":"BB"}', 30),
    (v_card, 'single',    'all', 'room',  175, '{"meal_plan":"HB"}', 40),
    (v_card, 'sharing',   'all', 'room',  235, '{"meal_plan":"HB"}', 50),
    (v_card, 'extra_bed', 'all', 'night',  70, '{"meal_plan":"HB"}', 60);

  -- Sarova Whitesands — Festive Season 2026/27 (covers the 23–30 Dec test trip)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sarova Whitesands — Festive Season 2026/27';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sarova Whitesands — Festive Season 2026/27', 'Sarova Hotels', s_sarova, 'accommodation', a_ws, 'accommodation', '2026-12-23', '2027-01-02', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_sarova, entity_id = a_ws, valid_from = '2026-12-23', valid_to = '2027-01-02', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) VALUES
    (v_card, 'single',    'all', 'room',  220, '{"meal_plan":"BB"}', 10),
    (v_card, 'sharing',   'all', 'room',  290, '{"meal_plan":"BB"}', 20),
    (v_card, 'extra_bed', 'all', 'night',  80, '{"meal_plan":"BB"}', 30),
    (v_card, 'single',    'all', 'room',  250, '{"meal_plan":"HB"}', 40),
    (v_card, 'sharing',   'all', 'room',  330, '{"meal_plan":"HB"}', 50),
    (v_card, 'extra_bed', 'all', 'night',  95, '{"meal_plan":"HB"}', 60);

  -- Sarova Imperial Kisumu — Low Season 2026
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sarova Imperial Kisumu — Low Season 2026';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sarova Imperial Kisumu — Low Season 2026', 'Sarova Hotels', s_sarova, 'accommodation', a_ik, 'accommodation', '2026-01-03', '2026-06-30', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_sarova, entity_id = a_ik, valid_from = '2026-01-03', valid_to = '2026-06-30', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) VALUES
    (v_card, 'single',    'all', 'room',   90, '{"meal_plan":"BB"}', 10),
    (v_card, 'sharing',   'all', 'room',  120, '{"meal_plan":"BB"}', 20),
    (v_card, 'extra_bed', 'all', 'night',  35, '{"meal_plan":"BB"}', 30),
    (v_card, 'single',    'all', 'room',  110, '{"meal_plan":"HB"}', 40),
    (v_card, 'sharing',   'all', 'room',  155, '{"meal_plan":"HB"}', 50),
    (v_card, 'extra_bed', 'all', 'night',  45, '{"meal_plan":"HB"}', 60);

  -- Sarova Imperial Kisumu — High Season 2026
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sarova Imperial Kisumu — High Season 2026';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sarova Imperial Kisumu — High Season 2026', 'Sarova Hotels', s_sarova, 'accommodation', a_ik, 'accommodation', '2026-07-01', '2026-12-22', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_sarova, entity_id = a_ik, valid_from = '2026-07-01', valid_to = '2026-12-22', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) VALUES
    (v_card, 'single',    'all', 'room',  100, '{"meal_plan":"BB"}', 10),
    (v_card, 'sharing',   'all', 'room',  135, '{"meal_plan":"BB"}', 20),
    (v_card, 'extra_bed', 'all', 'night',  40, '{"meal_plan":"BB"}', 30),
    (v_card, 'single',    'all', 'room',  120, '{"meal_plan":"HB"}', 40),
    (v_card, 'sharing',   'all', 'room',  170, '{"meal_plan":"HB"}', 50),
    (v_card, 'extra_bed', 'all', 'night',  50, '{"meal_plan":"HB"}', 60);

  -- Sarova Imperial Kisumu — Festive Season 2026/27
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sarova Imperial Kisumu — Festive Season 2026/27';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sarova Imperial Kisumu — Festive Season 2026/27', 'Sarova Hotels', s_sarova, 'accommodation', a_ik, 'accommodation', '2026-12-23', '2027-01-02', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_sarova, entity_id = a_ik, valid_from = '2026-12-23', valid_to = '2027-01-02', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) VALUES
    (v_card, 'single',    'all', 'room',  130, '{"meal_plan":"BB"}', 10),
    (v_card, 'sharing',   'all', 'room',  170, '{"meal_plan":"BB"}', 20),
    (v_card, 'extra_bed', 'all', 'night',  50, '{"meal_plan":"BB"}', 30),
    (v_card, 'single',    'all', 'room',  155, '{"meal_plan":"HB"}', 40),
    (v_card, 'sharing',   'all', 'room',  210, '{"meal_plan":"HB"}', 50),
    (v_card, 'extra_bed', 'all', 'night',  60, '{"meal_plan":"HB"}', 60);

  -- Sarova Mara Game Camp — Low Season 2026
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sarova Mara Game Camp — Low Season 2026';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sarova Mara Game Camp — Low Season 2026', 'Sarova Hotels', s_sarova, 'accommodation', a_mc, 'accommodation', '2026-01-03', '2026-06-30', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_sarova, entity_id = a_mc, valid_from = '2026-01-03', valid_to = '2026-06-30', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) VALUES
    (v_card, 'single',    'all', 'room',  180, '{"meal_plan":"BB"}', 10),
    (v_card, 'sharing',   'all', 'room',  240, '{"meal_plan":"BB"}', 20),
    (v_card, 'extra_bed', 'all', 'night',  70, '{"meal_plan":"BB"}', 30),
    (v_card, 'single',    'all', 'room',  210, '{"meal_plan":"HB"}', 40),
    (v_card, 'sharing',   'all', 'room',  280, '{"meal_plan":"HB"}', 50),
    (v_card, 'extra_bed', 'all', 'night',  85, '{"meal_plan":"HB"}', 60);

  -- Sarova Mara Game Camp — High Season 2026
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sarova Mara Game Camp — High Season 2026';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sarova Mara Game Camp — High Season 2026', 'Sarova Hotels', s_sarova, 'accommodation', a_mc, 'accommodation', '2026-07-01', '2026-12-22', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_sarova, entity_id = a_mc, valid_from = '2026-07-01', valid_to = '2026-12-22', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) VALUES
    (v_card, 'single',    'all', 'room',  280, '{"meal_plan":"BB"}', 10),
    (v_card, 'sharing',   'all', 'room',  380, '{"meal_plan":"BB"}', 20),
    (v_card, 'extra_bed', 'all', 'night', 100, '{"meal_plan":"BB"}', 30),
    (v_card, 'single',    'all', 'room',  320, '{"meal_plan":"HB"}', 40),
    (v_card, 'sharing',   'all', 'room',  430, '{"meal_plan":"HB"}', 50),
    (v_card, 'extra_bed', 'all', 'night', 115, '{"meal_plan":"HB"}', 60);

  -- Sarova Mara Game Camp — Festive Season 2026/27
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sarova Mara Game Camp — Festive Season 2026/27';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sarova Mara Game Camp — Festive Season 2026/27', 'Sarova Hotels', s_sarova, 'accommodation', a_mc, 'accommodation', '2026-12-23', '2027-01-02', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_sarova, entity_id = a_mc, valid_from = '2026-12-23', valid_to = '2027-01-02', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) VALUES
    (v_card, 'single',    'all', 'room',  350, '{"meal_plan":"BB"}', 10),
    (v_card, 'sharing',   'all', 'room',  470, '{"meal_plan":"BB"}', 20),
    (v_card, 'extra_bed', 'all', 'night', 120, '{"meal_plan":"BB"}', 30),
    (v_card, 'single',    'all', 'room',  395, '{"meal_plan":"HB"}', 40),
    (v_card, 'sharing',   'all', 'room',  530, '{"meal_plan":"HB"}', 50),
    (v_card, 'extra_bed', 'all', 'night', 140, '{"meal_plan":"HB"}', 60);

  -- Sarova Lion Hill — Low Season 2026
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sarova Lion Hill — Low Season 2026';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sarova Lion Hill — Low Season 2026', 'Sarova Hotels', s_sarova, 'accommodation', a_lh, 'accommodation', '2026-01-03', '2026-06-30', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_sarova, entity_id = a_lh, valid_from = '2026-01-03', valid_to = '2026-06-30', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) VALUES
    (v_card, 'single',    'all', 'room',  140, '{"meal_plan":"BB"}', 10),
    (v_card, 'sharing',   'all', 'room',  190, '{"meal_plan":"BB"}', 20),
    (v_card, 'extra_bed', 'all', 'night',  55, '{"meal_plan":"BB"}', 30),
    (v_card, 'single',    'all', 'room',  165, '{"meal_plan":"HB"}', 40),
    (v_card, 'sharing',   'all', 'room',  220, '{"meal_plan":"HB"}', 50),
    (v_card, 'extra_bed', 'all', 'night',  65, '{"meal_plan":"HB"}', 60);

  -- Sarova Lion Hill — High Season 2026
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sarova Lion Hill — High Season 2026';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sarova Lion Hill — High Season 2026', 'Sarova Hotels', s_sarova, 'accommodation', a_lh, 'accommodation', '2026-07-01', '2026-12-22', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_sarova, entity_id = a_lh, valid_from = '2026-07-01', valid_to = '2026-12-22', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) VALUES
    (v_card, 'single',    'all', 'room',  200, '{"meal_plan":"BB"}', 10),
    (v_card, 'sharing',   'all', 'room',  270, '{"meal_plan":"BB"}', 20),
    (v_card, 'extra_bed', 'all', 'night',  75, '{"meal_plan":"BB"}', 30),
    (v_card, 'single',    'all', 'room',  230, '{"meal_plan":"HB"}', 40),
    (v_card, 'sharing',   'all', 'room',  310, '{"meal_plan":"HB"}', 50),
    (v_card, 'extra_bed', 'all', 'night',  90, '{"meal_plan":"HB"}', 60);

  -- Sarova Lion Hill — Festive Season 2026/27
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sarova Lion Hill — Festive Season 2026/27';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sarova Lion Hill — Festive Season 2026/27', 'Sarova Hotels', s_sarova, 'accommodation', a_lh, 'accommodation', '2026-12-23', '2027-01-02', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_sarova, entity_id = a_lh, valid_from = '2026-12-23', valid_to = '2027-01-02', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) VALUES
    (v_card, 'single',    'all', 'room',  260, '{"meal_plan":"BB"}', 10),
    (v_card, 'sharing',   'all', 'room',  350, '{"meal_plan":"BB"}', 20),
    (v_card, 'extra_bed', 'all', 'night',  95, '{"meal_plan":"BB"}', 30),
    (v_card, 'single',    'all', 'room',  295, '{"meal_plan":"HB"}', 40),
    (v_card, 'sharing',   'all', 'room',  400, '{"meal_plan":"HB"}', 50),
    (v_card, 'extra_bed', 'all', 'night', 110, '{"meal_plan":"HB"}', 60);

  -- Sarova Stanley — 2026 (city hotel, flat year, BB)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sarova Stanley — 2026';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sarova Stanley — 2026', 'Sarova Hotels', s_sarova, 'accommodation', a_st, 'accommodation', '2026-01-01', '2026-12-31', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_sarova, entity_id = a_st, valid_from = '2026-01-01', valid_to = '2026-12-31', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) VALUES
    (v_card, 'single',    'all', 'room',  150, '{"meal_plan":"BB"}', 10),
    (v_card, 'sharing',   'all', 'room',  200, '{"meal_plan":"BB"}', 20),
    (v_card, 'extra_bed', 'all', 'night',  60, '{"meal_plan":"BB"}', 30);

  -- Sarova Panafric — 2026 (city hotel, flat year, BB)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sarova Panafric — 2026';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sarova Panafric — 2026', 'Sarova Hotels', s_sarova, 'accommodation', a_pf, 'accommodation', '2026-01-01', '2026-12-31', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_sarova, entity_id = a_pf, valid_from = '2026-01-01', valid_to = '2026-12-31', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) VALUES
    (v_card, 'single',    'all', 'room',  110, '{"meal_plan":"BB"}', 10),
    (v_card, 'sharing',   'all', 'room',  150, '{"meal_plan":"BB"}', 20),
    (v_card, 'extra_bed', 'all', 'night',  45, '{"meal_plan":"BB"}', 30);

  RAISE NOTICE '✓ Sarova season rate cards ready';

  -- ═══════════════════════════════════════════════════════════════
  -- 6. PARK FEE RATE CARDS
  --    Two seasons per park (Jan–Jun / Jul–Dec — the workbook's
  --    "1Non-Residents" typo becomes the proper Jul–Dec rows).
  --    USD card: non_resident + resident · KES card: citizen.
  -- ═══════════════════════════════════════════════════════════════

  -- Mara Conservancy — Jan–Jun 2026 (USD)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Mara Conservancy fees — Jan–Jun 2026 (USD)';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Mara Conservancy fees — Jan–Jun 2026 (USD)', 'Mara Conservancy Authority', s_mara, 'park_fee', p_mara, 'park_fees', '2026-01-01', '2026-06-30', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_mara, entity_id = p_mara, valid_from = '2026-01-01', valid_to = '2026-06-30', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, traveller_category, residency, pricing_unit, amount, sort_order) VALUES
    (v_card, 'adult', 'non_resident', 'person', 100, 10),
    (v_card, 'child', 'non_resident', 'person',  50, 20),
    (v_card, 'adult', 'resident',     'person',  60, 30),
    (v_card, 'child', 'resident',     'person',  30, 40);

  -- Mara Conservancy — Jul–Dec 2026 (USD)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Mara Conservancy fees — Jul–Dec 2026 (USD)';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Mara Conservancy fees — Jul–Dec 2026 (USD)', 'Mara Conservancy Authority', s_mara, 'park_fee', p_mara, 'park_fees', '2026-07-01', '2026-12-31', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_mara, entity_id = p_mara, valid_from = '2026-07-01', valid_to = '2026-12-31', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, traveller_category, residency, pricing_unit, amount, sort_order) VALUES
    (v_card, 'adult', 'non_resident', 'person', 100, 10),
    (v_card, 'child', 'non_resident', 'person',  50, 20),
    (v_card, 'adult', 'resident',     'person',  60, 30),
    (v_card, 'child', 'resident',     'person',  30, 40);

  -- Mara Conservancy — 2026 citizen rates (KES)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Mara Conservancy fees — 2026 citizen (KES)';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Mara Conservancy fees — 2026 citizen (KES)', 'Mara Conservancy Authority', s_mara, 'park_fee', p_mara, 'park_fees', '2026-01-01', '2026-12-31', 'KES', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_mara, entity_id = p_mara, valid_from = '2026-01-01', valid_to = '2026-12-31', currency = 'KES', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, traveller_category, residency, pricing_unit, amount, sort_order) VALUES
    (v_card, 'adult', 'citizen', 'person', 1500, 10),
    (v_card, 'child', 'citizen', 'person',  500, 20);

  -- Ol Pejeta — Jan–Jun 2026 (USD)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Ol Pejeta fees — Jan–Jun 2026 (USD)';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Ol Pejeta fees — Jan–Jun 2026 (USD)', 'Mara Conservancy Authority', s_mara, 'park_fee', p_olp, 'park_fees', '2026-01-01', '2026-06-30', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_mara, entity_id = p_olp, valid_from = '2026-01-01', valid_to = '2026-06-30', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, traveller_category, residency, pricing_unit, amount, sort_order) VALUES
    (v_card, 'adult', 'non_resident', 'person', 90, 10),
    (v_card, 'child', 'non_resident', 'person', 45, 20),
    (v_card, 'adult', 'resident',     'person', 50, 30),
    (v_card, 'child', 'resident',     'person', 25, 40);

  -- Ol Pejeta — Jul–Dec 2026 (USD)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Ol Pejeta fees — Jul–Dec 2026 (USD)';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Ol Pejeta fees — Jul–Dec 2026 (USD)', 'Mara Conservancy Authority', s_mara, 'park_fee', p_olp, 'park_fees', '2026-07-01', '2026-12-31', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_mara, entity_id = p_olp, valid_from = '2026-07-01', valid_to = '2026-12-31', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, traveller_category, residency, pricing_unit, amount, sort_order) VALUES
    (v_card, 'adult', 'non_resident', 'person', 90, 10),
    (v_card, 'child', 'non_resident', 'person', 45, 20),
    (v_card, 'adult', 'resident',     'person', 50, 30),
    (v_card, 'child', 'resident',     'person', 25, 40);

  -- Ol Pejeta — 2026 citizen rates (KES)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Ol Pejeta fees — 2026 citizen (KES)';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Ol Pejeta fees — 2026 citizen (KES)', 'Mara Conservancy Authority', s_mara, 'park_fee', p_olp, 'park_fees', '2026-01-01', '2026-12-31', 'KES', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_mara, entity_id = p_olp, valid_from = '2026-01-01', valid_to = '2026-12-31', currency = 'KES', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, traveller_category, residency, pricing_unit, amount, sort_order) VALUES
    (v_card, 'adult', 'citizen', 'person', 1500, 10),
    (v_card, 'child', 'citizen', 'person', 1000, 20);

  -- Lake Nakuru NP — Jan–Jun 2026 (USD)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Lake Nakuru NP fees — Jan–Jun 2026 (USD)';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Lake Nakuru NP fees — Jan–Jun 2026 (USD)', 'Kenya Wildlife Service', s_kws, 'park_fee', p_nak, 'park_fees', '2026-01-01', '2026-06-30', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_kws, entity_id = p_nak, valid_from = '2026-01-01', valid_to = '2026-06-30', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, traveller_category, residency, pricing_unit, amount, sort_order) VALUES
    (v_card, 'adult', 'non_resident', 'person', 60, 10),
    (v_card, 'child', 'non_resident', 'person', 35, 20),
    (v_card, 'adult', 'resident',     'person', 35, 30),
    (v_card, 'child', 'resident',     'person', 20, 40);

  -- Lake Nakuru NP — Jul–Dec 2026 (USD)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Lake Nakuru NP fees — Jul–Dec 2026 (USD)';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Lake Nakuru NP fees — Jul–Dec 2026 (USD)', 'Kenya Wildlife Service', s_kws, 'park_fee', p_nak, 'park_fees', '2026-07-01', '2026-12-31', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_kws, entity_id = p_nak, valid_from = '2026-07-01', valid_to = '2026-12-31', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, traveller_category, residency, pricing_unit, amount, sort_order) VALUES
    (v_card, 'adult', 'non_resident', 'person', 60, 10),
    (v_card, 'child', 'non_resident', 'person', 35, 20),
    (v_card, 'adult', 'resident',     'person', 35, 30),
    (v_card, 'child', 'resident',     'person', 20, 40);

  -- Lake Nakuru NP — 2026 citizen rates (KES)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Lake Nakuru NP fees — 2026 citizen (KES)';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Lake Nakuru NP fees — 2026 citizen (KES)', 'Kenya Wildlife Service', s_kws, 'park_fee', p_nak, 'park_fees', '2026-01-01', '2026-12-31', 'KES', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_kws, entity_id = p_nak, valid_from = '2026-01-01', valid_to = '2026-12-31', currency = 'KES', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, traveller_category, residency, pricing_unit, amount, sort_order) VALUES
    (v_card, 'adult', 'citizen', 'person', 1000, 10),
    (v_card, 'child', 'citizen', 'person',  500, 20);

  -- Amboseli NP — Jan–Jun 2026 (USD)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Amboseli NP fees — Jan–Jun 2026 (USD)';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Amboseli NP fees — Jan–Jun 2026 (USD)', 'Kenya Wildlife Service', s_kws, 'park_fee', p_amb, 'park_fees', '2026-01-01', '2026-06-30', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_kws, entity_id = p_amb, valid_from = '2026-01-01', valid_to = '2026-06-30', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, traveller_category, residency, pricing_unit, amount, sort_order) VALUES
    (v_card, 'adult', 'non_resident', 'person', 60, 10),
    (v_card, 'child', 'non_resident', 'person', 35, 20),
    (v_card, 'adult', 'resident',     'person', 35, 30),
    (v_card, 'child', 'resident',     'person', 20, 40);

  -- Amboseli NP — Jul–Dec 2026 (USD)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Amboseli NP fees — Jul–Dec 2026 (USD)';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Amboseli NP fees — Jul–Dec 2026 (USD)', 'Kenya Wildlife Service', s_kws, 'park_fee', p_amb, 'park_fees', '2026-07-01', '2026-12-31', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_kws, entity_id = p_amb, valid_from = '2026-07-01', valid_to = '2026-12-31', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, traveller_category, residency, pricing_unit, amount, sort_order) VALUES
    (v_card, 'adult', 'non_resident', 'person', 60, 10),
    (v_card, 'child', 'non_resident', 'person', 35, 20),
    (v_card, 'adult', 'resident',     'person', 35, 30),
    (v_card, 'child', 'resident',     'person', 20, 40);

  -- Amboseli NP — 2026 citizen rates (KES)
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Amboseli NP fees — 2026 citizen (KES)';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Amboseli NP fees — 2026 citizen (KES)', 'Kenya Wildlife Service', s_kws, 'park_fee', p_amb, 'park_fees', '2026-01-01', '2026-12-31', 'KES', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_kws, entity_id = p_amb, valid_from = '2026-01-01', valid_to = '2026-12-31', currency = 'KES', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, traveller_category, residency, pricing_unit, amount, sort_order) VALUES
    (v_card, 'adult', 'citizen', 'person', 1000, 10),
    (v_card, 'child', 'citizen', 'person',  500, 20);

  RAISE NOTICE '✓ park fee rate cards ready';

  -- ═══════════════════════════════════════════════════════════════
  -- 7. VEHICLES + TRANSPORT DAY RATES
  --    Landcruiser 230 / Sedan 80 / Overlanding Truck 400 / Flight 500 USD/day
  -- ═══════════════════════════════════════════════════════════════

  INSERT INTO vehicles (name, type, seats, is_active)
  SELECT 'Landcruiser 4x4', 'jeep', 7, true
  WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE name = 'Landcruiser 4x4');
  SELECT id INTO veh_lc FROM vehicles WHERE name = 'Landcruiser 4x4' LIMIT 1;

  INSERT INTO vehicles (name, type, seats, is_active)
  SELECT 'Sedan', 'van', 4, true
  WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE name = 'Sedan');
  SELECT id INTO veh_sd FROM vehicles WHERE name = 'Sedan' LIMIT 1;

  INSERT INTO vehicles (name, type, seats, is_active)
  SELECT 'Overlanding Truck', 'bus', 24, true
  WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE name = 'Overlanding Truck');
  SELECT id INTO veh_tk FROM vehicles WHERE name = 'Overlanding Truck' LIMIT 1;

  INSERT INTO vehicles (name, type, seats, is_active)
  SELECT 'Charter Flight', 'plane', 12, true
  WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE name = 'Charter Flight');
  SELECT id INTO veh_fl FROM vehicles WHERE name = 'Charter Flight' LIMIT 1;

  -- Landcruiser — 2026 day rate
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Landcruiser day rate — 2026';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Landcruiser day rate — 2026', 'Vehicle Supplier A', s_va, 'vehicle', veh_lc, 'transport', '2026-01-01', '2026-12-31', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_va, entity_id = veh_lc, valid_from = '2026-01-01', valid_to = '2026-12-31', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, residency, pricing_unit, amount, sort_order)
  VALUES (v_card, 'all', 'day', 230, 10);

  -- Sedan — 2026 day rate
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Sedan day rate — 2026';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Sedan day rate — 2026', 'Vehicle Supplier B', s_vb, 'vehicle', veh_sd, 'transport', '2026-01-01', '2026-12-31', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_vb, entity_id = veh_sd, valid_from = '2026-01-01', valid_to = '2026-12-31', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, residency, pricing_unit, amount, sort_order)
  VALUES (v_card, 'all', 'day', 80, 10);

  -- Overlanding Truck — 2026 day rate
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Overlanding Truck day rate — 2026';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Overlanding Truck day rate — 2026', 'Vehicle Supplier C', s_vc, 'vehicle', veh_tk, 'transport', '2026-01-01', '2026-12-31', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_vc, entity_id = veh_tk, valid_from = '2026-01-01', valid_to = '2026-12-31', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, residency, pricing_unit, amount, sort_order)
  VALUES (v_card, 'all', 'day', 400, 10);

  -- Charter Flight — 2026 day rate
  SELECT id INTO v_card FROM supplier_rate_cards WHERE name = 'Charter Flight day rate — 2026';
  IF v_card IS NULL THEN
    INSERT INTO supplier_rate_cards (name, supplier_name, supplier_id, entity_type, entity_id, cost_category, valid_from, valid_to, currency, is_active)
    VALUES ('Charter Flight day rate — 2026', 'Vehicle Supplier D', s_vd, 'vehicle', veh_fl, 'transport', '2026-01-01', '2026-12-31', 'USD', true)
    RETURNING id INTO v_card;
  ELSE
    UPDATE supplier_rate_cards SET supplier_id = s_vd, entity_id = veh_fl, valid_from = '2026-01-01', valid_to = '2026-12-31', currency = 'USD', is_active = true WHERE id = v_card;
  END IF;
  DELETE FROM supplier_rates WHERE rate_card_id = v_card;
  INSERT INTO supplier_rates (rate_card_id, residency, pricing_unit, amount, sort_order)
  VALUES (v_card, 'all', 'day', 500, 10);

  RAISE NOTICE '✓ vehicles and transport day rates ready';
  RAISE NOTICE '✓ seed_05 complete';

END $$;
