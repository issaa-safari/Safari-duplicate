-- Seed 09: Client "SM" — 7-day Ol Pejeta & Naivasha private safari (DRAFT)
--
-- Creates one Arabic (RTL) client quotation as a DRAFT so the operator can
-- review it in Admin → Quotes and ENTER THE PRICING before sending. Nothing
-- here sets a price: quote_versions totals stay at 0, no quote_price_lines are
-- created, and travellers carry no fixed amount. The quoted figures the client
-- was given are recorded in quote_versions.internal_notes for the operator.
--
-- 6 travellers · 7 days / 6 nights · car Toyota Noah · meals NOT included.
-- Language = 'ar' (client is from Oman). Itinerary from the client brief.
--
-- Idempotent: fixed UUIDs + `on conflict (id) do nothing`; safe to re-run.
-- Version status stays 'draft' so the child-row mutability triggers
-- (group_13) allow re-inserts. The operator sends it from Admin after pricing,
-- which creates the share link (quote_deliveries) and flips it to 'sent'.

-- ── Client ────────────────────────────────────────────────────────────────────
insert into clients (id, first_name, last_name, email, phone, whatsapp, country,
                     preferred_language, language, source, notes)
values ('5b000000-0000-4000-8000-000000000001', 'SM', '',
        null, '+968 7993 3291', '+968 7993 3291', 'Oman',
        'ar', 'ar', 'whatsapp',
        'Client SM — 7-day private Ol Pejeta & Lake Naivasha safari for 6 people (car Toyota Noah). Draft itinerary created; pricing to be entered by the operator.')
on conflict (id) do nothing;

-- ── Request (enquiry) ─────────────────────────────────────────────────────────
insert into requests (id, reference, client_id, stage, source, priority,
                      client_question, travelers_adults, group_size, requested_tour_type)
values ('5b000000-0000-4000-8000-000000000002', 'REQ-SM-001',
        '5b000000-0000-4000-8000-000000000001', 'new', 'whatsapp', 'normal',
        'باقة سفاري خاصة 7 أيام لـ 6 أشخاص: نيروبي، شلالات كاسل فورست، محمية أول بيجيتا، شلالات تومسون، بحيرة نايفاشا ومحمية سانكتشري فارم. بسيارة Toyota Noah.',
        6, 6, 'wildlife')
on conflict (id) do nothing;

-- ── Quote (custom, draft) ─────────────────────────────────────────────────────
insert into quotes (id, quote_number, request_id, client_id, mode, status)
values ('5b000000-0000-4000-8000-000000000003', 'SAT-Q-SM-001',
        '5b000000-0000-4000-8000-000000000002',
        '5b000000-0000-4000-8000-000000000001', 'custom', 'draft')
on conflict (id) do nothing;

-- ── Quote version 1 (Arabic, draft — NO pricing) ──────────────────────────────
insert into quote_versions (id, quote_id, version_number, status, title, language, currency,
                            default_markup_percent,
                            client_snapshot, inclusions, exclusions, internal_notes)
values ('5b000000-0000-4000-8000-000000000004', '5b000000-0000-4000-8000-000000000003',
        1, 'draft',
        'رحلة سفاري كينيا الخاصة — 7 أيام / 6 ليالٍ (أول بيجيتا ونايفاشا)',
        'ar', 'USD', 0,
        jsonb_build_object('first_name','SM','last_name','','email',null,
          'phone','+968 7993 3291','country','Oman','language','ar'),
        array[
          'سيارة Toyota Noah طوال الرحلة',
          'سائق خاص',
          'الوقود (البنزين)',
          'الاستقبال من المطار',
          'الإقامة (شقق وفلل حسب البرنامج)',
          'رسوم دخول محمية أول بيجيتا (Ol Pejeta)',
          'رسوم دخول محمية سانكتشري فارم (Sanctuary Farm)',
          'رسوم دخول الشلالات والغابات',
          'ركوب القارب في بحيرة نايفاشا',
          'التوصيل إلى المطار'
        ],
        array[
          'تذاكر الطيران',
          'التأشيرة (نساعدك في استخراجها مقابل 50$ للشخص)',
          'جميع الوجبات',
          'المصاريف الشخصية',
          'الفعاليات الإضافية',
          'المحميات غير المذكورة في البرنامج'
        ],
        'PRICING TO BE ENTERED BY OPERATOR. Client was quoted $1,290 per person x 6 = $7,740 total, by car (Toyota Noah). Optional add-ons the client asked about: Landcruiser safari inside Ol Pejeta $300; Prado for the whole trip $400. Visa assistance $50/person. Meals not included.')
on conflict (id) do nothing;

-- ── Travellers (6 adults, sharing — no price set) ─────────────────────────────
insert into quote_travellers (id, quote_version_id, display_name, age_band_id,
                              age_band_snapshot, traveller_category, room_category,
                              is_paying, sort_order)
select v.id::uuid, '5b000000-0000-4000-8000-000000000004', v.name,
       (select id from traveller_age_bands where code = 'adult' limit 1),
       '{"code":"adult","name":"Adult","min_age":16,"max_age":null,"default_percentage":100}'::jsonb,
       'adult', 'sharing', true, v.ord
from (values
  ('5b000000-0000-4000-8000-0000000000a1', 'المسافر 1', 0),
  ('5b000000-0000-4000-8000-0000000000a2', 'المسافر 2', 1),
  ('5b000000-0000-4000-8000-0000000000a3', 'المسافر 3', 2),
  ('5b000000-0000-4000-8000-0000000000a4', 'المسافر 4', 3),
  ('5b000000-0000-4000-8000-0000000000a5', 'المسافر 5', 4),
  ('5b000000-0000-4000-8000-0000000000a6', 'المسافر 6', 5)
) as v(id, name, ord)
on conflict (id) do nothing;

-- ── Itinerary — 7 days (Arabic primary, English for admin) ────────────────────
insert into quote_days (id, quote_version_id, day_number, sort_order,
    title, description_en, title_ar, description_ar, meals, destination_snapshot)
values
  ('5b000000-0000-4000-8000-0000000000d1', '5b000000-0000-4000-8000-000000000004', 1, 0,
   'Arrival in Nairobi — Airport pickup & Giraffe Centre',
   'Meet-and-assist at Nairobi airport and transfer to your accommodation. Visit the Giraffe Centre to see and hand-feed the Rothschild giraffes. Overnight: furnished 3-bedroom apartment in Nairobi.',
   'الوصول إلى نيروبي — الاستقبال من المطار وزيارة مركز الزرافات',
   'الاستقبال من مطار نيروبي والانتقال إلى مكان الإقامة. زيارة مركز الزرافات (Giraffe Centre) لمشاهدة زرافات روثشيلد وإطعامها باليد. الإقامة: شقة مفروشة من 3 غرف نوم في نيروبي.',
   '{}',
   jsonb_build_object('id',(select id from destinations where name='Nairobi' and country='Kenya' limit 1),'name','نيروبي','country','Kenya')),

  ('5b000000-0000-4000-8000-0000000000d2', '5b000000-0000-4000-8000-000000000004', 2, 1,
   'Nairobi -> Castle Forest waterfalls -> Nanyuki',
   'Morning drive to the Castle Forest waterfalls on the slopes of Mt Kenya; descend to the falls with a rest in the forest. Continue to Nanyuki, arrive at the villa and relax with an afternoon sitting in the villa garden. Overnight: 4-bedroom villa in Naromoru.',
   'نيروبي ← شلالات كاسل فورست ← نانيوكي',
   'الانطلاق صباحاً إلى شلالات غابة كاسل (Castle Forest) على سفوح جبل كينيا، والنزول إلى الشلالات مع استراحة وسط الغابة. ثم الانتقال إلى مدينة نانيوكي والوصول إلى الفيلا وجلسة عصرية في حديقة الفيلا. الإقامة: فيلا 4 غرف نوم في نارومورو (Naromoru).',
   '{}',
   jsonb_build_object('id',(select id from destinations where name='Mount Kenya Forest' and country='Kenya' limit 1),'name','غابة جبل كينيا / كاسل فورست','country','Kenya')),

  ('5b000000-0000-4000-8000-0000000000d3', '5b000000-0000-4000-8000-000000000004', 3, 2,
   'Ol Pejeta Conservancy game drive',
   'Full-day safari in Ol Pejeta Conservancy until sunset: giraffes, gazelles, elephants, rhino, lions and leopards. Overnight: 4-bedroom villa in Naromoru.',
   'سفاري محمية أول بيجيتا (Ol Pejeta)',
   'الانطلاق إلى محمية أول بيجيتا لرحلة سفاري كاملة حتى المغرب لمشاهدة الزرافات والغزلان والفِيَلة ووحيد القرن والأسود والفهود. الإقامة: فيلا 4 غرف نوم في نارومورو.',
   '{}',
   jsonb_build_object('name','محمية أول بيجيتا','country','Kenya')),

  ('5b000000-0000-4000-8000-0000000000d4', '5b000000-0000-4000-8000-000000000004', 4, 3,
   'Nanyuki -> Thomson''s Falls (Nyahururu) -> Lake Naivasha',
   'Drive to Nyahururu to see the famous Thomson''s Falls, then continue to Lake Naivasha. Overnight: 4-bedroom villa in Naivasha.',
   'نانيوكي ← شلالات تومسون في نياهورورو ← بحيرة نايفاشا',
   'الانطلاق إلى نياهورورو ومشاهدة شلالات تومسون الشهيرة (Thomson''s Falls)، ثم المتابعة إلى بحيرة نايفاشا. الإقامة: فيلا 4 غرف نوم في نايفاشا.',
   '{}',
   jsonb_build_object('id',(select id from destinations where name='Nyahururu' and country='Kenya' limit 1),'name','نياهورورو','country','Kenya')),

  ('5b000000-0000-4000-8000-0000000000d5', '5b000000-0000-4000-8000-000000000004', 5, 4,
   'Lake Naivasha — Boat ride & Sanctuary Farm',
   'Boat ride on Lake Naivasha, then visit Sanctuary Farm to see giraffes, gazelles, waterbuck, ibex, buffalo and zebra up close and walk among them. Return to the villa. Overnight: 4-bedroom villa in Naivasha.',
   'بحيرة نايفاشا — رحلة قارب ومحمية سانكتشري فارم',
   'ركوب القارب في بحيرة نايفاشا، ثم زيارة محمية سانكتشري فارم (Sanctuary Farm) لمشاهدة الزرافات والغزلان وظباء الماء والوعول والجاموس والحمير الوحشية عن قرب والمشي بينها. العودة إلى الفيلا. الإقامة: فيلا 4 غرف نوم في نايفاشا.',
   '{}',
   jsonb_build_object('id',(select id from destinations where name='Lake Naivasha' and country='Kenya' limit 1),'name','بحيرة نايفاشا','country','Kenya')),

  ('5b000000-0000-4000-8000-0000000000d6', '5b000000-0000-4000-8000-000000000004', 6, 5,
   'The Forest adventures & the Great Rift Valley -> back to Nairobi',
   'Head to The Forest for activities such as ziplining, forest walks, horseback riding and cycling. Stop at a viewpoint over the Great Rift Valley (which runs from northern Syria to Mozambique). Return to Nairobi. Overnight: furnished 3-bedroom apartment in Nairobi.',
   'مغامرات الغابة والصدع الإفريقي العظيم ← العودة إلى العاصمة',
   'الانطلاق إلى الغابة (The Forest) لممارسة فعاليات مثل الزيبلاين والمشي بين الأشجار وركوب الخيل وركوب الدراجات الهوائية. التوقف عند نقطة إطلالة على الصدع الإفريقي العظيم الممتد من شمال سوريا حتى موزمبيق. العودة إلى العاصمة نيروبي. الإقامة: شقة مفروشة من 3 غرف نوم في نيروبي.',
   '{}',
   jsonb_build_object('id',(select id from destinations where name='Nairobi' and country='Kenya' limit 1),'name','نيروبي','country','Kenya')),

  ('5b000000-0000-4000-8000-0000000000d7', '5b000000-0000-4000-8000-000000000004', 7, 6,
   'Nairobi — Departure',
   'Transfer to Nairobi airport for your departure as per your flight plan. End of the programme. We hope to host you again!',
   'نيروبي — المغادرة',
   'الانتقال إلى مطار نيروبي حسب موعد رحلتك ونهاية البرنامج. يسعدنا استضافتكم مجدداً!',
   '{}',
   jsonb_build_object('id',(select id from destinations where name='Nairobi' and country='Kenya' limit 1),'name','نيروبي','country','Kenya'))
on conflict (id) do nothing;

-- ── Accommodation shown per day (snapshots; not linked to library) ────────────
insert into quote_day_items (id, quote_day_id, item_type, title_snapshot, sort_order)
values
  ('5b000000-0000-4000-8000-0000000000c1', '5b000000-0000-4000-8000-0000000000d1', 'accommodation', 'شقة مفروشة 3 غرف نوم — نيروبي', 0),
  ('5b000000-0000-4000-8000-0000000000c2', '5b000000-0000-4000-8000-0000000000d2', 'accommodation', 'فيلا 4 غرف نوم — نارومورو', 0),
  ('5b000000-0000-4000-8000-0000000000c3', '5b000000-0000-4000-8000-0000000000d3', 'accommodation', 'فيلا 4 غرف نوم — نارومورو', 0),
  ('5b000000-0000-4000-8000-0000000000c4', '5b000000-0000-4000-8000-0000000000d4', 'accommodation', 'فيلا 4 غرف نوم — نايفاشا', 0),
  ('5b000000-0000-4000-8000-0000000000c5', '5b000000-0000-4000-8000-0000000000d5', 'accommodation', 'فيلا 4 غرف نوم — نايفاشا', 0),
  ('5b000000-0000-4000-8000-0000000000c6', '5b000000-0000-4000-8000-0000000000d6', 'accommodation', 'شقة مفروشة 3 غرف نوم — نيروبي', 0)
on conflict (id) do nothing;
