-- Group 59: content-library backfill — coordinates, Google Maps links, and
-- missing descriptions for the known destinations, parks and accommodations.
--
-- Powers the proposal's "Tour Itinerary Map" (group_58): destinations need
-- lat/lng for pins and auto distances. Every update is keyed by name and only
-- fills blanks (coalesce / "is null" guards), so rows the operator has already
-- curated — or renamed — are left untouched. Rows that don't exist are
-- silently skipped. Idempotent — safe to re-run.
--
-- Coordinates are the well-known locations of these places (park gates /
-- town centres / the property itself); the Google Maps links are name-search
-- URLs, so they always open the right place even if a pin drifts.

-- ── Destinations ──────────────────────────────────────────────────────────

create or replace function _backfill_destination(
  p_name text, p_lat double precision, p_lng double precision,
  p_desc_en text default null, p_desc_ar text default null
) returns void language sql as $$
  update destinations set
    latitude        = coalesce(latitude, p_lat),
    longitude       = coalesce(longitude, p_lng),
    google_maps_url = coalesce(google_maps_url,
      'https://www.google.com/maps/search/?api=1&query=' || replace(p_name || ', Kenya', ' ', '+')),
    description_en  = coalesce(description_en, p_desc_en),
    description_ar  = coalesce(description_ar, p_desc_ar),
    has_content     = has_content or p_desc_en is not null
  where name = p_name;
$$;

select _backfill_destination('Nairobi', -1.2921, 36.8219);
select _backfill_destination('Lake Naivasha', -0.7717, 36.3536,
  'A freshwater Rift Valley lake ringed by acacia woodland, famous for hippos, fish eagles and relaxed boat safaris. Lakeside sanctuaries let you walk among giraffe and zebra, and Hell''s Gate National Park is minutes away.',
  'بحيرة مياه عذبة في وادي الصدع تحيط بها غابات الأكاسيا، تشتهر بأفراس النهر ونسور السمك ورحلات القوارب الهادئة. تتيح المحميات المجاورة المشي بين الزرافات والحمير الوحشية، وتقع حديقة هيلز غيت الوطنية على بُعد دقائق.');
select _backfill_destination('Nakuru', -0.3031, 36.0800,
  'The Rift Valley''s bustling hub and gateway to Lake Nakuru National Park, whose soda lake shores draw flamingos, pelicans and both black and white rhino.',
  'مدينة نابضة في وادي الصدع وبوابة حديقة بحيرة ناكورو الوطنية، حيث تجتذب شواطئ البحيرة القلوية طيور الفلامنغو والبجع ووحيد القرن الأبيض والأسود.');
select _backfill_destination('Eldoret', 0.5143, 35.2698,
  'Kenya''s high-altitude "City of Champions", home to the country''s legendary long-distance runners, set among wheat farms and green highlands on the western Rift escarpment.',
  'مدينة الأبطال الكينية المرتفعة، موطن عدّائي المسافات الطويلة الأسطوريين، وسط مزارع القمح والمرتفعات الخضراء على الحافة الغربية لوادي الصدع.');
select _backfill_destination('Kericho', -0.3689, 35.2863,
  'The heart of Kenya''s tea country — endless emerald plantations rolling over cool misty hills, with tea-factory tours and highland scenery at every turn.',
  'قلب بلاد الشاي في كينيا — مزارع زمردية لا تنتهي تتموج فوق تلال باردة ضبابية، مع جولات في مصانع الشاي ومناظر المرتفعات في كل اتجاه.');
select _backfill_destination('Nyahururu', 0.0421, 36.3673,
  'A highland town beside Thomson''s Falls, a dramatic 74-metre waterfall on the Ewaso Ng''iro river — one of the classic stops on any Rift Valley circuit.',
  'بلدة مرتفعة بجوار شلالات طومسون، شلال مهيب بارتفاع 74 متراً على نهر إيواسو نجيرو — من المحطات الكلاسيكية في أي جولة بوادي الصدع.');
select _backfill_destination('Mount Kenya Forest', -0.4547, 37.3086,
  'The forested southern slopes of Africa''s second-highest mountain: waterfalls, giant bamboo, colobus monkeys and cool mountain air on the edge of Mount Kenya National Park.',
  'السفوح الجنوبية المكسوة بالغابات لثاني أعلى جبل في أفريقيا: شلالات وخيزران عملاق وقرود كولوبس وهواء جبلي منعش على حدود حديقة جبل كينيا الوطنية.');
select _backfill_destination('Marigat', 0.4691, 35.9827,
  'A small Rift Valley town between Lake Baringo and Lake Bogoria, where hot springs, geysers and flamingo-lined shores meet dramatic semi-arid scenery.',
  'بلدة صغيرة في وادي الصدع بين بحيرتي بارينغو وبوغوريا، حيث تلتقي الينابيع الساخنة والفوارات وشواطئ الفلامنغو بمناظر شبه قاحلة خلابة.');
select _backfill_destination('Masai Mara', -1.4931, 35.1439,
  'Kenya''s most celebrated wildlife reserve — endless savannah alive with big cats, elephants and, from July to October, the thunder of the Great Wildebeest Migration.',
  'أشهر محميات كينيا البرية — سافانا لا تنتهي تعجّ بالقطط الكبيرة والفيلة، ومن يوليو إلى أكتوبر يهدر فيها موكب الهجرة الكبرى للنو.');
select _backfill_destination('Amboseli', -2.6527, 37.2606,
  'Herds of free-ranging elephants against the snow-capped backdrop of Mount Kilimanjaro — Amboseli''s open plains offer some of Africa''s most iconic safari views.',
  'قطعان الفيلة الطليقة على خلفية قمة كليمنجارو الثلجية — تقدم سهول أمبوسيلي المفتوحة بعضاً من أكثر مشاهد السفاري شهرة في أفريقيا.');
select _backfill_destination('Mombasa', -4.0435, 39.6682,
  'Kenya''s historic Indian Ocean port: white-sand beaches, coral reefs, Fort Jesus and the winding lanes of Old Town, where Swahili, Arab and Portuguese heritage meet.',
  'ميناء كينيا التاريخي على المحيط الهندي: شواطئ رملية بيضاء وشعاب مرجانية وقلعة جيسوس وأزقة المدينة القديمة، حيث يلتقي التراث السواحيلي والعربي والبرتغالي.');
select _backfill_destination('Kisumu', -0.0917, 34.7680,
  'Kenya''s lakeside city on Lake Victoria — sunset boat trips among hippos, the Kisumu Impala Sanctuary in town, and the relaxed rhythm of the western highlands.',
  'مدينة كينيا المطلة على بحيرة فيكتوريا — رحلات قوارب عند الغروب بين أفراس النهر، ومحمية كيسومو إمبالا داخل المدينة، وإيقاع المرتفعات الغربية الهادئ.');
select _backfill_destination('Naromoru', -0.1633, 37.0233,
  'A quiet town on the western foothills of Mount Kenya, the classic base for treks up the mountain and safaris into nearby Ol Pejeta Conservancy.',
  'بلدة هادئة على السفوح الغربية لجبل كينيا، القاعدة الكلاسيكية لرحلات تسلق الجبل وجولات السفاري إلى محمية أول بيجيتا المجاورة.');
select _backfill_destination('Nanyuki', 0.0167, 37.0741,
  'A lively market town on the equator at the base of Mount Kenya, gateway to Ol Pejeta Conservancy and the Laikipia plateau''s ranches and wildlife.',
  'بلدة سوق حيوية على خط الاستواء عند سفح جبل كينيا، بوابة محمية أول بيجيتا وهضبة لايكيبيا بمزارعها وحياتها البرية.');

-- Alternate spellings the operator may have used when creating rows manually.
select _backfill_destination('Naivasha', -0.7172, 36.4310,
  'A freshwater Rift Valley lake ringed by acacia woodland, famous for hippos, fish eagles and relaxed boat safaris. Lakeside sanctuaries let you walk among giraffe and zebra, and Hell''s Gate National Park is minutes away.',
  'بحيرة مياه عذبة في وادي الصدع تحيط بها غابات الأكاسيا، تشتهر بأفراس النهر ونسور السمك ورحلات القوارب الهادئة. تتيح المحميات المجاورة المشي بين الزرافات والحمير الوحشية، وتقع حديقة هيلز غيت الوطنية على بُعد دقائق.');
select _backfill_destination('Maasai Mara', -1.4931, 35.1439,
  'Kenya''s most celebrated wildlife reserve — endless savannah alive with big cats, elephants and, from July to October, the thunder of the Great Wildebeest Migration.',
  'أشهر محميات كينيا البرية — سافانا لا تنتهي تعجّ بالقطط الكبيرة والفيلة، ومن يوليو إلى أكتوبر يهدر فيها موكب الهجرة الكبرى للنو.');

drop function _backfill_destination(text, double precision, double precision, text, text);

-- ── Parks & reserves ──────────────────────────────────────────────────────

create or replace function _backfill_park(
  p_name text, p_lat double precision, p_lng double precision,
  p_desc_en text default null, p_desc_ar text default null
) returns void language sql as $$
  update parks set
    latitude        = coalesce(latitude, p_lat),
    longitude       = coalesce(longitude, p_lng),
    google_maps_url = coalesce(google_maps_url,
      'https://www.google.com/maps/search/?api=1&query=' || replace(p_name || ', Kenya', ' ', '+')),
    description_en  = coalesce(description_en, p_desc_en),
    description_ar  = coalesce(description_ar, p_desc_ar)
  where name = p_name;
$$;

select _backfill_park('Nairobi National Park', -1.3606, 36.8462,
  'The world''s only national park within a capital city: lions, rhinos, giraffes and buffalo on open plains framed by Nairobi''s skyline — a remarkable half-day safari without leaving town.',
  'الحديقة الوطنية الوحيدة في العالم داخل عاصمة: أسود ووحيد قرن وزرافات وجاموس في سهول مفتوحة يؤطرها أفق نيروبي — سفاري مذهلة لنصف يوم دون مغادرة المدينة.');
select _backfill_park('Lake Nakuru National Park', -0.3635, 36.0946,
  'A soda-lake sanctuary famed for flamingos and one of Kenya''s best places to see both black and white rhino, with lions, leopards and Rothschild''s giraffe among acacia woodland.',
  'محمية بحيرة قلوية تشتهر بالفلامنغو، ومن أفضل أماكن كينيا لمشاهدة وحيد القرن الأبيض والأسود، مع الأسود والنمور وزرافات روتشيلد وسط غابات الأكاسيا.');
select _backfill_park('Mara Conservancy', -1.2500, 35.0250,
  'The Mara Triangle — the pristine north-western third of the Maasai Mara, managed for low-impact game drives, superb big-cat sightings and front-row views of the migration river crossings.',
  'مثلث المارا — الثلث الشمالي الغربي البكر من ماساي مارا، يُدار لجولات سفاري منخفضة الأثر ومشاهدات رائعة للقطط الكبيرة ومقاعد أمامية لعبور نهر الهجرة الكبرى.');
select _backfill_park('Ol Pejeta Conservancy', 0.0043, 36.9560,
  'East Africa''s largest black-rhino sanctuary on the Laikipia plateau, home to the world''s last two northern white rhinos, a chimpanzee sanctuary, and the full Big Five beneath Mount Kenya.',
  'أكبر محمية لوحيد القرن الأسود في شرق أفريقيا على هضبة لايكيبيا، تضم آخر اثنين من وحيد القرن الأبيض الشمالي في العالم ومحمية للشمبانزي والخمسة الكبار كاملة تحت جبل كينيا.');
select _backfill_park('Amboseli National Park', -2.6527, 37.2606,
  'Amboseli lies at the foot of Mount Kilimanjaro, whose snow-capped summit forms an unforgettable backdrop to herds of free-ranging elephants, big cats, buffalo and over 400 bird species.',
  'تقع أمبوسيلي عند سفح جبل كليمنجارو، الذي تشكل قمته الثلجية خلفية لا تُنسى لقطعان الفيلة الطليقة والقطط الكبيرة والجاموس وأكثر من 400 نوع من الطيور.');

drop function _backfill_park(text, double precision, double precision, text, text);

-- ── Accommodations ────────────────────────────────────────────────────────

create or replace function _backfill_accommodation(
  p_name text, p_lat double precision, p_lng double precision,
  p_desc_en text default null, p_desc_ar text default null
) returns void language sql as $$
  update accommodations set
    latitude        = coalesce(latitude, p_lat),
    longitude       = coalesce(longitude, p_lng),
    google_maps_url = coalesce(google_maps_url,
      'https://www.google.com/maps/search/?api=1&query=' || replace(p_name, ' ', '+')),
    description_en  = coalesce(description_en, p_desc_en),
    description_ar  = coalesce(description_ar, p_desc_ar),
    has_content     = has_content or p_desc_en is not null
  where name = p_name;
$$;

select _backfill_accommodation('Sarova Stanley Nairobi', -1.2843, 36.8243,
  'Nairobi''s grand dame since 1902, in the heart of the city centre — colonial elegance, the famous Thorn Tree Café, a heated rooftop pool and refined rooms minutes from Nairobi National Park.',
  'فندق نيروبي العريق منذ عام 1902 في قلب وسط المدينة — أناقة كولونيالية ومقهى ثورن تري الشهير ومسبح مُدفأ على السطح وغرف راقية على بُعد دقائق من حديقة نيروبي الوطنية.');
select _backfill_accommodation('Sarova Panafric Nairobi', -1.2966, 36.8110,
  'A relaxed Nairobi landmark on Kenyatta Avenue''s green rise: Pan-African styling, tropical gardens, a poolside terrace and easy access to both the city centre and the airport road.',
  'معلم نيروبي المريح على مرتفع أخضر: طراز أفريقي أنيق وحدائق استوائية وشرفة على المسبح وسهولة الوصول إلى وسط المدينة وطريق المطار.');
select _backfill_accommodation('Sarova Lion Hill Game Lodge', -0.3358, 36.1096,
  'A game lodge on a wooded hillside inside Lake Nakuru National Park, with sweeping views over the flamingo-fringed soda lake, chalet-style rooms, a pool and evening wildlife talks.',
  'نُزل سفاري على تل مشجر داخل حديقة بحيرة ناكورو الوطنية، بإطلالات واسعة على البحيرة المحاطة بالفلامنغو وغرف بطراز الشاليهات ومسبح وأمسيات تعريفية بالحياة البرية.');
select _backfill_accommodation('Sarova Mara Game Camp', -1.5064, 35.1970,
  'A classic tented camp in the heart of the Maasai Mara: 75 luxury tents among riverine forest, sundowners by the campfire, and game drives straight out of camp into big-cat country.',
  'مخيم كلاسيكي فاخر في قلب ماساي مارا: 75 خيمة فاخرة وسط غابة نهرية وجلسات غروب حول نار المخيم وجولات سفاري تنطلق مباشرة من المخيم إلى أرض القطط الكبيرة.');
select _backfill_accommodation('Sarova Whitesands Beach Resort & Spa', -3.9857, 39.7456,
  'Mombasa''s flagship beach resort on Bamburi Beach — lush gardens, five pools, a full spa and water sports on a long stretch of white Indian Ocean sand.',
  'منتجع مومباسا الشاطئي الرائد على شاطئ بامبوري — حدائق غنّاء وخمسة مسابح وسبا متكامل ورياضات مائية على شريط طويل من رمال المحيط الهندي البيضاء.');
select _backfill_accommodation('Sarova Imperial Hotel Kisumu', -0.0993, 34.7554,
  'Kisumu''s established business hotel in the city centre, a short drive from Lake Victoria''s sunset boat trips and the Kisumu Impala Sanctuary.',
  'فندق كيسومو العريق في وسط المدينة، على مسافة قصيرة من رحلات القوارب عند غروب الشمس في بحيرة فيكتوريا ومحمية كيسومو إمبالا.');

drop function _backfill_accommodation(text, double precision, double precision, text, text);
