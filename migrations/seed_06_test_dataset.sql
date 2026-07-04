-- Seed 06: End-to-end TEST dataset
--
-- One test client, one test supplier (+ rate card & seasonal rates), two test
-- activities, one 4-day test tour with a full itinerary, three departures,
-- one confirmed booking (2 travellers, deposit paid + balance pending), an
-- enquiry (request), a draft quote linked to the first departure, one expense
-- and one supplier payment. Every record is labelled TEST so it is easy to
-- find and safe to delete.
--
-- Idempotent: fixed UUIDs + on-conflict guards; safe to re-run.
-- Requires seed_03 (destinations/accommodations) to be applied first.

-- ── Test client ───────────────────────────────────────────────────────────────

insert into clients (id, first_name, last_name, email, phone, whatsapp, country,
                     preferred_language, language, source, notes,
                     total_bookings, total_spent_usd)
values ('aaaa1111-0000-4000-8000-000000000001', 'Test', 'Client',
        'test.client@example.com', '+254700000001', '+254700000001', 'Kenya',
        'en', 'en', 'website',
        'TEST RECORD — created to exercise the full platform flow. Safe to delete.',
        1, 2900)
on conflict (id) do nothing;

-- ── Test supplier + rate card + rates ────────────────────────────────────────

insert into suppliers (id, name, supplier_type, contact_email, contact_phone, notes, is_active)
values ('aaaa1111-0000-4000-8000-000000000002', 'TEST Supplier Ltd', 'accommodation',
        'bookings@testsupplier.example.com', '+254700000010',
        'TEST RECORD — sample accommodation supplier. Safe to delete.', true)
on conflict (id) do nothing;

insert into supplier_rate_cards (id, name, supplier_name, supplier_id, entity_type,
                                 entity_id, cost_category, valid_from, valid_to,
                                 currency, notes, is_active)
values ('aaaa1111-0000-4000-8000-000000000003', 'TEST Supplier — Standard 2026',
        'TEST Supplier Ltd', 'aaaa1111-0000-4000-8000-000000000002',
        'accommodation', null, 'accommodation', '2026-01-01', '2026-12-31',
        'USD', 'TEST RECORD — sample rate card. Safe to delete.', true)
on conflict (id) do nothing;

delete from supplier_rates where rate_card_id = 'aaaa1111-0000-4000-8000-000000000003';
insert into supplier_rates (rate_card_id, room_category, residency, pricing_unit, amount, metadata, sort_order) values
  ('aaaa1111-0000-4000-8000-000000000003', 'single',    'all', 'room',   90, '{"meal_plan":"BB"}', 10),
  ('aaaa1111-0000-4000-8000-000000000003', 'sharing',   'all', 'room',  120, '{"meal_plan":"BB"}', 20),
  ('aaaa1111-0000-4000-8000-000000000003', 'extra_bed', 'all', 'night',  35, '{"meal_plan":"BB"}', 30),
  ('aaaa1111-0000-4000-8000-000000000003', 'single',    'all', 'room',  110, '{"meal_plan":"HB"}', 40),
  ('aaaa1111-0000-4000-8000-000000000003', 'sharing',   'all', 'room',  150, '{"meal_plan":"HB"}', 50),
  ('aaaa1111-0000-4000-8000-000000000003', 'extra_bed', 'all', 'night',  45, '{"meal_plan":"HB"}', 60);

-- ── Test activities ──────────────────────────────────────────────────────────

insert into activities (id, name, destination_id, description_en, is_active, has_content)
values
  ('aaaa1111-0000-4000-8000-000000000004', 'TEST — Masai Mara Game Drive',
   (select id from destinations where name = 'Masai Mara' limit 1),
   'TEST RECORD — full-day game drive across the Masai Mara plains.', true, true),
  ('aaaa1111-0000-4000-8000-000000000005', 'TEST — Nairobi City Tour',
   (select id from destinations where name = 'Nairobi' limit 1),
   'TEST RECORD — half-day guided tour of Nairobi highlights.', true, true)
on conflict (id) do nothing;

-- ── Test tour + itinerary ────────────────────────────────────────────────────

insert into tours (id, slug, title_en, title_ar, subtitle_en, overview_en, description_en,
                   type, status, duration_days, duration_nights, hero_image_url, gallery_urls,
                   highlights_en, included_en, excluded_en, terrain, vehicle,
                   accommodation_level, total_distance_km, difficulty_rating, max_group_size,
                   deposit_percent, base_price_usd, show_on_website, featured, is_active,
                   countries_visited, start_destination, end_destination)
values ('aaaa1111-0000-4000-8000-000000000006', 'test-4-day-masai-mara-nakuru',
        'TEST — 4-Day Masai Mara & Lake Nakuru Safari',
        'اختبار — رحلة سفاري ٤ أيام إلى ماساي مارا وبحيرة ناكورو',
        'Test tour covering the classic Nairobi–Nakuru–Mara circuit',
        'TEST RECORD — a complete sample tour used to verify the platform end to end. Safe to delete.',
        'Four days across Nairobi, Lake Nakuru and the Masai Mara with game drives, lodge stays and all park transfers. This is a TEST tour.',
        'wildlife', 'active', 4, 3,
        'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=1200&q=80',
        array['https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
              'https://images.unsplash.com/photo-1547970810-dc1eac37d174?auto=format&fit=crop&w=1200&q=80',
              'https://images.unsplash.com/photo-1535941339077-2dd1c7963098?auto=format&fit=crop&w=1200&q=80'],
        array['Big Five game drives in the Masai Mara',
              'Flamingos and rhino at Lake Nakuru',
              'Full-board lodge accommodation',
              'Professional driver-guide in a 4x4 Landcruiser'],
        array['All park entry fees', 'Full-board accommodation', '4x4 Landcruiser with pop-up roof', 'Professional driver-guide', 'Airport transfers'],
        array['International flights', 'Travel insurance', 'Tips and gratuities', 'Personal expenses'],
        'savannah', 'Landcruiser 4x4', 'midrange', 690, 2, 12,
        30, 1450, true, false, true,
        'Kenya', 'Nairobi', 'Nairobi')
on conflict (id) do nothing;

insert into tour_days (id, tour_id, day_number, title_en, description_en, destination_id,
                       accommodation_id, activity_ids, meal_breakfast, meal_lunch, meal_dinner, distance_km)
values
  ('aaaa1111-0000-4000-8000-000000000007', 'aaaa1111-0000-4000-8000-000000000006', 1,
   'Arrival in Nairobi & city tour',
   'TEST — Arrive at JKIA, meet your driver-guide and enjoy a short Nairobi city tour before check-in.',
   (select id from destinations where name = 'Nairobi' limit 1),
   (select id from accommodations where name = 'Sarova Panafric Nairobi' limit 1),
   array['aaaa1111-0000-4000-8000-000000000005']::uuid[], false, false, true, 25),
  ('aaaa1111-0000-4000-8000-000000000008', 'aaaa1111-0000-4000-8000-000000000006', 2,
   'Nairobi to Lake Nakuru',
   'TEST — Morning drive to Lake Nakuru National Park with an afternoon game drive among flamingos and rhino.',
   (select id from destinations where name = 'Nakuru' limit 1),
   (select id from accommodations where name = 'Sarova Lion Hill Game Lodge' limit 1),
   '{}'::uuid[], true, true, true, 160),
  ('aaaa1111-0000-4000-8000-000000000009', 'aaaa1111-0000-4000-8000-000000000006', 3,
   'Lake Nakuru to Masai Mara',
   'TEST — Cross the Great Rift Valley to the Masai Mara and head straight out on an evening game drive.',
   (select id from destinations where name = 'Masai Mara' limit 1),
   (select id from accommodations where name = 'Sarova Mara Game Camp' limit 1),
   array['aaaa1111-0000-4000-8000-000000000004']::uuid[], true, true, true, 235),
  ('aaaa1111-0000-4000-8000-00000000000a', 'aaaa1111-0000-4000-8000-000000000006', 4,
   'Masai Mara game drive & return to Nairobi',
   'TEST — Dawn game drive in the Mara, then drive back to Nairobi for your evening departure.',
   (select id from destinations where name = 'Nairobi' limit 1),
   null, '{}'::uuid[], true, true, false, 270)
on conflict (id) do nothing;

-- ── Departures ───────────────────────────────────────────────────────────────

insert into departures (id, tour_id, start_date, end_date, max_seats, booked_seats,
                        price_usd, status, internal_notes, is_active)
values
  ('aaaa1111-0000-4000-8000-00000000000b', 'aaaa1111-0000-4000-8000-000000000006',
   '2026-08-10', '2026-08-13', 12, 2, 1450, 'available', 'TEST departure — has one confirmed booking.', true),
  ('aaaa1111-0000-4000-8000-00000000000c', 'aaaa1111-0000-4000-8000-000000000006',
   '2026-09-14', '2026-09-17', 12, 0, 1450, 'available', 'TEST departure — empty.', true),
  ('aaaa1111-0000-4000-8000-00000000000d', 'aaaa1111-0000-4000-8000-000000000006',
   '2026-10-05', '2026-10-08', 12, 0, 1450, 'available', 'TEST departure — empty.', true)
on conflict (id) do nothing;

-- ── Booking with travellers and payments ─────────────────────────────────────

insert into bookings (id, departure_id, client_id, number_of_travellers, total_price_usd, status)
values ('aaaa1111-0000-4000-8000-00000000000e', 'aaaa1111-0000-4000-8000-00000000000b',
        'aaaa1111-0000-4000-8000-000000000001', 2, 2900, 'confirmed')
on conflict (id) do nothing;

insert into booking_travellers (id, booking_id, first_name, last_name, email, phone,
                                date_of_birth, nationality, passport_number)
values
  ('aaaa1111-0000-4000-8000-00000000000f', 'aaaa1111-0000-4000-8000-00000000000e',
   'Test', 'Client', 'test.client@example.com', '+254700000001',
   '1990-05-14', 'Kenyan', 'TEST123456'),
  ('aaaa1111-0000-4000-8000-000000000010', 'aaaa1111-0000-4000-8000-00000000000e',
   'Tina', 'Client', 'test.client+2@example.com', '+254700000002',
   '1992-08-22', 'Kenyan', 'TEST654321')
on conflict (id) do nothing;

insert into booking_payments (id, booking_id, amount_usd, status, method, reference, notes)
values
  ('aaaa1111-0000-4000-8000-000000000011', 'aaaa1111-0000-4000-8000-00000000000e',
   870, 'paid', 'bank_transfer', 'TEST-DEP-001', 'TEST — 30% deposit received.'),
  ('aaaa1111-0000-4000-8000-000000000012', 'aaaa1111-0000-4000-8000-00000000000e',
   2030, 'pending', 'bank_transfer', 'TEST-BAL-001', 'TEST — balance due 30 days before departure.')
on conflict (id) do nothing;

-- ── Enquiry (request) ────────────────────────────────────────────────────────

insert into requests (id, reference, client_id, tour_id, stage, source, priority,
                      client_question, travelers_adults, preferred_start_date,
                      group_size, requested_tour_type, heard_about_us)
values ('aaaa1111-0000-4000-8000-000000000013', 'REQ-TEST-001',
        'aaaa1111-0000-4000-8000-000000000001', 'aaaa1111-0000-4000-8000-000000000006',
        'new', 'website', 'normal',
        'TEST RECORD — Hi, we are two adults interested in the 4-day Masai Mara safari departing 10 August. Is there availability?',
        2, '2026-08-10', 2, 'wildlife', 'Instagram')
on conflict (id) do nothing;

-- ── Draft quote linked to the first departure ────────────────────────────────

insert into quotes (id, quote_number, request_id, client_id, mode, tour_id, departure_id, status)
values ('aaaa1111-0000-4000-8000-000000000014', 'SAT-Q-TEST-001',
        'aaaa1111-0000-4000-8000-000000000013', 'aaaa1111-0000-4000-8000-000000000001',
        'fixed_departure', 'aaaa1111-0000-4000-8000-000000000006',
        'aaaa1111-0000-4000-8000-00000000000b', 'draft')
on conflict (id) do nothing;

insert into quote_versions (id, quote_id, version_number, status, title, language, currency,
                            travel_start_date, travel_end_date, valid_until,
                            default_markup_percent, total_cost_usd, total_selling_usd,
                            gross_margin_usd, gross_margin_percent,
                            sharing_price_per_person_usd, client_snapshot,
                            inclusions, exclusions, internal_notes)
values ('aaaa1111-0000-4000-8000-000000000015', 'aaaa1111-0000-4000-8000-000000000014',
        1, 'draft', 'TEST Quote — 4-Day Masai Mara & Lake Nakuru Safari', 'en', 'USD',
        '2026-08-10', '2026-08-13', '2026-07-31',
        20, 2320, 2900, 580, 20, 1450,
        '{"first_name":"Test","last_name":"Client","email":"test.client@example.com","phone":"+254700000001","country":"Kenya"}',
        'All park fees, full-board lodges, 4x4 Landcruiser, driver-guide, airport transfers.',
        'International flights, travel insurance, tips, personal expenses.',
        'TEST RECORD — draft quote for the test booking flow. Safe to delete.')
on conflict (id) do nothing;

insert into quote_travellers (id, quote_version_id, display_name, age_on_travel_date,
                              age_band_id, age_band_snapshot, traveller_category,
                              room_category, is_paying, sort_order)
values
  ('aaaa1111-0000-4000-8000-000000000016', 'aaaa1111-0000-4000-8000-000000000015',
   'Test Client', 36, (select id from traveller_age_bands where code = 'adult' limit 1),
   '{"code":"adult","name":"Adult","min_age":16,"max_age":null}', 'adult', 'sharing', true, 10),
  ('aaaa1111-0000-4000-8000-000000000017', 'aaaa1111-0000-4000-8000-000000000015',
   'Tina Client', 33, (select id from traveller_age_bands where code = 'adult' limit 1),
   '{"code":"adult","name":"Adult","min_age":16,"max_age":null}', 'adult', 'sharing', true, 20)
on conflict (id) do nothing;

-- ── Finance: one expense and one supplier payment ────────────────────────────

insert into expenses (id, expense_date, category, description, amount_usd, method, reference)
values ('aaaa1111-0000-4000-8000-000000000018', '2026-07-04', 'fuel',
        'TEST RECORD — fuel for the August test departure. Safe to delete.',
        120, 'cash', 'TEST-EXP-001')
on conflict (id) do nothing;

insert into supplier_payments (id, supplier_id, amount_usd, method, reference, notes, paid_at)
values ('aaaa1111-0000-4000-8000-000000000019', 'aaaa1111-0000-4000-8000-000000000002',
        400, 'bank_transfer', 'TEST-PAY-001',
        'TEST RECORD — advance payment to the test supplier. Safe to delete.', '2026-07-04')
on conflict (id) do nothing;

-- Keep the client's rollup figures consistent with the booking above.
update clients
set total_bookings = 1, total_spent_usd = 2900
where id = 'aaaa1111-0000-4000-8000-000000000001';
