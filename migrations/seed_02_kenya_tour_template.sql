-- Seed 02: Kenya 8 Days / 7 Nights Bike Tour — Tour Template
-- Run in Supabase SQL Editor AFTER groups 10-17.
-- Run BEFORE seed_01 (seed_01 optionally references this template).
--
-- Creates ONE bilingual tour template with 8 tour_days.
-- Pre-fills English and Arabic titles + English day descriptions.
-- Linked to quotes via: New Quote → Tour Template → "Pre-fill from tour template".

DO $$
DECLARE
  v_tour_id uuid;
BEGIN

  INSERT INTO tours (
    title_en, type, slug, status, duration_days, duration_nights
  ) VALUES (
    'Kenya 8 Days / 7 Nights — Nairobi to Nairobi Bike Tour',
    'bike',
    'kenya-8d-7n-nairobi-bike-tour',
    'active',
    8,
    7
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_en = EXCLUDED.title_en,
    status   = 'active'
  RETURNING id INTO v_tour_id;

  -- Remove existing days so re-running is safe
  DELETE FROM tour_days WHERE tour_id = v_tour_id;

  INSERT INTO tour_days (
    tour_id, day_number, day_number_end,
    title_en, title_ar, description_en,
    meal_breakfast, meal_lunch, meal_dinner, distance_km
  ) VALUES

  (v_tour_id, 1, NULL,
   'Arrival in Nairobi — Welcome to Kenya',
   'الوصول إلى نيروبي — مرحباً بكم في كينيا',
   'Arrive at Jomo Kenyatta International Airport and transfer to your hotel. Meet your tour captain who will guide the entire trip and brief the full route plan. Suggested activity: explore the hotel surroundings or visit a local café for dinner. Rest up for the adventure ahead.',
   false, false, false, NULL),

  (v_tour_id, 2, NULL,
   'Nairobi → Lake Naivasha | 140 KM',
   'نيروبي → بحيرة نايفاشا | 140 كم',
   'Begin pedalling out of Nairobi through the Rift Valley escarpment. Stop at Forest Adventure Centre (65 KM) for rope climbing and suspension bridges. Continue to Sanctuary Farm for giraffes, zebras and birdlife, with optional boat tours on the lake. Overnight at Lake Oloiden Camp. Evening: sunset boat cruise on Lake Naivasha.',
   true, true, true, 140),

  (v_tour_id, 3, NULL,
   'Lake Naivasha → Nakuru | 190 KM',
   'بحيرة نايفاشا → ناكورو | 190 كم',
   'Morning in Hells Gate National Park (65 KM): spot giraffes, zebras and abundant birdlife; optional nature walks through the dramatic gorge. Continue climbing towards Nakuru with scenic hill views along the Great Rift Valley. Overnight at Ivory Park Hotel.',
   true, true, true, 190),

  (v_tour_id, 4, NULL,
   'Nakuru → Eldoret via Kericho Tea Farms | 260 KM',
   'ناكورو → إلدوريت عبر مزارع شاي كيريتشو | 260 كم',
   'Ride towards Kericho tea country (110 KM): guided walk through rolling green tea fields, learn the production process and enjoy a tasting. Continue to Eldoret (150 KM), the home of Kenyan athletics. Evening: explore the city and sample local cuisine. Overnight at Boma Inn Hotel.',
   true, true, true, 260),

  (v_tour_id, 5, NULL,
   'Eldoret → Nyahururu via Iten & Marigat | 220 KM',
   'إلدوريت → نياهورورو عبر إيتن وماريغات | 220 كم',
   'Ride to Iten (40 KM) — Kenya''s "Home of Champions" where elite athletes train on mountain roads — enjoy panoramic valley views and meet the local running community. Continue to Marigat near Lake Bogoria (90 KM) for hot springs and optional flamingo boat tours. Stop at the spectacular Thomson''s Falls in Nyahururu. Overnight at Panari Resort.',
   true, true, true, 220),

  (v_tour_id, 6, NULL,
   'Nyahururu → Lagoon Resort via Castle Forest | 200 KM',
   'نياهورورو → منتجع لاقون عبر غابة كاسل | 200 كم',
   'Morning departure to Castle Forest Lodge on the slopes of Mt Kenya (170 KM) for forest exploration and mountain views with possible wildlife sightings including colobus monkeys. Continue to The Lagoon Resort in Koitobus (30 KM) for a relaxing evening by the lake. Overnight at The Lagoon Resort.',
   true, true, true, 200),

  (v_tour_id, 7, NULL,
   'Lagoon Resort → Nairobi via Tea & Coffee Farms | 190 KM',
   'منتجع لاقون → نيروبي عبر مزارع الشاي والقهوة | 190 كم',
   'Visit Kiambethu Tea Farm (140 KM): guided plantation tour through Limuru''s lush tea fields with tea tasting and sweeping hill views. Descend to Nairobi (50 KM) and check in for the final night. Overnight at Hillsgate Experience Hotel.',
   true, true, false, 190),

  (v_tour_id, 8, NULL,
   'Nairobi — Departure',
   'نيروبي — المغادرة',
   'Transfer to Jomo Kenyatta International Airport as per your individual departure plans. End of the Kenya bike adventure. Please confirm your flight details in advance so airport transfers can be arranged. We hope to ride with you again!',
   false, false, false, NULL);

  RAISE NOTICE '✓ Tour template created: Kenya 8 Days / 7 Nights';
  RAISE NOTICE '  Tour ID: %', v_tour_id;
  RAISE NOTICE '  View at: /admin/tours/%', v_tour_id;

END;
$$;
