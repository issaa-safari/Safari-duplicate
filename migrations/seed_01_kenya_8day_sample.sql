-- Seed 01: Kenya 8 Days / 7 Nights — two sample quotes (English + Arabic)
-- Run in Supabase SQL Editor AFTER group_17 and seed_02.
--
-- Creates:
--   • 2 clients  (James Thornton / EN, Mohammed Al-Rashidi / AR)
--   • 2 requests linked to those clients
--   • 2 quotes linked to the Kenya bike tour template (from seed_02)
--   • Each quote has a fully-populated version:
--       - Version A: language = 'en'  (English itinerary + Arabic)
--       - Version B: language = 'ar'  (same content, Arabic rendered by default)
--   • 8 days of itinerary per version with EN + AR titles/notes
--   • 2 travellers per version
--   • 20 price lines per version (typical Kenya bike tour pricing)

DO $$
DECLARE
  v_admin_id      uuid;
  v_client_en_id  uuid;
  v_client_ar_id  uuid;
  v_request_en_id uuid;
  v_request_ar_id uuid;
  v_quote_en_id   uuid;
  v_quote_ar_id   uuid;
  v_ver_en_id     uuid;
  v_ver_ar_id     uuid;
  v_tour_id       uuid;
  v_co_snap       jsonb := '{}'::jsonb;
  v_pol_snap      jsonb := '{}'::jsonb;
  v_markup        numeric := 25;
  v_band_id       uuid;
  v_band_snap     jsonb := '{}'::jsonb;

BEGIN

  -- ── Admin user (needed for created_by FK) ─────────────────────────────────
  SELECT id INTO v_admin_id FROM auth.users LIMIT 1;
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No auth.users row found. Log in to the app at least once first.';
  END IF;

  -- ── Tour template (from seed_02) ──────────────────────────────────────────
  SELECT id INTO v_tour_id
  FROM tours
  WHERE slug = 'kenya-8d-7n-nairobi-bike-tour'
  LIMIT 1;
  -- If seed_02 wasn't run, v_tour_id will be NULL (quotes created without template link)

  -- ── Company settings snapshot ─────────────────────────────────────────────
  SELECT
    jsonb_build_object(
      'company_name',       company_name,
      'brand_name',         brand_name,
      'email',              email,
      'phone',              phone,
      'whatsapp',           whatsapp,
      'website',            website,
      'address',            address,
      'country',            country,
      'currency_primary',   currency_primary,
      'currency_secondary', currency_secondary,
      'logo_url',           logo_url
    ),
    jsonb_build_object(
      'deposit_percent',      deposit_percent,
      'balance_due_days',     balance_due_days,
      'cancellation_61_plus', cancellation_61_plus,
      'cancellation_42_60',   cancellation_42_60,
      'cancellation_28_41',   cancellation_28_41,
      'cancellation_0_27',    cancellation_0_27
    ),
    coalesce(default_markup_percent, 25)
  INTO v_co_snap, v_pol_snap, v_markup
  FROM company_settings LIMIT 1;

  -- ── Default age band (adult) ──────────────────────────────────────────────
  SELECT id, to_jsonb(traveller_age_bands.*)
  INTO v_band_id, v_band_snap
  FROM traveller_age_bands
  WHERE is_active = true
  ORDER BY sort_order
  LIMIT 1;

  -- ── Clients ───────────────────────────────────────────────────────────────
  INSERT INTO clients (
    first_name, last_name, email, phone, country,
    preferred_language, language
  ) VALUES (
    'James', 'Thornton',
    'james.thornton.sample@example.com', '+447700900123', 'United Kingdom',
    'en', 'en'
  ) ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
  RETURNING id INTO v_client_en_id;

  INSERT INTO clients (
    first_name, last_name, email, phone, country,
    preferred_language, language
  ) VALUES (
    'محمد', 'الرشيدي',
    'mohammed.alrashidi.sample@example.com', '+966501234567', 'Saudi Arabia',
    'ar', 'ar'
  ) ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
  RETURNING id INTO v_client_ar_id;

  -- ── Requests ──────────────────────────────────────────────────────────────
  INSERT INTO requests (
    client_id, stage, source, travelers_adults,
    preferred_start_date, client_question
  ) VALUES (
    v_client_en_id, 'working_on', 'direct', 2,
    '2025-09-15',
    'Interested in the Kenya bike adventure — 8 days covering Nairobi, Naivasha, Nakuru, Eldoret, and back.'
  ) RETURNING id INTO v_request_en_id;

  INSERT INTO requests (
    client_id, stage, source, travelers_adults,
    preferred_start_date, client_question
  ) VALUES (
    v_client_ar_id, 'working_on', 'whatsapp', 2,
    '2025-09-15',
    'مهتم بجولة الدراجة في كينيا - 8 أيام تشمل نيروبي ونايفاشا وناكورو وإلدوريت والعودة.'
  ) RETURNING id INTO v_request_ar_id;

  -- ── Quotes ────────────────────────────────────────────────────────────────
  INSERT INTO quotes (client_id, request_id, tour_id, mode, status, created_by)
  VALUES (v_client_en_id, v_request_en_id, v_tour_id, 'custom', 'draft', v_admin_id)
  RETURNING id INTO v_quote_en_id;

  INSERT INTO quotes (client_id, request_id, tour_id, mode, status, created_by)
  VALUES (v_client_ar_id, v_request_ar_id, v_tour_id, 'custom', 'draft', v_admin_id)
  RETURNING id INTO v_quote_ar_id;

  -- ── Quote versions ────────────────────────────────────────────────────────
  INSERT INTO quote_versions (
    quote_id, version_number, status, language, title,
    travel_start_date, travel_end_date, valid_until,
    default_markup_percent,
    client_snapshot, company_snapshot, policy_snapshot, created_by
  ) VALUES (
    v_quote_en_id, 1, 'draft', 'en',
    'Kenya 8 Days / 7 Nights — Nairobi to Nairobi Bike Tour',
    '2025-09-15', '2025-09-22', current_date + 14,
    v_markup,
    jsonb_build_object('first_name','James','last_name','Thornton',
      'email','james.thornton.sample@example.com','phone','+447700900123',
      'country','United Kingdom','language','en'),
    v_co_snap, v_pol_snap, v_admin_id
  ) RETURNING id INTO v_ver_en_id;

  INSERT INTO quote_versions (
    quote_id, version_number, status, language, title,
    travel_start_date, travel_end_date, valid_until,
    default_markup_percent,
    client_snapshot, company_snapshot, policy_snapshot, created_by
  ) VALUES (
    v_quote_ar_id, 1, 'draft', 'ar',
    'كينيا 8 أيام / 7 ليالٍ — جولة دراجة نيروبي إلى نيروبي',
    '2025-09-15', '2025-09-22', current_date + 14,
    v_markup,
    jsonb_build_object('first_name','محمد','last_name','الرشيدي',
      'email','mohammed.alrashidi.sample@example.com','phone','+966501234567',
      'country','Saudi Arabia','language','ar'),
    v_co_snap, v_pol_snap, v_admin_id
  ) RETURNING id INTO v_ver_ar_id;

  -- ══════════════════════════════════════════════════════════════════════════
  -- ITINERARY — 8 days × 2 versions
  -- ══════════════════════════════════════════════════════════════════════════

  -- ── Day 1 ─────────────────────────────────────────────────────────────────
  INSERT INTO quote_days (quote_version_id, day_number, day_date, sort_order,
    title, description_en, client_notes,
    title_ar, client_notes_ar, meals, destination_snapshot)
  VALUES
  (v_ver_en_id, 1, '2025-09-15', 0,
   'Arrival in Nairobi — Welcome to Kenya',
   'Arrive at Jomo Kenyatta International Airport and transfer to your hotel. Meet your tour captain who will guide the entire trip and brief the full route plan. Suggested activity: explore the hotel surroundings or visit a local café for dinner. Rest up for the adventure ahead.',
   'Transfer from airport arranged. Hotel: Hillsgate Experience Hotel.',
   'الوصول إلى نيروبي — مرحباً بكم في كينيا',
   'التوصيل من المطار مرتب. الفندق: فندق هيلزغيت إكسبيرينس.',
   '{}', '{}'),
  (v_ver_ar_id, 1, '2025-09-15', 0,
   'Arrival in Nairobi — Welcome to Kenya',
   'Arrive at Jomo Kenyatta International Airport and transfer to your hotel. Meet your tour captain who will guide the entire trip and brief the full route plan. Suggested activity: explore the hotel surroundings or visit a local café for dinner. Rest up for the adventure ahead.',
   'Transfer from airport arranged. Hotel: Hillsgate Experience Hotel.',
   'الوصول إلى نيروبي — مرحباً بكم في كينيا',
   'التوصيل من المطار مرتب. الفندق: فندق هيلزغيت إكسبيرينس.',
   '{}', '{}');

  -- ── Day 2 ─────────────────────────────────────────────────────────────────
  INSERT INTO quote_days (quote_version_id, day_number, day_date, sort_order,
    title, description_en, client_notes,
    title_ar, client_notes_ar, meals, destination_snapshot)
  VALUES
  (v_ver_en_id, 2, '2025-09-16', 1,
   'Nairobi → Lake Naivasha | 140 KM',
   'Begin pedalling out of Nairobi through the Rift Valley escarpment. Stop at Forest Adventure Centre (65 KM) for rope climbing and suspension bridges. Continue to Sanctuary Farm for giraffes, zebras and birdlife, with optional boat tours on the lake. Overnight at Lake Oloiden Camp. Evening: sunset boat cruise on Lake Naivasha.',
   'Bring sunscreen and a light jacket for the Rift Valley descent. Optional: sunset boat cruise $15/person.',
   'نيروبي → بحيرة نايفاشا | 140 كم',
   'أحضر واقي الشمس وسترة خفيفة للنزول إلى وادي الصدع. اختياري: جولة قارب عند الغروب بـ 15 دولاراً للشخص.',
   ARRAY['breakfast','lunch','dinner'], '{}'),
  (v_ver_ar_id, 2, '2025-09-16', 1,
   'Nairobi → Lake Naivasha | 140 KM',
   'Begin pedalling out of Nairobi through the Rift Valley escarpment. Stop at Forest Adventure Centre (65 KM) for rope climbing and suspension bridges. Continue to Sanctuary Farm for giraffes, zebras and birdlife, with optional boat tours on the lake. Overnight at Lake Oloiden Camp. Evening: sunset boat cruise on Lake Naivasha.',
   'Bring sunscreen and a light jacket for the Rift Valley descent. Optional: sunset boat cruise $15/person.',
   'نيروبي → بحيرة نايفاشا | 140 كم',
   'أحضر واقي الشمس وسترة خفيفة للنزول إلى وادي الصدع. اختياري: جولة قارب عند الغروب بـ 15 دولاراً للشخص.',
   ARRAY['breakfast','lunch','dinner'], '{}');

  -- ── Day 3 ─────────────────────────────────────────────────────────────────
  INSERT INTO quote_days (quote_version_id, day_number, day_date, sort_order,
    title, description_en, client_notes,
    title_ar, client_notes_ar, meals, destination_snapshot)
  VALUES
  (v_ver_en_id, 3, '2025-09-17', 2,
   'Lake Naivasha → Nakuru | 190 KM',
   'Morning in Hells Gate National Park (65 KM): spot giraffes, zebras and abundant birdlife; optional nature walks through the dramatic gorge. Continue climbing towards Nakuru with scenic hill views along the Great Rift Valley. Overnight at Ivory Park Hotel.',
   'Hells Gate entry fee included. Walking shoes recommended for the gorge walk.',
   'بحيرة نايفاشا → ناكورو | 190 كم',
   'رسوم دخول هيلز غيت مشمولة. يُوصى بأحذية المشي لجولة الممر الصخري.',
   ARRAY['breakfast','lunch','dinner'], '{}'),
  (v_ver_ar_id, 3, '2025-09-17', 2,
   'Lake Naivasha → Nakuru | 190 KM',
   'Morning in Hells Gate National Park (65 KM): spot giraffes, zebras and abundant birdlife; optional nature walks through the dramatic gorge. Continue climbing towards Nakuru with scenic hill views along the Great Rift Valley. Overnight at Ivory Park Hotel.',
   'Hells Gate entry fee included. Walking shoes recommended for the gorge walk.',
   'بحيرة نايفاشا → ناكورو | 190 كم',
   'رسوم دخول هيلز غيت مشمولة. يُوصى بأحذية المشي لجولة الممر الصخري.',
   ARRAY['breakfast','lunch','dinner'], '{}');

  -- ── Day 4 ─────────────────────────────────────────────────────────────────
  INSERT INTO quote_days (quote_version_id, day_number, day_date, sort_order,
    title, description_en, client_notes,
    title_ar, client_notes_ar, meals, destination_snapshot)
  VALUES
  (v_ver_en_id, 4, '2025-09-18', 3,
   'Nakuru → Eldoret via Kericho Tea Farms | 260 KM',
   'Ride towards Kericho tea country (110 KM): guided walk through rolling green tea fields, learn the production process and enjoy a tasting. Continue to Eldoret (150 KM), the home of Kenyan athletics. Evening: explore the city and sample local cuisine. Overnight at Boma Inn Hotel.',
   'Tea farm guided walk and tasting included. Today is the longest day — pace yourself.',
   'ناكورو → إلدوريت عبر مزارع شاي كيريتشو | 260 كم',
   'جولة مزرعة الشاي والتذوق مشمولة. هذا هو اليوم الأطول — اهتم بوتيرتك.',
   ARRAY['breakfast','lunch','dinner'], '{}'),
  (v_ver_ar_id, 4, '2025-09-18', 3,
   'Nakuru → Eldoret via Kericho Tea Farms | 260 KM',
   'Ride towards Kericho tea country (110 KM): guided walk through rolling green tea fields, learn the production process and enjoy a tasting. Continue to Eldoret (150 KM), the home of Kenyan athletics. Evening: explore the city and sample local cuisine. Overnight at Boma Inn Hotel.',
   'Tea farm guided walk and tasting included. Today is the longest day — pace yourself.',
   'ناكورو → إلدوريت عبر مزارع شاي كيريتشو | 260 كم',
   'جولة مزرعة الشاي والتذوق مشمولة. هذا هو اليوم الأطول — اهتم بوتيرتك.',
   ARRAY['breakfast','lunch','dinner'], '{}');

  -- ── Day 5 ─────────────────────────────────────────────────────────────────
  INSERT INTO quote_days (quote_version_id, day_number, day_date, sort_order,
    title, description_en, client_notes,
    title_ar, client_notes_ar, meals, destination_snapshot)
  VALUES
  (v_ver_en_id, 5, '2025-09-19', 4,
   'Eldoret → Nyahururu via Iten & Marigat | 220 KM',
   'Ride to Iten (40 KM) — Kenya''s "Home of Champions" where elite athletes train on mountain roads — enjoy panoramic valley views and meet the local running community. Continue to Marigat near Lake Bogoria (90 KM) for hot springs and optional flamingo boat tours. Stop at the spectacular Thomson''s Falls in Nyahururu. Overnight at Panari Resort.',
   'Iten is at 2,400m altitude — take it easy on the climb. Flamingo viewing best in the morning.',
   'إلدوريت → نياهورورو عبر إيتن وماريغات | 220 كم',
   'إيتن على ارتفاع 2400 متر — خذها بتأنٍّ في التسلق. مشاهدة الطيور الوردية أفضل في الصباح.',
   ARRAY['breakfast','lunch','dinner'], '{}'),
  (v_ver_ar_id, 5, '2025-09-19', 4,
   'Eldoret → Nyahururu via Iten & Marigat | 220 KM',
   'Ride to Iten (40 KM) — Kenya''s "Home of Champions" where elite athletes train on mountain roads — enjoy panoramic valley views and meet the local running community. Continue to Marigat near Lake Bogoria (90 KM) for hot springs and optional flamingo boat tours. Stop at the spectacular Thomson''s Falls in Nyahururu. Overnight at Panari Resort.',
   'Iten is at 2,400m altitude — take it easy on the climb. Flamingo viewing best in the morning.',
   'إلدوريت → نياهورورو عبر إيتن وماريغات | 220 كم',
   'إيتن على ارتفاع 2400 متر — خذها بتأنٍّ في التسلق. مشاهدة الطيور الوردية أفضل في الصباح.',
   ARRAY['breakfast','lunch','dinner'], '{}');

  -- ── Day 6 ─────────────────────────────────────────────────────────────────
  INSERT INTO quote_days (quote_version_id, day_number, day_date, sort_order,
    title, description_en, client_notes,
    title_ar, client_notes_ar, meals, destination_snapshot)
  VALUES
  (v_ver_en_id, 6, '2025-09-20', 5,
   'Nyahururu → Lagoon Resort via Castle Forest | 200 KM',
   'Morning departure to Castle Forest Lodge on the slopes of Mt Kenya (170 KM) for forest exploration and mountain views with possible wildlife sightings including colobus monkeys. Continue to The Lagoon Resort in Koitobus (30 KM) for a relaxing evening by the lake. Overnight at The Lagoon Resort.',
   'Dress warmly — Castle Forest is at high altitude and can be cool. Great photography opportunities.',
   'نياهورورو → منتجع لاقون عبر غابة كاسل | 200 كم',
   'ارتدِ ملابس دافئة — غابة كاسل على ارتفاع عالٍ وقد تكون باردة. فرص ممتازة للتصوير.',
   ARRAY['breakfast','lunch','dinner'], '{}'),
  (v_ver_ar_id, 6, '2025-09-20', 5,
   'Nyahururu → Lagoon Resort via Castle Forest | 200 KM',
   'Morning departure to Castle Forest Lodge on the slopes of Mt Kenya (170 KM) for forest exploration and mountain views with possible wildlife sightings including colobus monkeys. Continue to The Lagoon Resort in Koitobus (30 KM) for a relaxing evening by the lake. Overnight at The Lagoon Resort.',
   'Dress warmly — Castle Forest is at high altitude and can be cool. Great photography opportunities.',
   'نياهورورو → منتجع لاقون عبر غابة كاسل | 200 كم',
   'ارتدِ ملابس دافئة — غابة كاسل على ارتفاع عالٍ وقد تكون باردة. فرص ممتازة للتصوير.',
   ARRAY['breakfast','lunch','dinner'], '{}');

  -- ── Day 7 ─────────────────────────────────────────────────────────────────
  INSERT INTO quote_days (quote_version_id, day_number, day_date, sort_order,
    title, description_en, client_notes,
    title_ar, client_notes_ar, meals, destination_snapshot)
  VALUES
  (v_ver_en_id, 7, '2025-09-21', 6,
   'Lagoon Resort → Nairobi via Tea & Coffee Farms | 190 KM',
   'Visit Kiambethu Tea Farm (140 KM): guided plantation tour through Limuru''s lush tea fields with tea tasting and sweeping hill views. Descend to Nairobi (50 KM) and check in for the final night. Overnight at Hillsgate Experience Hotel.',
   'Last big day on the bike — savour every moment. Celebration dinner in Nairobi tonight.',
   'منتجع لاقون → نيروبي عبر مزارع الشاي والقهوة | 190 كم',
   'آخر يوم كبير على الدراجة — استمتع بكل لحظة. عشاء احتفالي في نيروبي الليلة.',
   ARRAY['breakfast','lunch'], '{}'),
  (v_ver_ar_id, 7, '2025-09-21', 6,
   'Lagoon Resort → Nairobi via Tea & Coffee Farms | 190 KM',
   'Visit Kiambethu Tea Farm (140 KM): guided plantation tour through Limuru''s lush tea fields with tea tasting and sweeping hill views. Descend to Nairobi (50 KM) and check in for the final night. Overnight at Hillsgate Experience Hotel.',
   'Last big day on the bike — savour every moment. Celebration dinner in Nairobi tonight.',
   'منتجع لاقون → نيروبي عبر مزارع الشاي والقهوة | 190 كم',
   'آخر يوم كبير على الدراجة — استمتع بكل لحظة. عشاء احتفالي في نيروبي الليلة.',
   ARRAY['breakfast','lunch'], '{}');

  -- ── Day 8 ─────────────────────────────────────────────────────────────────
  INSERT INTO quote_days (quote_version_id, day_number, day_date, sort_order,
    title, description_en, client_notes,
    title_ar, client_notes_ar, meals, destination_snapshot)
  VALUES
  (v_ver_en_id, 8, '2025-09-22', 7,
   'Nairobi — Departure',
   'Transfer to Jomo Kenyatta International Airport as per your individual departure plans. End of the Kenya bike adventure. Please confirm your flight details in advance so airport transfers can be arranged. We hope to ride with you again!',
   'Please share your flight details at least 48 hours before departure for transfer coordination.',
   'نيروبي — المغادرة',
   'يُرجى مشاركة تفاصيل رحلتك قبل 48 ساعة على الأقل من المغادرة لتنسيق التوصيل.',
   '{}', '{}'),
  (v_ver_ar_id, 8, '2025-09-22', 7,
   'Nairobi — Departure',
   'Transfer to Jomo Kenyatta International Airport as per your individual departure plans. End of the Kenya bike adventure. Please confirm your flight details in advance so airport transfers can be arranged. We hope to ride with you again!',
   'Please share your flight details at least 48 hours before departure for transfer coordination.',
   'نيروبي — المغادرة',
   'يُرجى مشاركة تفاصيل رحلتك قبل 48 ساعة على الأقل من المغادرة لتنسيق التوصيل.',
   '{}', '{}');

  -- ══════════════════════════════════════════════════════════════════════════
  -- TRAVELLERS — 2 adults per version
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO quote_travellers (
    quote_version_id, display_name, traveller_category,
    room_category, is_paying, is_complimentary, sort_order,
    age_band_id, age_band_snapshot
  ) VALUES
  (v_ver_en_id, 'Traveller 1', coalesce((SELECT code FROM traveller_age_bands WHERE is_active ORDER BY sort_order LIMIT 1), 'adult'),
   'sharing', true, false, 0, v_band_id, v_band_snap),
  (v_ver_en_id, 'Traveller 2', coalesce((SELECT code FROM traveller_age_bands WHERE is_active ORDER BY sort_order LIMIT 1), 'adult'),
   'sharing', true, false, 1, v_band_id, v_band_snap),
  (v_ver_ar_id, 'Traveller 1', coalesce((SELECT code FROM traveller_age_bands WHERE is_active ORDER BY sort_order LIMIT 1), 'adult'),
   'sharing', true, false, 0, v_band_id, v_band_snap),
  (v_ver_ar_id, 'Traveller 2', coalesce((SELECT code FROM traveller_age_bands WHERE is_active ORDER BY sort_order LIMIT 1), 'adult'),
   'sharing', true, false, 1, v_band_id, v_band_snap);

  -- ══════════════════════════════════════════════════════════════════════════
  -- PRICE LINES — typical Kenya 8-day bike tour (USD)
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO quote_price_lines (
    quote_version_id, description, cost_category, pricing_unit,
    quantity, unit_cost_usd, markup_percent_override,
    total_cost_usd, total_selling_usd, is_optional, sort_order
  )
  SELECT
    ver_id,
    description,
    cost_category,
    pricing_unit,
    quantity,
    unit_cost_usd,
    v_markup,
    quantity * unit_cost_usd,
    round(quantity * unit_cost_usd * (1 + v_markup / 100.0), 2),
    is_optional,
    sort_order
  FROM
    (VALUES (v_ver_en_id),(v_ver_ar_id)) AS v(ver_id),
    (VALUES
      ('Hillsgate Experience Hotel, Nairobi — 2 nights (Day 1 & 7)',   'accommodation', 'night',   2::numeric,  80.00::numeric, false,  0),
      ('Lake Oloiden Camp, Naivasha — 1 night (Day 2)',               'accommodation', 'night',   1::numeric,  65.00::numeric, false,  1),
      ('Ivory Park Hotel, Nakuru — 1 night (Day 3)',                  'accommodation', 'night',   1::numeric,  70.00::numeric, false,  2),
      ('Boma Inn Hotel, Eldoret — 1 night (Day 4)',                   'accommodation', 'night',   1::numeric,  75.00::numeric, false,  3),
      ('Panari Resort, Nyahururu — 1 night (Day 5)',                  'accommodation', 'night',   1::numeric,  90.00::numeric, false,  4),
      ('The Lagoon Resort, Koitobus — 1 night (Day 6)',               'accommodation', 'night',   1::numeric, 100.00::numeric, false,  5),
      ('Quality mountain bike hire (8 days)',                         'transport',     'day',     8::numeric,  25.00::numeric, false,  6),
      ('Support 4x4 vehicle with driver (8 days)',                    'transport',     'day',     8::numeric,  70.00::numeric, false,  7),
      ('Experienced tour captain / guide (8 days)',                   'staff',         'day',     8::numeric,  60.00::numeric, false,  8),
      ('Forest Adventure Centre — rope course & activities (×2 pax)', 'activities',    'person',  2::numeric,  20.00::numeric, false,  9),
      ('Sanctuary Farm — wildlife & boat tour entry (×2 pax)',        'activities',    'person',  2::numeric,  15.00::numeric, false, 10),
      ('Hells Gate National Park fees (×2 pax)',                      'park_fees',     'person',  2::numeric,  35.00::numeric, false, 11),
      ('Lake Nakuru National Park fees (×2 pax)',                     'park_fees',     'person',  2::numeric,  60.00::numeric, false, 12),
      ('Kericho Tea Farm guided tour (×2 pax)',                       'activities',    'person',  2::numeric,  10.00::numeric, false, 13),
      ('Thomson''s Falls entry (×2 pax)',                             'activities',    'person',  2::numeric,   5.00::numeric, false, 14),
      ('Castle Forest Lodge nature walk (×2 pax)',                    'activities',    'person',  2::numeric,  12.00::numeric, false, 15),
      ('Kiambethu Tea Farm guided tour (×2 pax)',                     'activities',    'person',  2::numeric,  15.00::numeric, false, 16),
      ('All meals — breakfast daily, lunch & dinner Days 2–7 (×2)',   'meals',         'person',  2::numeric, 180.00::numeric, false, 17),
      ('Airport transfers — arrival & departure (×2 pax)',            'transport',     'trip',    2::numeric,  25.00::numeric, false, 18),
      ('Travel insurance (per person — recommended)',                 'other',         'person',  2::numeric,  45.00::numeric, true,  19)
    ) AS p(description, cost_category, pricing_unit, quantity, unit_cost_usd, is_optional, sort_order);

  RAISE NOTICE '✓ Seed complete';
  RAISE NOTICE '  English quote  → /admin/quotes/%', v_quote_en_id;
  RAISE NOTICE '  Arabic quote   → /admin/quotes/%', v_quote_ar_id;

END;
$$;
