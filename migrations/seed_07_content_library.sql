-- Seed 07: Content library completion (descriptions) + multi-location activities.
--
-- Fills the bilingual descriptions that seed_03/04/05 left empty for the extra
-- destinations, the Sarova accommodations, the parks and the vehicles. NO
-- images are set here (left for a later pass). Then it arranges activities so a
-- generic activity can occur at several locations (group_57.activity_locations):
--   * "Waterfall Visit"  -> Thomson's Falls (Nyahururu) + Castle Forest Waterfall (Mt Kenya)
--   * "Game Drive"       -> Nairobi NP, Amboseli NP, Lake Nakuru NP, Ol Pejeta, Masai Mara
--
-- Idempotent: UPDATE-by-name and INSERT-if-absent; safe to re-run after
-- seed_03/04/05 and group_57.

-- ═══════════════════════════════════════════════════════════════
-- 1. DESTINATION descriptions (the 4 that seed_05 added without copy)
-- ═══════════════════════════════════════════════════════════════
update destinations set
  description_en = 'Kenya''s coastal capital and its second-largest city, Mombasa sits on the warm Indian Ocean with white-sand beaches, coral reefs and a rich Swahili heritage. Explore the 16th-century Fort Jesus and the winding lanes of Old Town, dhow-sail the harbour at sunset, and dive or snorkel the marine parks at Nyali and Diani. A relaxed, culturally layered finish to any safari.',
  description_ar = 'مومباسا هي عاصمة الساحل الكيني وثاني أكبر مدنها، تقع على المحيط الهندي الدافئ بشواطئها الرملية البيضاء وشعابها المرجانية وتراثها السواحيلي الغني. استكشف حصن يسوع من القرن السادس عشر وأزقة البلدة القديمة، وأبحر بالمراكب الشراعية عند الغروب، وغُص في المحميات البحرية في نيالي ودياني. ختام هادئ وغني ثقافياً لأي رحلة سفاري.',
  has_content = true, is_active = true
where name = 'Mombasa' and country = 'Kenya';

update destinations set
  description_en = 'Kenya''s flagship wildlife destination, the Masai Mara is a vast rolling savannah famed for the Great Migration, when over a million wildebeest and zebra thunder across the plains between July and October. Home to the Big Five and some of the densest big-cat populations on earth, the Mara delivers year-round game viewing against golden grassland and acacia horizons.',
  description_ar = 'ماساي مارا هي الوجهة الأبرز للحياة البرية في كينيا، سهول شاسعة تشتهر بالهجرة العظيمة حين يعبر أكثر من مليون حيوان من النو والحمار الوحشي السهول بين يوليو وأكتوبر. موطن الخمسة الكبار وواحدة من أعلى كثافات القطط الكبيرة على الأرض، تقدّم المارا مشاهدات للحياة البرية على مدار العام وسط الحشائش الذهبية وأشجار الأكاسيا.',
  has_content = true, is_active = true
where name = 'Masai Mara' and country = 'Kenya';

update destinations set
  description_en = 'Amboseli National Park lies at the foot of Mount Kilimanjaro, whose snow-capped summit forms an unforgettable backdrop to herds of free-ranging elephants. Its swamps and open plains draw big cats, buffalo, giraffe and over 400 bird species, and the flat terrain makes for exceptional photography of elephants framed against Africa''s highest peak.',
  description_ar = 'تقع حديقة أمبوسيلي الوطنية عند سفح جبل كليمنجارو الذي تشكّل قمته المكسوة بالثلوج خلفية لا تُنسى لقطعان الأفيال الطليقة. تجذب مستنقعاتها وسهولها المفتوحة القطط الكبيرة والجاموس والزرافات وأكثر من 400 نوع من الطيور، وتتيح أرضها المنبسطة تصويراً استثنائياً للأفيال أمام أعلى قمة في أفريقيا.',
  has_content = true, is_active = true
where name = 'Amboseli' and country = 'Kenya';

update destinations set
  description_en = 'Kenya''s third-largest city, Kisumu sits on the shores of Lake Victoria — Africa''s largest lake — in the country''s lush western highlands. Sunset boat trips reveal hippos and abundant birdlife, the Kisumu Impala Sanctuary sits right in town, and the lakeside fish markets and relaxed pace give the city its distinctive, welcoming character.',
  description_ar = 'كيسومو ثالث أكبر مدن كينيا، تقع على ضفاف بحيرة فيكتوريا — أكبر بحيرات أفريقيا — في المرتفعات الغربية الخضراء. تكشف رحلات القوارب عند الغروب عن أفراس النهر والطيور الوفيرة، وتقع محمية إمبالا داخل المدينة، وتمنح أسواق السمك على ضفاف البحيرة وإيقاع الحياة الهادئ المدينة طابعها المميز والمرحّب.',
  has_content = true, is_active = true
where name = 'Kisumu' and country = 'Kenya';

-- ═══════════════════════════════════════════════════════════════
-- 2. ACCOMMODATION descriptions (Sarova properties from seed_05)
-- ═══════════════════════════════════════════════════════════════
update accommodations set
  description_en = 'A sprawling beachfront resort on Mombasa''s Bamburi Beach, with palm-shaded pools, a spa and direct access to the white sands of the Indian Ocean. Full-board dining, watersports and family-friendly facilities make it a relaxed coastal base.',
  description_ar = 'منتجع شاطئي واسع على شاطئ بمبوري في مومباسا، بمسابح مظللة بالنخيل ومنتجع صحي ووصول مباشر إلى رمال المحيط الهندي البيضاء. يجعله الطعام الكامل والرياضات المائية والمرافق العائلية قاعدة ساحلية مريحة.',
  has_content = true
where name = 'Sarova Whitesands Beach Resort & Spa';

update accommodations set
  description_en = 'A comfortable lakeside city hotel in Kisumu, a short stroll from Lake Victoria. Modern rooms, a pool and easy access to the town make it a convenient stop in Kenya''s western highlands.',
  description_ar = 'فندق مدينة مريح على ضفاف البحيرة في كيسومو، على بعد خطوات من بحيرة فيكتوريا. تجعله الغرف العصرية والمسبح وسهولة الوصول إلى المدينة محطة مناسبة في مرتفعات كينيا الغربية.',
  has_content = true
where name = 'Sarova Imperial Hotel Kisumu';

update accommodations set
  description_en = 'A luxury tented camp set within the Masai Mara, blending canvas-under-thatch comfort with front-row access to the migration plains. Game drives depart straight from camp, and evenings bring bush dinners under the stars.',
  description_ar = 'مخيم خيام فاخر داخل ماساي مارا يمزج راحة الخيام تحت الأسقف القشية مع وصول مباشر إلى سهول الهجرة. تنطلق رحلات السفاري من المخيم مباشرة، وتجلب الأمسيات عشاءً في البرية تحت النجوم.',
  has_content = true
where name = 'Sarova Mara Game Camp';

update accommodations set
  description_en = 'A historic five-star landmark in the heart of Nairobi, the Stanley has hosted travellers since 1902. Its famous Thorn Tree Café, elegant rooms and central location make it a classic city base before or after safari.',
  description_ar = 'معلم تاريخي من فئة الخمس نجوم في قلب نيروبي، استضاف ستانلي المسافرين منذ عام 1902. يجعله مقهى ثورن تري الشهير وغرفه الأنيقة وموقعه المركزي قاعدة مدينة كلاسيكية قبل السفاري أو بعده.',
  has_content = true
where name = 'Sarova Stanley Nairobi';

update accommodations set
  description_en = 'A game lodge perched on a wooded hillside above Lake Nakuru National Park, with sweeping views over the flamingo-fringed soda lake. Pool, spa and full-board dining sit minutes from the park''s rhino and big-cat territory.',
  description_ar = 'نزل سفاري يقع على تلة مشجرة فوق حديقة بحيرة ناكورو الوطنية، بإطلالات واسعة على بحيرة الصودا المحاطة بطيور الفلامنغو. يقع المسبح والمنتجع الصحي والطعام الكامل على بعد دقائق من موطن وحيد القرن والقطط الكبيرة.',
  has_content = true
where name = 'Sarova Lion Hill Game Lodge';

update accommodations set
  description_en = 'A relaxed city hotel set in landscaped gardens near Nairobi''s centre, with a pool, spa and easy reach of the CBD and the road to the parks. A dependable, comfortable base for arrival and departure nights.',
  description_ar = 'فندق مدينة هادئ يقع في حدائق منسّقة قرب وسط نيروبي، بمسبح ومنتجع صحي وقرب من وسط الأعمال والطريق إلى الحدائق. قاعدة موثوقة ومريحة لليالي الوصول والمغادرة.',
  has_content = true
where name = 'Sarova Panafric Nairobi';

-- ═══════════════════════════════════════════════════════════════
-- 3. PARK descriptions (+ add Nairobi National Park)
-- ═══════════════════════════════════════════════════════════════
insert into parks (name, country, park_type, description_en, description_ar, is_active)
select 'Nairobi National Park', 'Kenya', 'national_park',
  'The world''s only national park within a capital city, on Nairobi''s southern edge. Lions, rhinos, giraffes and buffalo roam open plains against a skyline of city towers — a remarkable half-day safari without leaving town.',
  'الحديقة الوطنية الوحيدة في العالم داخل عاصمة، على الطرف الجنوبي لنيروبي. تجوب الأسود ووحيد القرن والزرافات والجاموس السهول المفتوحة أمام أفق ناطحات المدينة — سفاري مذهلة لنصف يوم دون مغادرة المدينة.',
  true
where not exists (select 1 from parks where name = 'Nairobi National Park' and country = 'Kenya');

update parks set
  description_en = 'The western sector of the Masai Mara ecosystem, managed for low-impact tourism. The Mara Triangle offers superb big-cat and migration viewing with fewer vehicles and dramatic Oloololo escarpment scenery.',
  description_ar = 'القطاع الغربي من نظام ماساي مارا، يُدار لسياحة منخفضة الأثر. يوفّر مثلث المارا مشاهدات رائعة للقطط الكبيرة والهجرة بعدد أقل من المركبات ومناظر خلابة لحافة أولولولو.'
where name = 'Mara Conservancy';

update parks set
  description_en = 'A pioneering Laikipia conservancy and East Africa''s largest black rhino sanctuary, also home to the last northern white rhinos and a chimpanzee sanctuary. Big-cat sightings and community-led conservation make it a standout safari.',
  description_ar = 'محمية رائدة في لايكيبيا وأكبر ملاذ لوحيد القرن الأسود في شرق أفريقيا، وموطن آخر وحيدات القرن البيضاء الشمالية وملاذ للشمبانزي. تجعلها مشاهدات القطط الكبيرة والحفاظ المجتمعي سفاري مميزة.'
where name = 'Ol Pejeta Conservancy';

update parks set
  description_en = 'A Rift Valley soda lake framed by wooded escarpments, world-famous for its flamingo flocks and as a rhino sanctuary sheltering both black and white rhino, plus leopard and Rothschild''s giraffe.',
  description_ar = 'بحيرة صودا في وادي الصدع تحيط بها حواف مشجّرة، تشتهر عالمياً بأسراب الفلامنغو وكملاذ لوحيد القرن يأوي النوعين الأسود والأبيض، إضافة إلى الفهد وزرافة روثشيلد.'
where name = 'Lake Nakuru National Park';

update parks set
  description_en = 'Elephant country at the foot of Kilimanjaro, Amboseli combines big herds, swamp-fed plains and iconic mountain backdrops with excellent birding and classic open-plain game viewing.',
  description_ar = 'أرض الأفيال عند سفح كليمنجارو، تجمع أمبوسيلي بين القطعان الكبيرة والسهول التي تغذّيها المستنقعات وخلفيات الجبل الأيقونية مع مشاهدة ممتازة للطيور والحياة البرية في السهول المفتوحة.'
where name = 'Amboseli National Park';

-- ═══════════════════════════════════════════════════════════════
-- 4. VEHICLE descriptions (vehicles table has description_en only)
-- ═══════════════════════════════════════════════════════════════
update vehicles set description_en =
  '7-seat 4x4 Toyota Landcruiser with a pop-up roof for 360° game viewing and photography — the workhorse of the Kenyan safari, built for rough park tracks.'
where name = 'Landcruiser 4x4';

update vehicles set description_en =
  'A comfortable air-conditioned sedan for airport transfers and city runs, with an experienced driver who knows the routes.'
where name = 'Sedan';

update vehicles set description_en =
  '24-seat overlanding truck for larger groups, purpose-built for long-distance travel across Kenya''s highways and park roads.'
where name = 'Overlanding Truck';

update vehicles set description_en =
  'Light-aircraft charter flights connecting Nairobi and the safari airstrips, saving long road transfers to the remote parks.'
where name = 'Charter Flight';

-- ═══════════════════════════════════════════════════════════════
-- 5. MULTI-LOCATION ACTIVITIES
-- ═══════════════════════════════════════════════════════════════

-- Generic "Waterfall Visit" activity (locations attached below).
insert into activities (name, is_active, has_content, description_en, description_ar)
select 'Waterfall Visit', true, true,
  'Guided visits to Kenya''s spectacular highland waterfalls, with short forest walks down to the base of the falls and time for photography amid the spray, birdsong and cool mountain air.',
  'زيارات إرشادية لشلالات كينيا الجبلية المذهلة، مع مشي قصير في الغابة نزولاً إلى قاعدة الشلالات ووقت للتصوير وسط الرذاذ وتغريد الطيور وهواء الجبل المنعش.'
where not exists (select 1 from activities where name = 'Waterfall Visit');

-- Waterfall Visit -> Thomson's Falls (Nyahururu) + Castle Forest Waterfall (Mt Kenya Forest)
insert into activity_locations (activity_id, destination_id, label_en, label_ar, sort_order)
select a.id, d.id, 'Thomson''s Falls', 'شلالات تومسون', 10
from activities a join destinations d on d.name = 'Nyahururu' and d.country = 'Kenya'
where a.name = 'Waterfall Visit'
  and not exists (select 1 from activity_locations al where al.activity_id = a.id and al.destination_id = d.id);

insert into activity_locations (activity_id, destination_id, label_en, label_ar, sort_order)
select a.id, d.id, 'Castle Forest Waterfall', 'شلال غابة كاسل', 20
from activities a join destinations d on d.name = 'Mount Kenya Forest' and d.country = 'Kenya'
where a.name = 'Waterfall Visit'
  and not exists (select 1 from activity_locations al where al.activity_id = a.id and al.destination_id = d.id);

-- Game Drive -> Nairobi NP, Amboseli NP, Lake Nakuru NP, Ol Pejeta (parks) + Masai Mara (destination)
insert into activity_locations (activity_id, park_id, label_en, label_ar, sort_order)
select a.id, p.id, p.name, null, v.ord
from activities a
join (values ('Nairobi National Park', 10), ('Amboseli National Park', 20),
             ('Lake Nakuru National Park', 30), ('Ol Pejeta Conservancy', 40)) as v(pname, ord) on true
join parks p on p.name = v.pname and p.country = 'Kenya'
where a.name = 'Game Drive'
  and not exists (select 1 from activity_locations al where al.activity_id = a.id and al.park_id = p.id);

insert into activity_locations (activity_id, destination_id, label_en, label_ar, sort_order)
select a.id, d.id, 'Masai Mara', 'ماساي مارا', 50
from activities a join destinations d on d.name = 'Masai Mara' and d.country = 'Kenya'
where a.name = 'Game Drive'
  and not exists (select 1 from activity_locations al where al.activity_id = a.id and al.destination_id = d.id);
