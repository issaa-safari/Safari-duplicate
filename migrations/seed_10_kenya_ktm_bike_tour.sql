-- Seed 10: Kenya KTM 390 Adventure Bike Tour — Tour + Itinerary + Departures
--
-- New standalone tour (distinct from the seed_02 "Nairobi to Nairobi Bike Tour"
-- template — different route: Sanctuary Farm/Lake Elementaita, Nandi Hills,
-- Iten, Kabarnet, Nanyuki + Ol Pejeta Conservancy, Castle Forest waterfalls).
-- Sourced from the operator's Arabic tour brief (رحلة كينيا بالدراجات).
--
-- 8 days / 7 nights, Nairobi round-trip, ridden on the KTM 390 Adventure 2026.
-- $1,890 pp twin/double share, $2,150 pp single — noted in overview_en/ar
-- since the schema has one base_price_usd (double/sharing) and departures
-- carry one price_usd each; there is no separate single-supplement column.
-- $300 refundable motorbike security deposit maps to
-- departures.security_deposit_usd (group_82).
--
-- Run in Supabase SQL Editor after all migration groups are applied
-- (needs tours/tour_days from group_00 and departures.security_deposit_usd
-- from group_82). Idempotent: tour upserts on slug; tour_days are replaced
-- for this tour_id; departures are only inserted if a departure with the
-- same tour_id + start_date doesn't already exist (never deleted, so
-- re-running never touches real bookings).

DO $$
DECLARE
  v_tour_id uuid;
BEGIN

  -- ── Tour ──────────────────────────────────────────────────────────────────
  INSERT INTO tours (
    title_en, title_ar, subtitle_en, subtitle_ar,
    overview_en, overview_ar,
    type, status, duration_days, duration_nights,
    highlights_en, highlights_ar,
    included_en, included_ar,
    excluded_en, excluded_ar,
    terrain, vehicle, accommodation_level, max_group_size,
    base_price_usd, show_on_website, featured, is_active,
    countries_visited, start_destination, end_destination,
    slug
  ) VALUES (
    'Kenya Bike Tour — KTM 390 Adventure 2026 (8 Days / 7 Nights)',
    'رحلة كينيا بالدراجات — KTM 390 Adventure 2026 (٨ أيام / ٧ ليالٍ)',
    'Nairobi to Nairobi — Rift Valley, Lake Naivasha, Kericho Tea Farms, Iten & Ol Pejeta Safari',
    'من نيروبي إلى نيروبي — الصدع العظيم، بحيرة نيفاشا، مزارع شاي كيريتشو، إيتن وسفاري أول بيجيتا',
    'An 8-day, 7-night motorbike adventure starting and ending in Nairobi: the Great Rift Valley escarpment, a boat ride and walking safari at Lake Naivasha''s Sanctuary Farm, overnight at Lake Elementaita, the tea highlands of Kericho and Nandi Hills, the famous "Home of Champions" viewpoint at Iten with a Rift Valley descent via Kabarnet, an Ol Pejeta Conservancy game drive from Nanyuki, and the Castle Forest waterfalls on the slopes of Mt Kenya before returning to Nairobi via the Maasai Market. Ridden on the KTM 390 Adventure (2026). Priced at $1,890 per person sharing a twin/double room, or $2,150 per person for a single room. Arrival and departure transfers from Nairobi airport are included.',
    'مغامرة على الدراجات لمدة 8 أيام و7 ليالٍ تبدأ وتنتهي في نيروبي: صدع وادي الشرق العظيم، ركوب قارب ومشي وسط الحياة البرية في محمية المزرعة عند بحيرة نيفاشا، المبيت في إلمنتايتا، مرتفعات الشاي في كيريتشو وناندي هيلز، مطل إيتن الشهير "موطن الأبطال" مع نزول الصدع عبر كاباارنت، سفاري في محمية أول بيجيتا من نانيوكي، وشلالات كاسل فورست على أطراف جبل كينيا قبل العودة إلى نيروبي عبر سوق المساي. على دراجة KTM 390 Adventure موديل 2026. السعر 1,890 دولاراً للشخص في غرفة مزدوجة، أو 2,150 دولاراً للشخص في غرفة خاصة. يشمل الاستقبال والتوصيل من وإلى مطار نيروبي.',
    'bike', 'active', 8, 7,
    array[
      'AFEW Giraffe Centre, Nairobi',
      'Great Rift Valley viewpoint',
      'Sanctuary Farm walking safari — giraffes, gazelles, zebras, waterbuck & buffalo',
      'Boat ride on Lake Naivasha',
      'Kericho tea plantations & Nandi Hills',
      'Iten — the famous "Home of Champions" viewpoint',
      'Ol Pejeta Conservancy game drive — elephants, lions, rhino',
      'Castle Forest waterfalls on the slopes of Mt Kenya',
      'Nairobi Maasai Market'
    ],
    array[
      'مركز الزرافات في نيروبي',
      'مطل الصدع العظيم',
      'مشي وسط الحياة البرية في محمية المزرعة — زرافات، غزلان، حمير وحشية، ضبي الماء والجواميس',
      'ركوب قارب في بحيرة نيفاشا',
      'مزارع شاي كيريتشو وناندي هيلز',
      'مطل إيتن الشهير "موطن الأبطال"',
      'سفاري في محمية أول بيجيتا — أفيال، أسود، وحيد القرن',
      'شلالات كاسل فورست على أطراف جبل كينيا',
      'سوق المساي الشعبي في نيروبي'
    ],
    array[
      'KTM 390 Adventure 2026 motorbike',
      'Comprehensive medical/health insurance',
      'Accommodation for 7 nights',
      'Daily breakfast and dinner',
      'Park entrance fees with a safari vehicle in one reserve (Ol Pejeta)',
      'Waterfall entrance fees (Castle Forest)',
      'Experienced tour leader/guide',
      'Airport pickup and drop-off in Nairobi',
      'Support/tracking vehicle when the group is larger than 4 riders'
    ],
    array[
      'دراجة KTM 390 Adventure موديل 2026',
      'تأمين صحي شامل',
      'السكن لمدة 7 ليالٍ',
      'الفطور والعشاء يومياً',
      'رسوم دخول المحميات مع سيارة سفاري في محمية واحدة (أول بيجيتا)',
      'رسوم دخول الشلالات (كاسل فورست)',
      'قائد رحلة متمرس',
      'الاستقبال من المطار والتوصيل إليه في نيروبي',
      'سيارة تتبع/دعم إذا زاد عدد المشاركين عن 4 أشخاص'
    ],
    array[
      'International flight ticket',
      'Kenya visa (assistance available for $50)',
      'Fuel/petrol for the motorbike',
      'Lunch',
      'Personal expenses',
      'Additional/optional activities',
      '$300 refundable motorbike security deposit (returned at the end of the tour)'
    ],
    array[
      'تذكرة الطيران الدولية',
      'تأشيرة كينيا (نساعد في استخراجها مقابل 50 دولاراً)',
      'وقود/بترول الدراجة',
      'وجبة الغداء',
      'المصاريف الشخصية',
      'الفعاليات الإضافية الاختيارية',
      'تأمين الدراجة 300 دولار قابل للاسترداد بنهاية الرحلة'
    ],
    'highland tarmac & dirt tracks', 'KTM 390 Adventure 2026', 'midrange', 12,
    1890, true, false, true,
    'Kenya', 'Nairobi', 'Nairobi',
    'kenya-8d-ktm-390-adventure-bike-tour'
  )
  ON CONFLICT (slug) DO UPDATE SET
    title_en       = EXCLUDED.title_en,
    title_ar       = EXCLUDED.title_ar,
    overview_en    = EXCLUDED.overview_en,
    overview_ar    = EXCLUDED.overview_ar,
    highlights_en  = EXCLUDED.highlights_en,
    highlights_ar  = EXCLUDED.highlights_ar,
    included_en    = EXCLUDED.included_en,
    included_ar    = EXCLUDED.included_ar,
    excluded_en    = EXCLUDED.excluded_en,
    excluded_ar    = EXCLUDED.excluded_ar,
    base_price_usd = EXCLUDED.base_price_usd,
    status         = 'active'
  RETURNING id INTO v_tour_id;

  -- ── Itinerary — remove existing days so re-running is safe ─────────────────
  DELETE FROM tour_days WHERE tour_id = v_tour_id;

  INSERT INTO tour_days (
    tour_id, day_number, title_en, title_ar, description_en,
    meal_breakfast, meal_lunch, meal_dinner
  ) VALUES

  (v_tour_id, 1,
   'Arrival in Nairobi — Giraffe Centre',
   'الوصول إلى نيروبي — زيارة مركز الزرافات',
   'Arrive at Nairobi airport, where you will be met and transferred to your hotel. Visit the AFEW Giraffe Centre to see and hand-feed Rothschild''s giraffes. Overnight in Nairobi.',
   false, false, true),

  (v_tour_id, 2,
   'Nairobi → Lake Naivasha — Great Rift Valley & The Forest',
   'نيروبي → بحيرة نيفاشا — الصدع العظيم وزيارة الغابة',
   'Ride out from Nairobi towards Lake Naivasha, stopping at the Great Rift Valley viewpoint for panoramic photos over the valley floor. Visit The Forest for a scenic stop among the trees. Overnight at a campsite facing Lake Naivasha.',
   true, false, true),

  (v_tour_id, 3,
   'Lake Naivasha Boat Ride & Sanctuary Farm — Lake Elementaita',
   'ركوب قارب في نيفاشا وزيارة محمية المزرعة — المبيت في إلمنتايتا',
   'Enjoy a boat ride on Lake Naivasha. Visit Sanctuary Farm for a walking safari among giraffes, gazelles, zebras, waterbuck and buffalo. Ride on to Lake Elementaita for the overnight at a resort facing the lake.',
   true, false, true),

  (v_tour_id, 4,
   'Lake Elementaita → Kericho Tea Farms → Eldoret via Nandi Hills',
   'إلمنتايتا → مزارع شاي كيريتشو → إلدوريت عبر ناندي هيلز',
   'Ride to the rolling tea plantations of Kericho. Continue through the forested tea estates and hills of Nandi Hills en route to Eldoret, Kenya''s "Home of Champions". Overnight in Eldoret.',
   true, false, true),

  (v_tour_id, 5,
   'Eldoret → Iten Viewpoint → Rift Valley Descent via Kabarnet → Nanyuki',
   'إلدوريت → مطل إيتن → نزول الصدع العظيم عبر كاباارنت → نانيوكي',
   'Ride to the famous Iten viewpoint, home of Kenya''s elite distance runners, for panoramic Rift Valley views. Descend the escarpment via Kabarnet, crossing the valley floor en route to Nanyuki. Overnight in Nanyuki.',
   true, false, true),

  (v_tour_id, 6,
   'Ol Pejeta Conservancy Safari — Nanyuki',
   'سفاري في محمية أول بيجيتا — المبيت في نانيوكي',
   'Full-day 4x4 safari game drive in Ol Pejeta Conservancy to see elephants, lions, rhino and other wildlife. Overnight again in Nanyuki.',
   true, false, true),

  (v_tour_id, 7,
   'Castle Forest Waterfalls → Return to Nairobi — Maasai Market',
   'شلالات كاسل فورست → العودة إلى نيروبي — سوق المساي',
   'Ride to the Castle Forest Lodge waterfalls on the slopes of Mt Kenya for swimming and forest exploration. Continue back to the capital, Nairobi, and visit the popular Maasai Market for souvenirs and local crafts. Overnight in Nairobi.',
   true, false, true),

  (v_tour_id, 8,
   'Free Day in Nairobi — Departure',
   'يوم حر في نيروبي — المغادرة',
   'A free day in Nairobi for last-minute shopping. Transfer to Jomo Kenyatta International Airport for your onward flight. End of the Kenya bike adventure.',
   true, false, false);

  -- ── Departures — only insert if this tour doesn't already have one on the
  --    same start_date (never deletes, so re-running never touches bookings)
  INSERT INTO departures (
    tour_id, start_date, end_date, max_seats, booked_seats,
    price_usd, security_deposit_usd, status, internal_notes, is_active
  )
  SELECT v_tour_id, d.start_date, d.end_date, 12, 0,
         1890, 300, 'available',
         'Price shown is per person sharing a twin/double room ($1,890). Single room: $2,150 pp. $300 motorbike security deposit is refundable at end of tour. Visa assistance available for $50 (not included).',
         true
  FROM (VALUES
    ('2026-09-19'::date, '2026-09-26'::date),
    ('2026-10-24'::date, '2026-10-31'::date),
    ('2026-11-21'::date, '2026-11-28'::date),
    ('2026-12-24'::date, '2026-12-31'::date)
  ) AS d(start_date, end_date)
  WHERE NOT EXISTS (
    SELECT 1 FROM departures
    WHERE tour_id = v_tour_id AND start_date = d.start_date
  );

  RAISE NOTICE '✓ Kenya KTM 390 Adventure Bike Tour seeded';
  RAISE NOTICE '  Tour ID: %', v_tour_id;
  RAISE NOTICE '  View at: /admin/tours/%', v_tour_id;

END;
$$;
