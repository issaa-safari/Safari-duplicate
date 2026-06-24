-- Seed 03: Kenya Content Library
-- Destinations, Activities, Parks & Reserves with EN + AR descriptions
-- Also updates Kenya 8D/7N tour_days with proper destination + activity links
-- Run in Supabase SQL Editor after seed_02.

DO $$
DECLARE
  -- Destination IDs
  d_nairobi        uuid;
  d_naivasha       uuid;
  d_nakuru         uuid;
  d_eldoret        uuid;
  d_kericho        uuid;
  d_nyahururu      uuid;
  d_mtkenyaforest  uuid;
  d_marigat        uuid;

  -- Activity IDs
  a_welcome_dinner    uuid;
  a_farewell_dinner   uuid;
  a_city_tour         uuid;
  a_airport_transfer  uuid;
  a_bike_riding       uuid;
  a_game_drive        uuid;
  a_guided_game_drive uuid;
  a_night_game_drive  uuid;
  a_aberdare_drive    uuid;
  a_boat_naivasha     uuid;
  a_bush_walk         uuid;
  a_coffee_farm       uuid;
  a_forest_hike       uuid;
  a_horseback         uuid;
  a_balloon           uuid;
  a_maasai_village    uuid;
  a_obs_hill          uuid;
  a_photography       uuid;
  a_sanctuary_farm    uuid;
  a_thomson_falls     uuid;

  -- Tour ID
  v_tour_id uuid;

BEGIN

  -- ═══════════════════════════════════════════════════════════════
  -- 1. DESTINATIONS
  -- ═══════════════════════════════════════════════════════════════

  UPDATE destinations SET
    description_en = 'Kenya''s vibrant capital and East Africa''s largest city, Nairobi sits at 1,795 m above sea level in the Great Rift Valley highlands. It is the starting and finishing point of the Kenya bike adventure, offering world-class dining, the famous Nairobi National Park on the city''s edge, the Giraffe Centre, Karen Blixen Museum, and buzzing Westlands nightlife. The city blends modern infrastructure with its rich colonial history and dynamic street culture.',
    description_ar = 'نيروبي هي عاصمة كينيا النابضة بالحياة وأكبر مدن أفريقيا الشرقية، تقع على ارتفاع 1,795 متراً فوق مستوى سطح البحر في مرتفعات وادي الصدع العظيم. تُعدّ نقطة الانطلاق والوصول لمغامرة ركوب الدراجات في كينيا، وتضمّ مطاعم رفيعة المستوى وحديقة نيروبي الوطنية على أطراف المدينة ومركز الزراف وأكثر. تمزج المدينة بين البنية التحتية الحديثة وتاريخها الاستعماري الغني.',
    has_content = true,
    is_active = true
  WHERE name = 'Nairobi' AND country = 'Kenya';

  INSERT INTO destinations (name, country, is_active, has_content, description_en, description_ar)
  SELECT
    'Nairobi', 'Kenya', true, true,
    'Kenya''s vibrant capital and East Africa''s largest city, Nairobi sits at 1,795 m above sea level in the Great Rift Valley highlands. It is the starting and finishing point of the Kenya bike adventure, offering world-class dining, the famous Nairobi National Park on the city''s edge, the Giraffe Centre, Karen Blixen Museum, and buzzing Westlands nightlife. The city blends modern infrastructure with its rich colonial history and dynamic street culture.',
    'نيروبي هي عاصمة كينيا النابضة بالحياة وأكبر مدن أفريقيا الشرقية، تقع على ارتفاع 1,795 متراً فوق مستوى سطح البحر في مرتفعات وادي الصدع العظيم. تُعدّ نقطة الانطلاق والوصول لمغامرة ركوب الدراجات في كينيا، وتضمّ مطاعم رفيعة المستوى وحديقة نيروبي الوطنية على أطراف المدينة ومركز الزراف وأكثر. تمزج المدينة بين البنية التحتية الحديثة وتاريخها الاستعماري الغني.'
  WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Nairobi' AND country = 'Kenya');

  SELECT id INTO d_nairobi FROM destinations WHERE name = 'Nairobi' AND country = 'Kenya';

  UPDATE destinations SET
    description_en = 'A sparkling freshwater lake in the Great Rift Valley, 90 km north-west of Nairobi at 1,884 m altitude. Famous for its diverse birdlife (over 400 species), hippos, and surrounding flower farms. Hells Gate National Park, one of Kenya''s few parks where visitors can cycle freely among wildlife, borders the southern shore. Boat trips at dusk reveal hippo pods and fish eagles diving at sunset.',
    description_ar = 'بحيرة نايفاشا هي بحيرة عذبة تتلألأ في وادي الصدع العظيم، على بعد 90 كم شمال غرب نيروبي وعلى ارتفاع 1,884 م. تشتهر بتنوع طيورها (أكثر من 400 نوع) وأفراس النهر وأكثر من 60 مزرعة للزهور. تحدّ محمية هيلز غيت الوطنية شاطئها الجنوبي، حيث يمكن ركوب الدراجات بين الحياة البرية بحرية تامة.',
    has_content = true,
    is_active = true
  WHERE name = 'Lake Naivasha' AND country = 'Kenya';

  INSERT INTO destinations (name, country, is_active, has_content, description_en, description_ar)
  SELECT
    'Lake Naivasha', 'Kenya', true, true,
    'A sparkling freshwater lake in the Great Rift Valley, 90 km north-west of Nairobi at 1,884 m altitude. Famous for its diverse birdlife (over 400 species), hippos, and surrounding flower farms. Hells Gate National Park, one of Kenya''s few parks where visitors can cycle freely among wildlife, borders the southern shore. Boat trips at dusk reveal hippo pods and fish eagles diving at sunset.',
    'بحيرة نايفاشا هي بحيرة عذبة تتلألأ في وادي الصدع العظيم، على بعد 90 كم شمال غرب نيروبي وعلى ارتفاع 1,884 م. تشتهر بتنوع طيورها (أكثر من 400 نوع) وأفراس النهر وأكثر من 60 مزرعة للزهور. تحدّ محمية هيلز غيت الوطنية شاطئها الجنوبي، حيث يمكن ركوب الدراجات بين الحياة البرية بحرية تامة.'
  WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Lake Naivasha' AND country = 'Kenya');

  SELECT id INTO d_naivasha FROM destinations WHERE name = 'Lake Naivasha' AND country = 'Kenya';

  UPDATE destinations SET
    description_en = 'Kenya''s fourth-largest city, set in the Rift Valley 160 km north-west of Nairobi. Lake Nakuru National Park on its southern edge is world-famous for its flamingo flocks, white rhinos, and leopards. The city is a key agricultural hub surrounded by rolling farmland, and its fresh highland air and scenic escarpment views make it a favourite stop on the Rift Valley cycling circuit.',
    description_ar = 'ناكورو هي رابع أكبر مدن كينيا، تقع في وادي الصدع على بعد 160 كم شمال غرب نيروبي. تشتهر حديقة بحيرة ناكورو الوطنية على أطرافها الجنوبية بأسراب طيور الفلامنغو ووحيد القرن الأبيض والفهود. المدينة مركز زراعي رئيسي تحيط به الحقول الخضراء ومناظر الهضبة الخلابة.',
    has_content = true,
    is_active = true
  WHERE name = 'Nakuru' AND country = 'Kenya';

  INSERT INTO destinations (name, country, is_active, has_content, description_en, description_ar)
  SELECT
    'Nakuru', 'Kenya', true, true,
    'Kenya''s fourth-largest city, set in the Rift Valley 160 km north-west of Nairobi. Lake Nakuru National Park on its southern edge is world-famous for its flamingo flocks, white rhinos, and leopards. The city is a key agricultural hub surrounded by rolling farmland, and its fresh highland air and scenic escarpment views make it a favourite stop on the Rift Valley cycling circuit.',
    'ناكورو هي رابع أكبر مدن كينيا، تقع في وادي الصدع على بعد 160 كم شمال غرب نيروبي. تشتهر حديقة بحيرة ناكورو الوطنية على أطرافها الجنوبية بأسراب طيور الفلامنغو ووحيد القرن الأبيض والفهود. المدينة مركز زراعي رئيسي تحيط به الحقول الخضراء ومناظر الهضبة الخلابة.'
  WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Nakuru' AND country = 'Kenya');

  SELECT id INTO d_nakuru FROM destinations WHERE name = 'Nakuru' AND country = 'Kenya';

  UPDATE destinations SET
    description_en = 'Kenya''s fifth city and the undisputed "Home of Champions" — more Olympic and World Championship medals have been won by athletes from Eldoret and its Nandi Hills environs than almost anywhere on earth. At 2,100 m altitude the thin, crisp highland air has produced generations of elite distance runners. The city has a lively market scene, a warm community feel, and beautiful wheat and maize farmland stretching to the horizon.',
    description_ar = 'إلدوريت المدينة الخامسة في كينيا وعاصمة الأبطال بلا منازع — فعدد الميداليات الأولمبية وبطولات العالم التي فاز بها رياضيون من المنطقة لا مثيل له. على ارتفاع 2,100 م يمنح الهواء النقي النحيل رياضيين متميزين جيلاً بعد جيل. تتميز المدينة بسوقها النابض وطابعها الدافئ وحقول القمح والذرة الممتدة حتى الأفق.',
    has_content = true,
    is_active = true
  WHERE name = 'Eldoret' AND country = 'Kenya';

  INSERT INTO destinations (name, country, is_active, has_content, description_en, description_ar)
  SELECT
    'Eldoret', 'Kenya', true, true,
    'Kenya''s fifth city and the undisputed "Home of Champions" — more Olympic and World Championship medals have been won by athletes from Eldoret and its Nandi Hills environs than almost anywhere on earth. At 2,100 m altitude the thin, crisp highland air has produced generations of elite distance runners. The city has a lively market scene, a warm community feel, and beautiful wheat and maize farmland stretching to the horizon.',
    'إلدوريت المدينة الخامسة في كينيا وعاصمة الأبطال بلا منازع — فعدد الميداليات الأولمبية وبطولات العالم التي فاز بها رياضيون من المنطقة لا مثيل له. على ارتفاع 2,100 م يمنح الهواء النقي النحيل رياضيين متميزين جيلاً بعد جيل. تتميز المدينة بسوقها النابض وطابعها الدافئ وحقول القمح والذرة الممتدة حتى الأفق.'
  WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Eldoret' AND country = 'Kenya');

  SELECT id INTO d_eldoret FROM destinations WHERE name = 'Eldoret' AND country = 'Kenya';

  UPDATE destinations SET
    description_en = 'The undisputed tea capital of Africa, Kericho sits in the western highlands at 2,000 m, blanketed by an endless carpet of manicured tea bushes as far as the eye can see. The region receives afternoon rain almost every day, keeping the tea lush and green year-round. Guided walks through the tea estates offer a fascinating glimpse into the harvest and processing cycle that produces Kenya''s world-famous tea.',
    description_ar = 'عاصمة الشاي الأفريقية بلا منازع، تقع كيريتشو في المرتفعات الغربية على ارتفاع 2,000 م، مغطاة بسجادة لا نهاية لها من شجيرات الشاي المهذبة. تتلقى المنطقة أمطاراً بعد الظهر تقريباً كل يوم ما يحافظ على خضرتها طوال العام. تقدم جولات مصانع الشاي الإرشادية نظرة رائعة على دورة الحصاد والتصنيع.',
    has_content = true,
    is_active = true
  WHERE name = 'Kericho' AND country = 'Kenya';

  INSERT INTO destinations (name, country, is_active, has_content, description_en, description_ar)
  SELECT
    'Kericho', 'Kenya', true, true,
    'The undisputed tea capital of Africa, Kericho sits in the western highlands at 2,000 m, blanketed by an endless carpet of manicured tea bushes as far as the eye can see. The region receives afternoon rain almost every day, keeping the tea lush and green year-round. Guided walks through the tea estates offer a fascinating glimpse into the harvest and processing cycle that produces Kenya''s world-famous tea.',
    'عاصمة الشاي الأفريقية بلا منازع، تقع كيريتشو في المرتفعات الغربية على ارتفاع 2,000 م، مغطاة بسجادة لا نهاية لها من شجيرات الشاي المهذبة. تتلقى المنطقة أمطاراً بعد الظهر تقريباً كل يوم ما يحافظ على خضرتها طوال العام. تقدم جولات مصانع الشاي الإرشادية نظرة رائعة على دورة الحصاد والتصنيع.'
  WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Kericho' AND country = 'Kenya');

  SELECT id INTO d_kericho FROM destinations WHERE name = 'Kericho' AND country = 'Kenya';

  UPDATE destinations SET
    description_en = 'One of Kenya''s highest towns at 2,360 m, Nyahururu is famous for Thomson''s Falls — a spectacular 74-metre waterfall named after Scottish explorer Joseph Thomson. The falls thunder into a forested gorge year-round and are surrounded by a small nature walk with colobus monkeys and forest birds. The town offers a cool escape from the lowland heat and serves as a key waypoint on the Kenya highlands cycling loop.',
    description_ar = 'من أعلى مدن كينيا على ارتفاع 2,360 م، اشتهرت نياهورورو بشلالات تومسون — شلال مذهل بارتفاع 74 متراً يحمل اسم المستكشف الاسكتلندي جوزيف تومسون. تتهاوى المياه في خانق مكسو بالأشجار على مدار العام وسط ممشى طبيعي يعيش فيه القرد الكولوبوس وطيور الغابة.',
    has_content = true,
    is_active = true
  WHERE name = 'Nyahururu' AND country = 'Kenya';

  INSERT INTO destinations (name, country, is_active, has_content, description_en, description_ar)
  SELECT
    'Nyahururu', 'Kenya', true, true,
    'One of Kenya''s highest towns at 2,360 m, Nyahururu is famous for Thomson''s Falls — a spectacular 74-metre waterfall named after Scottish explorer Joseph Thomson. The falls thunder into a forested gorge year-round and are surrounded by a small nature walk with colobus monkeys and forest birds. The town offers a cool escape from the lowland heat and serves as a key waypoint on the Kenya highlands cycling loop.',
    'من أعلى مدن كينيا على ارتفاع 2,360 م، اشتهرت نياهورورو بشلالات تومسون — شلال مذهل بارتفاع 74 متراً يحمل اسم المستكشف الاسكتلندي جوزيف تومسون. تتهاوى المياه في خانق مكسو بالأشجار على مدار العام وسط ممشى طبيعي يعيش فيه القرد الكولوبوس وطيور الغابة.'
  WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Nyahururu' AND country = 'Kenya');

  SELECT id INTO d_nyahururu FROM destinations WHERE name = 'Nyahururu' AND country = 'Kenya';

  UPDATE destinations SET
    description_en = 'The forested slopes of Mount Kenya — Africa''s second-highest peak at 5,199 m — are a UNESCO World Heritage Site rich in biodiversity. Castle Forest Lodge, nestled within the Aberdare highlands at around 2,400 m, offers misty forest walks, colobus monkey sightings, and panoramic views of the mountain''s twin peaks. The Lagoon Resort nearby sits on a quiet lake, providing a serene overnight after an epic day in the saddle.',
    description_ar = 'سفوح جبل كينيا المكسوة بالغابات — ثاني أعلى قمة في أفريقيا (5,199 م) — موقع تراث عالمي لليونسكو غني بالتنوع البيولوجي. يقع كاسل فورست لودج داخل مرتفعات أبيرداري على ارتفاع 2,400 م تقريباً، ويوفر مشي في الضباب وطيور الكولوبوس ومناظر بانورامية. منتجع لاقون القريب يجلس على بحيرة هادئة بعيداً عن صخب الحياة.',
    has_content = true,
    is_active = true
  WHERE name = 'Mount Kenya Forest' AND country = 'Kenya';

  INSERT INTO destinations (name, country, is_active, has_content, description_en, description_ar)
  SELECT
    'Mount Kenya Forest', 'Kenya', true, true,
    'The forested slopes of Mount Kenya — Africa''s second-highest peak at 5,199 m — are a UNESCO World Heritage Site rich in biodiversity. Castle Forest Lodge, nestled within the Aberdare highlands at around 2,400 m, offers misty forest walks, colobus monkey sightings, and panoramic views of the mountain''s twin peaks. The Lagoon Resort nearby sits on a quiet lake, providing a serene overnight after an epic day in the saddle.',
    'سفوح جبل كينيا المكسوة بالغابات — ثاني أعلى قمة في أفريقيا (5,199 م) — موقع تراث عالمي لليونسكو غني بالتنوع البيولوجي. يقع كاسل فورست لودج داخل مرتفعات أبيرداري على ارتفاع 2,400 م تقريباً، ويوفر مشي في الضباب وطيور الكولوبوس ومناظر بانورامية. منتجع لاقون القريب يجلس على بحيرة هادئة بعيداً عن صخب الحياة.'
  WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Mount Kenya Forest' AND country = 'Kenya');

  SELECT id INTO d_mtkenyaforest FROM destinations WHERE name = 'Mount Kenya Forest' AND country = 'Kenya';

  UPDATE destinations SET
    description_en = 'A small town in the semi-arid Baringo lowlands, Marigat is the gateway to Lake Bogoria National Reserve — home to thousands of lesser flamingos and powerful natural hot springs that bubble and steam along the lakeshore. The contrast of pink flamingo flocks against the stark volcanic landscape is one of Kenya''s most striking natural spectacles.',
    description_ar = 'بلدة صغيرة في أراضي بارينغو شبه الجافة، وهي البوابة إلى محمية بحيرة بوغوريا الوطنية — موطن آلاف طيور الفلامنغو الصغيرة والينابيع الساخنة الطبيعية التي تتفجر وتتصاعد بخاراً على طول الشاطئ. يُعدّ تناقض أسراب الفلامنغو الوردية مع المشهد البركاني القاسي من أكثر المشاهد الطبيعية إثارة في كينيا.',
    has_content = true,
    is_active = true
  WHERE name = 'Marigat' AND country = 'Kenya';

  INSERT INTO destinations (name, country, is_active, has_content, description_en, description_ar)
  SELECT
    'Marigat', 'Kenya', true, true,
    'A small town in the semi-arid Baringo lowlands, Marigat is the gateway to Lake Bogoria National Reserve — home to thousands of lesser flamingos and powerful natural hot springs that bubble and steam along the lakeshore. The contrast of pink flamingo flocks against the stark volcanic landscape is one of Kenya''s most striking natural spectacles.',
    'بلدة صغيرة في أراضي بارينغو شبه الجافة، وهي البوابة إلى محمية بحيرة بوغوريا الوطنية — موطن آلاف طيور الفلامنغو الصغيرة والينابيع الساخنة الطبيعية التي تتفجر وتتصاعد بخاراً على طول الشاطئ. يُعدّ تناقض أسراب الفلامنغو الوردية مع المشهد البركاني القاسي من أكثر المشاهد الطبيعية إثارة في كينيا.'
  WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Marigat' AND country = 'Kenya');

  SELECT id INTO d_marigat FROM destinations WHERE name = 'Marigat' AND country = 'Kenya';


  -- ═══════════════════════════════════════════════════════════════
  -- 2. ACTIVITIES
  -- ═══════════════════════════════════════════════════════════════

  -- Welcome Dinner
  UPDATE activities SET
    description_en = 'A carefully curated welcome dinner bringing the group together on the eve of the adventure. Held at a quality restaurant in Nairobi, the evening features local Kenyan cuisine — nyama choma (roasted meat), ugali, sukuma wiki — alongside continental options. Your tour captain walks through the full route plan, safety briefing, and equipment check over dinner, setting the tone for the journey ahead.',
    description_ar = 'عشاء ترحيبي منظم بعناية يجمع المجموعة في ليلة ما قبل المغامرة. يُقام في مطعم راقٍ في نيروبي ويتضمن المطبخ الكيني المحلي — نياما تشوما (اللحم المشوي) والأوغالي والخضروات — إلى جانب خيارات قارية. يستعرض قائد الجولة خطة المسار الكاملة وإحاطة السلامة وفحص المعدات خلال العشاء.',
    has_content = true,
    destination_id = d_nairobi
  WHERE name = 'Welcome Dinner';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Welcome Dinner', true, true, d_nairobi,
    'A carefully curated welcome dinner bringing the group together on the eve of the adventure. Held at a quality restaurant in Nairobi, the evening features local Kenyan cuisine — nyama choma (roasted meat), ugali, sukuma wiki — alongside continental options. Your tour captain walks through the full route plan, safety briefing, and equipment check over dinner, setting the tone for the journey ahead.',
    'عشاء ترحيبي منظم بعناية يجمع المجموعة في ليلة ما قبل المغامرة. يُقام في مطعم راقٍ في نيروبي ويتضمن المطبخ الكيني المحلي — نياما تشوما (اللحم المشوي) والأوغالي والخضروات — إلى جانب خيارات قارية. يستعرض قائد الجولة خطة المسار الكاملة وإحاطة السلامة وفحص المعدات خلال العشاء.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Welcome Dinner');

  SELECT id INTO a_welcome_dinner FROM activities WHERE name = 'Welcome Dinner';

  -- Farewell Dinner
  UPDATE activities SET
    description_en = 'A celebratory farewell dinner marking the completion of the Kenya bike adventure. The group gathers to share highlights, swap stories from the road, and toast to the kilometres covered. Certificates of completion are presented to every cyclist. A fitting end to an extraordinary journey through Kenya''s highlands, lakes, and tea country.',
    description_ar = 'عشاء وداع احتفالي يُميز اختتام مغامرة ركوب الدراجات في كينيا. تجتمع المجموعة لمشاركة أبرز اللحظات وتبادل القصص من الطريق والاحتفال بالكيلومترات المقطوعة. تُسلَّم شهادات الإتمام لكل راكب دراجة. نهاية لائقة لرحلة استثنائية عبر مرتفعات كينيا وبحيراتها وأراضي الشاي.',
    has_content = true,
    destination_id = d_nairobi
  WHERE name = 'Farewell Dinner';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Farewell Dinner', true, true, d_nairobi,
    'A celebratory farewell dinner marking the completion of the Kenya bike adventure. The group gathers to share highlights, swap stories from the road, and toast to the kilometres covered. Certificates of completion are presented to every cyclist. A fitting end to an extraordinary journey through Kenya''s highlands, lakes, and tea country.',
    'عشاء وداع احتفالي يُميز اختتام مغامرة ركوب الدراجات في كينيا. تجتمع المجموعة لمشاركة أبرز اللحظات وتبادل القصص من الطريق والاحتفال بالكيلومترات المقطوعة. تُسلَّم شهادات الإتمام لكل راكب دراجة. نهاية لائقة لرحلة استثنائية عبر مرتفعات كينيا وبحيراتها وأراضي الشاي.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Farewell Dinner');

  SELECT id INTO a_farewell_dinner FROM activities WHERE name = 'Farewell Dinner';

  -- City Tour Nairobi
  UPDATE activities SET
    description_en = 'A guided orientation drive through Nairobi''s key landmarks: the historic Railway Museum, Parliament Buildings, Uhuru Park, the iconic Kenyatta International Conference Centre, and the vibrant Maasai Market. Visit the Giraffe Centre to hand-feed Rothschild giraffes, or catch the Karen Blixen Museum and elephant orphanage if time allows. A perfect introduction to the city''s layered history and culture.',
    description_ar = 'جولة توجيهية إرشادية عبر معالم نيروبي الرئيسية: متحف السكك الحديدية التاريخي ومباني البرلمان وحديقة أوهورو ومركز كينياتا الدولي للمؤتمرات والسوق الماسائي. قم بزيارة مركز الزرافة لإطعام زرافات روثشيلد، أو قصد متحف كارين بليكسن وملجأ الفيلة إن سمح الوقت. مقدمة مثالية للتاريخ والثقافة المتشابكين للمدينة.',
    has_content = true,
    destination_id = d_nairobi
  WHERE name = 'City Tour Nairobi';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'City Tour Nairobi', true, true, d_nairobi,
    'A guided orientation drive through Nairobi''s key landmarks: the historic Railway Museum, Parliament Buildings, Uhuru Park, the iconic Kenyatta International Conference Centre, and the vibrant Maasai Market. Visit the Giraffe Centre to hand-feed Rothschild giraffes, or catch the Karen Blixen Museum and elephant orphanage if time allows. A perfect introduction to the city''s layered history and culture.',
    'جولة توجيهية إرشادية عبر معالم نيروبي الرئيسية: متحف السكك الحديدية التاريخي ومباني البرلمان وحديقة أوهورو ومركز كينياتا الدولي للمؤتمرات والسوق الماسائي. قم بزيارة مركز الزرافة لإطعام زرافات روثشيلد، أو قصد متحف كارين بليكسن وملجأ الفيلة إن سمح الوقت. مقدمة مثالية للتاريخ والثقافة المتشابكين للمدينة.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'City Tour Nairobi');

  SELECT id INTO a_city_tour FROM activities WHERE name = 'City Tour Nairobi';

  -- Airport Transfer
  UPDATE activities SET
    description_en = 'Private vehicle transfer to or from Jomo Kenyatta International Airport (JKIA) or Wilson Airport. All transfers are in comfortable air-conditioned vehicles with experienced drivers who know the city routes. Luggage assistance is included. Please share your flight details in advance so pickups can be timed precisely to your arrival.',
    description_ar = 'نقل خاص بالسيارة من وإلى مطار جومو كينياتا الدولي (JKIA) أو مطار ويلسون. جميع التنقلات في مركبات مريحة مع مكيفات هواء وسائقين متمرسين يعرفون طرق المدينة. تشمل الخدمة المساعدة في الأمتعة. يرجى مشاركة تفاصيل رحلتك مسبقاً لجدولة الاستقبال بدقة.',
    has_content = true,
    destination_id = d_nairobi
  WHERE name = 'Airport Transfer';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Airport Transfer', true, true, d_nairobi,
    'Private vehicle transfer to or from Jomo Kenyatta International Airport (JKIA) or Wilson Airport. All transfers are in comfortable air-conditioned vehicles with experienced drivers who know the city routes. Luggage assistance is included. Please share your flight details in advance so pickups can be timed precisely to your arrival.',
    'نقل خاص بالسيارة من وإلى مطار جومو كينياتا الدولي (JKIA) أو مطار ويلسون. جميع التنقلات في مركبات مريحة مع مكيفات هواء وسائقين متمرسين يعرفون طرق المدينة. تشمل الخدمة المساعدة في الأمتعة. يرجى مشاركة تفاصيل رحلتك مسبقاً لجدولة الاستقبال بدقة.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Airport Transfer');

  SELECT id INTO a_airport_transfer FROM activities WHERE name = 'Airport Transfer';

  -- Bike Riding
  UPDATE activities SET
    description_en = 'The core experience of the safari — cycling through Kenya''s diverse landscapes on quality mountain bikes. Each day covers between 140 and 260 km of paved and off-road terrain, passing through the Rift Valley escarpment, highland tea country, athletics towns, and volcanic lake shores. Support vehicles shadow the group throughout, carrying luggage and providing mechanical assistance. Cyclists ride at their own pace with daily briefings and waypoints.',
    description_ar = 'التجربة الجوهرية للرحلة — ركوب الدراجات عبر المناظر الطبيعية المتنوعة لكينيا على دراجات جبلية عالية الجودة. يتراوح المسار اليومي بين 140 و260 كم من الطرق المعبدة والوعرة، مروراً بمنحدرات وادي الصدع ومرتفعات الشاي ومدن الألعاب الرياضية وشواطئ البحيرات البركانية. ترافق سيارات الدعم المجموعة طوال الوقت لحمل الأمتعة وتقديم المساعدة الميكانيكية.',
    has_content = true
  WHERE name = 'Bike Riding';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Bike Riding', true, true, NULL,
    'The core experience of the safari — cycling through Kenya''s diverse landscapes on quality mountain bikes. Each day covers between 140 and 260 km of paved and off-road terrain, passing through the Rift Valley escarpment, highland tea country, athletics towns, and volcanic lake shores. Support vehicles shadow the group throughout, carrying luggage and providing mechanical assistance. Cyclists ride at their own pace with daily briefings and waypoints.',
    'التجربة الجوهرية للرحلة — ركوب الدراجات عبر المناظر الطبيعية المتنوعة لكينيا على دراجات جبلية عالية الجودة. يتراوح المسار اليومي بين 140 و260 كم من الطرق المعبدة والوعرة، مروراً بمنحدرات وادي الصدع ومرتفعات الشاي ومدن الألعاب الرياضية وشواطئ البحيرات البركانية. ترافق سيارات الدعم المجموعة طوال الوقت لحمل الأمتعة وتقديم المساعدة الميكانيكية.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Bike Riding');

  SELECT id INTO a_bike_riding FROM activities WHERE name = 'Bike Riding';

  -- Game Drive
  UPDATE activities SET
    description_en = 'A classic open-vehicle game drive through Kenya''s reserves and national parks. Expert wildlife guides track animal movements in real time, positioning the vehicle for close encounters with the Big Five and beyond. Game drives typically run at dawn when predators are most active, and again at dusk for golden-light photography. All vehicles are 4x4 with roof hatches for unobstructed wildlife viewing.',
    description_ar = 'رحلة سفاري كلاسيكية بمركبة مفتوحة عبر محميات وحدائق كينيا الوطنية. يتتبع المرشدون خبراء الحياة البرية تحركات الحيوانات لحظةً بلحظة، لتوجيه السيارة نحو مشاهدات قريبة من الخمسة الكبار. تُنظَّم الرحلات في الفجر عندما يكون الحيوانات المفترسة أكثر نشاطاً، ومرة أخرى عند الغسق للتصوير في ضوء ذهبي.',
    has_content = true
  WHERE name = 'Game Drive';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Game Drive', true, true, NULL,
    'A classic open-vehicle game drive through Kenya''s reserves and national parks. Expert wildlife guides track animal movements in real time, positioning the vehicle for close encounters with the Big Five and beyond. Game drives typically run at dawn when predators are most active, and again at dusk for golden-light photography. All vehicles are 4x4 with roof hatches for unobstructed wildlife viewing.',
    'رحلة سفاري كلاسيكية بمركبة مفتوحة عبر محميات وحدائق كينيا الوطنية. يتتبع المرشدون خبراء الحياة البرية تحركات الحيوانات لحظةً بلحظة، لتوجيه السيارة نحو مشاهدات قريبة من الخمسة الكبار. تُنظَّم الرحلات في الفجر عندما يكون الحيوانات المفترسة أكثر نشاطاً، ومرة أخرى عند الغسق للتصوير في ضوء ذهبي.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Game Drive');

  SELECT id INTO a_game_drive FROM activities WHERE name = 'Game Drive';

  -- Guided Game Drive
  UPDATE activities SET
    description_en = 'An extended game drive led by a professional Kenya Wildlife Service certified guide with deep knowledge of local animal behaviour and ecology. The guide narrates animal tracks, vegetation types, and seasonal migration patterns throughout the drive. Ideal for guests who want an immersive educational experience alongside the wildlife viewing. Binoculars and field guides are provided.',
    description_ar = 'رحلة سفاري موسعة يقودها مرشد محترف معتمد من قِبل هيئة الحياة البرية الكينية، يتمتع بمعرفة عميقة بسلوك الحيوانات المحلية وعلم البيئة. يشرح المرشد آثار الحيوانات وأنواع النباتات وأنماط الهجرة الموسمية. مثالية لمن يرغبون في تجربة تعليمية غامرة. تُوفَّر المناظير وأدلة الحقل.',
    has_content = true
  WHERE name = 'Guided Game Drive';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Guided Game Drive', true, true, NULL,
    'An extended game drive led by a professional Kenya Wildlife Service certified guide with deep knowledge of local animal behaviour and ecology. The guide narrates animal tracks, vegetation types, and seasonal migration patterns throughout the drive. Ideal for guests who want an immersive educational experience alongside the wildlife viewing. Binoculars and field guides are provided.',
    'رحلة سفاري موسعة يقودها مرشد محترف معتمد من قِبل هيئة الحياة البرية الكينية، يتمتع بمعرفة عميقة بسلوك الحيوانات المحلية وعلم البيئة. يشرح المرشد آثار الحيوانات وأنواع النباتات وأنماط الهجرة الموسمية. مثالية لمن يرغبون في تجربة تعليمية غامرة. تُوفَّر المناظير وأدلة الحقل.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Guided Game Drive');

  SELECT id INTO a_guided_game_drive FROM activities WHERE name = 'Guided Game Drive';

  -- Night Game Drive
  UPDATE activities SET
    description_en = 'A thrilling after-dark safari using powerful spotlights to reveal Kenya''s nocturnal wildlife — leopards on the prowl, spotted hyenas on patrol, aardvarks, bush babies, civets, and the elusive serval cat. Night drives operate only in specific reserves where permitted, and the guides'' spotlight technique creates dramatic close-range encounters impossible during daylight hours.',
    description_ar = 'سفاري مثيرة بعد حلول الظلام تستخدم مصابيح ضوئية قوية للكشف عن الحياة البرية الليلية في كينيا — الفهد في دورياته والضبع المنقط في جولاته والخنزير الأرضي وطفل الشجيرات والزباد وقط السيرفال المراوغ. تعمل رحلات الليل في محميات معينة فقط وتخلق مشاهدات درامية مقربة مستحيلة في النهار.',
    has_content = true
  WHERE name = 'Night Game Drive';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Night Game Drive', true, true, NULL,
    'A thrilling after-dark safari using powerful spotlights to reveal Kenya''s nocturnal wildlife — leopards on the prowl, spotted hyenas on patrol, aardvarks, bush babies, civets, and the elusive serval cat. Night drives operate only in specific reserves where permitted, and the guides'' spotlight technique creates dramatic close-range encounters impossible during daylight hours.',
    'سفاري مثيرة بعد حلول الظلام تستخدم مصابيح ضوئية قوية للكشف عن الحياة البرية الليلية في كينيا — الفهد في دورياته والضبع المنقط في جولاته والخنزير الأرضي وطفل الشجيرات والزباد وقط السيرفال المراوغ. تعمل رحلات الليل في محميات معينة فقط وتخلق مشاهدات درامية مقربة مستحيلة في النهار.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Night Game Drive');

  SELECT id INTO a_night_game_drive FROM activities WHERE name = 'Night Game Drive';

  -- Aberdare National Park Game Drive
  UPDATE activities SET
    description_en = 'A game drive through the misty moorlands and dense forest of Aberdare National Park, one of Kenya''s most atmospheric wilderness areas. The park is renowned for its unique highland ecosystem, elephant herds, giant forest hogs, bongo antelopes, leopards, and black rhinos. Game drives here often pass through fog-draped bamboo zones and across moorland streams, creating an ethereal safari experience quite unlike the open savannah.',
    description_ar = 'رحلة سفاري عبر المراعي الضبابية والغابات الكثيفة في محمية أبيرداري الوطنية، إحدى أكثر مناطق البرية في كينيا غموضاً. تشتهر المحمية بنظامها البيئي المرتفع الفريد وقطعان الأفيال والخنزير البري الضخم وظبي البونغو والفهد ووحيد القرن الأسود. كثيراً ما تمر الرحلات عبر مناطق الخيزران الضبابية وجداول المراعي الجبلية.',
    has_content = true,
    destination_id = d_mtkenyaforest
  WHERE name = 'Aberdare National Park Game Drive';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Aberdare National Park Game Drive', true, true, d_mtkenyaforest,
    'A game drive through the misty moorlands and dense forest of Aberdare National Park, one of Kenya''s most atmospheric wilderness areas. The park is renowned for its unique highland ecosystem, elephant herds, giant forest hogs, bongo antelopes, leopards, and black rhinos. Game drives here often pass through fog-draped bamboo zones and across moorland streams, creating an ethereal safari experience quite unlike the open savannah.',
    'رحلة سفاري عبر المراعي الضبابية والغابات الكثيفة في محمية أبيرداري الوطنية، إحدى أكثر مناطق البرية في كينيا غموضاً. تشتهر المحمية بنظامها البيئي المرتفع الفريد وقطعان الأفيال والخنزير البري الضخم وظبي البونغو والفهد ووحيد القرن الأسود. كثيراً ما تمر الرحلات عبر مناطق الخيزران الضبابية وجداول المراعي الجبلية.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Aberdare National Park Game Drive');

  SELECT id INTO a_aberdare_drive FROM activities WHERE name = 'Aberdare National Park Game Drive';

  -- Boat Safari on Lake Naivasha
  UPDATE activities SET
    description_en = 'A guided motorboat excursion on the glassy waters of Lake Naivasha, one of the Rift Valley''s most bird-rich lakes. The boat glides among papyrus beds where African fish eagles swoop for catches, cormorants dry their wings, and kingfishers dart in flashes of electric blue. Hippo pods surface unexpectedly close to the boat as the golden sunset reflects off the water. Evening departures are particularly magical.',
    description_ar = 'رحلة بزورق مرشد على المياه الهادئة لبحيرة نايفاشا، إحدى أغنى بحيرات وادي الصدع بالطيور. يتزلج الزورق بين أحراش البردي حيث ينقضّ عقاب السمك الأفريقي على فريسته ويجفف الكورموران جناحيه ويتسلل طائر الرفراف في وميض أزرق كهربائي. تظهر مجموعات أفراس النهر قريبةً بشكل غير متوقع بينما ينعكس غروب الشمس الذهبي على الماء.',
    has_content = true,
    destination_id = d_naivasha
  WHERE name = 'Boat Safari on Lake Naivasha';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Boat Safari on Lake Naivasha', true, true, d_naivasha,
    'A guided motorboat excursion on the glassy waters of Lake Naivasha, one of the Rift Valley''s most bird-rich lakes. The boat glides among papyrus beds where African fish eagles swoop for catches, cormorants dry their wings, and kingfishers dart in flashes of electric blue. Hippo pods surface unexpectedly close to the boat as the golden sunset reflects off the water. Evening departures are particularly magical.',
    'رحلة بزورق مرشد على المياه الهادئة لبحيرة نايفاشا، إحدى أغنى بحيرات وادي الصدع بالطيور. يتزلج الزورق بين أحراش البردي حيث ينقضّ عقاب السمك الأفريقي على فريسته ويجفف الكورموران جناحيه ويتسلل طائر الرفراف في وميض أزرق كهربائي. تظهر مجموعات أفراس النهر قريبةً بشكل غير متوقع بينما ينعكس غروب الشمس الذهبي على الماء.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Boat Safari on Lake Naivasha');

  SELECT id INTO a_boat_naivasha FROM activities WHERE name = 'Boat Safari on Lake Naivasha';

  -- Bush Walk with Armed Ranger
  UPDATE activities SET
    description_en = 'A guided walking safari escorted by a Kenya Wildlife Service armed ranger — the most intimate way to experience Africa''s wilderness. On foot, you read animal tracks, identify medicinal plants, and learn the survival skills of Kenya''s pastoral communities. The armed escort is a safety measure that allows walking in areas populated by big game, bringing you close to nature in a way no vehicle ever can.',
    description_ar = 'سفاري مشي إرشادي برفقة حارس مسلح من هيئة الحياة البرية الكينية — الطريقة الأكثر حميمية لتجربة البرية الأفريقية. سيراً على الأقدام تقرأ آثار الحيوانات وتتعرف على النباتات الطبية وتتعلم مهارات البقاء لدى مجتمعات كينيا الرعوية. الحارس المسلح وسيلة أمان تتيح المشي في مناطق يقطنها الصيد الكبير.',
    has_content = true
  WHERE name = 'Bush Walk with Armed Ranger';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Bush Walk with Armed Ranger', true, true, NULL,
    'A guided walking safari escorted by a Kenya Wildlife Service armed ranger — the most intimate way to experience Africa''s wilderness. On foot, you read animal tracks, identify medicinal plants, and learn the survival skills of Kenya''s pastoral communities. The armed escort is a safety measure that allows walking in areas populated by big game, bringing you close to nature in a way no vehicle ever can.',
    'سفاري مشي إرشادي برفقة حارس مسلح من هيئة الحياة البرية الكينية — الطريقة الأكثر حميمية لتجربة البرية الأفريقية. سيراً على الأقدام تقرأ آثار الحيوانات وتتعرف على النباتات الطبية وتتعلم مهارات البقاء لدى مجتمعات كينيا الرعوية. الحارس المسلح وسيلة أمان تتيح المشي في مناطق يقطنها الصيد الكبير.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Bush Walk with Armed Ranger');

  SELECT id INTO a_bush_walk FROM activities WHERE name = 'Bush Walk with Armed Ranger';

  -- Coffee Farm Visit
  UPDATE activities SET
    description_en = 'A guided tour of a Kenyan coffee estate — the country produces some of the world''s most sought-after Arabica beans. Walk through the shaded plantation rows, learn to identify the red coffee cherries at peak ripeness, and follow the bean from hand-picking through pulping, fermentation, washing, and drying. End with a cupping session to taste the distinct profiles of Kenya''s highland-grown coffee.',
    description_ar = 'جولة إرشادية في مزرعة قهوة كينية — تُنتج البلاد بعضاً من أكثر حبوب الأرابيكا طلباً في العالم. امش بين صفوف المزرعة المظللة وتعلم التعرف على كرز القهوة الأحمر عند ذروة نضجه، وتابع حبة القهوة من القطف اليدوي عبر التقشير والتخمير والغسيل والتجفيف. اختتم بجلسة تذوق لاستكشاف النكهات المميزة للقهوة الكينية.',
    has_content = true,
    destination_id = d_nairobi
  WHERE name = 'Coffee Farm Visit';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Coffee Farm Visit', true, true, d_nairobi,
    'A guided tour of a Kenyan coffee estate — the country produces some of the world''s most sought-after Arabica beans. Walk through the shaded plantation rows, learn to identify the red coffee cherries at peak ripeness, and follow the bean from hand-picking through pulping, fermentation, washing, and drying. End with a cupping session to taste the distinct profiles of Kenya''s highland-grown coffee.',
    'جولة إرشادية في مزرعة قهوة كينية — تُنتج البلاد بعضاً من أكثر حبوب الأرابيكا طلباً في العالم. امش بين صفوف المزرعة المظللة وتعلم التعرف على كرز القهوة الأحمر عند ذروة نضجه، وتابع حبة القهوة من القطف اليدوي عبر التقشير والتخمير والغسيل والتجفيف. اختتم بجلسة تذوق لاستكشاف النكهات المميزة للقهوة الكينية.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Coffee Farm Visit');

  SELECT id INTO a_coffee_farm FROM activities WHERE name = 'Coffee Farm Visit';

  -- Forest Hike Castle Forest
  UPDATE activities SET
    description_en = 'A guided hike through the ancient montane forest surrounding Castle Forest Lodge on the slopes of Mount Kenya. The trail winds through moss-draped trees where black-and-white colobus monkeys leap overhead, sunbirds flash between giant tree heathers, and the mist rolls in from the mountain above. A naturalist guide identifies plants, fungi, and animal signs along the route. One of the most atmospheric forest experiences in East Africa.',
    description_ar = 'مشية إرشادية عبر الغابة الجبلية القديمة المحيطة بـ كاسل فورست لودج على سفوح جبل كينيا. يتعرج الممر عبر الأشجار المغطاة بالطحالب حيث تقفز قرود الكولوبوس الأبيض والأسود، وتتراقص طيور الشمس بين خلنجات الأشجار الضخمة، ويتسلل الضباب من الجبل. يحدد المرشد الطبيعي النباتات والفطريات وعلامات الحيوانات على طول الطريق.',
    has_content = true,
    destination_id = d_mtkenyaforest
  WHERE name = 'Forest Hike Castle Forest';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Forest Hike Castle Forest', true, true, d_mtkenyaforest,
    'A guided hike through the ancient montane forest surrounding Castle Forest Lodge on the slopes of Mount Kenya. The trail winds through moss-draped trees where black-and-white colobus monkeys leap overhead, sunbirds flash between giant tree heathers, and the mist rolls in from the mountain above. A naturalist guide identifies plants, fungi, and animal signs along the route. One of the most atmospheric forest experiences in East Africa.',
    'مشية إرشادية عبر الغابة الجبلية القديمة المحيطة بـ كاسل فورست لودج على سفوح جبل كينيا. يتعرج الممر عبر الأشجار المغطاة بالطحالب حيث تقفز قرود الكولوبوس الأبيض والأسود، وتتراقص طيور الشمس بين خلنجات الأشجار الضخمة، ويتسلل الضباب من الجبل. يحدد المرشد الطبيعي النباتات والفطريات وعلامات الحيوانات على طول الطريق.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Forest Hike Castle Forest');

  SELECT id INTO a_forest_hike FROM activities WHERE name = 'Forest Hike Castle Forest';

  -- Horseback Riding
  UPDATE activities SET
    description_en = 'A horseback safari through the landscapes surrounding Lake Naivasha — one of the most thrilling ways to encounter wildlife. Riders move silently through the bush, allowing closer approaches to zebras, giraffes, and wildebeest than any vehicle could achieve. Guided rides cater to all experience levels from beginners to experienced equestrians, with experienced wranglers and well-trained horses ensuring safety throughout.',
    description_ar = 'سفاري على ظهر الخيل عبر المناظر الطبيعية المحيطة ببحيرة نايفاشا — واحدة من أكثر الطرق إثارة لمشاهدة الحياة البرية. يتحرك الفرسان بصمت عبر الأدغال مما يتيح الاقتراب أكثر من الحمير الوحشية والزرافات والحيوانات. تلائم الجولات الإرشادية جميع مستويات الخبرة مع مدربين ذوي خبرة وخيول مدربة جيداً.',
    has_content = true,
    destination_id = d_naivasha
  WHERE name = 'Horseback Riding';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Horseback Riding', true, true, d_naivasha,
    'A horseback safari through the landscapes surrounding Lake Naivasha — one of the most thrilling ways to encounter wildlife. Riders move silently through the bush, allowing closer approaches to zebras, giraffes, and wildebeest than any vehicle could achieve. Guided rides cater to all experience levels from beginners to experienced equestrians, with experienced wranglers and well-trained horses ensuring safety throughout.',
    'سفاري على ظهر الخيل عبر المناظر الطبيعية المحيطة ببحيرة نايفاشا — واحدة من أكثر الطرق إثارة لمشاهدة الحياة البرية. يتحرك الفرسان بصمت عبر الأدغال مما يتيح الاقتراب أكثر من الحمير الوحشية والزرافات والحيوانات. تلائم الجولات الإرشادية جميع مستويات الخبرة مع مدربين ذوي خبرة وخيول مدربة جيداً.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Horseback Riding');

  SELECT id INTO a_horseback FROM activities WHERE name = 'Horseback Riding';

  -- Hot Air Balloon Safari
  UPDATE activities SET
    description_en = 'A dawn hot-air balloon flight over Kenya''s wilderness — widely considered one of the most spectacular wildlife experiences on earth. The balloon ascends silently at first light, drifting above herds of elephant, lion prides, and vast plains as the golden sunrise illuminates the landscape. Flights typically last 60–90 minutes and conclude with a champagne bush breakfast. Subject to weather conditions and advance booking.',
    description_ar = 'رحلة بالمنطاد عند الفجر فوق البرية الكينية — تُعدّ على نطاق واسع من أروع تجارب مشاهدة الحياة البرية في العالم. يرتفع المنطاد بصمت عند أول ضوء النهار منجرفاً فوق قطعان الأفيال وأسراب الأسود والسهول الشاسعة بينما يضيء شروق الشمس الذهبي المشهد. تستمر الرحلات 60-90 دقيقة وتنتهي بإفطار شمبانيا في العراء. تخضع للأحوال الجوية والحجز المسبق.',
    has_content = true
  WHERE name = 'Hot Air Balloon Safari';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Hot Air Balloon Safari', true, true, NULL,
    'A dawn hot-air balloon flight over Kenya''s wilderness — widely considered one of the most spectacular wildlife experiences on earth. The balloon ascends silently at first light, drifting above herds of elephant, lion prides, and vast plains as the golden sunrise illuminates the landscape. Flights typically last 60–90 minutes and conclude with a champagne bush breakfast. Subject to weather conditions and advance booking.',
    'رحلة بالمنطاد عند الفجر فوق البرية الكينية — تُعدّ على نطاق واسع من أروع تجارب مشاهدة الحياة البرية في العالم. يرتفع المنطاد بصمت عند أول ضوء النهار منجرفاً فوق قطعان الأفيال وأسراب الأسود والسهول الشاسعة بينما يضيء شروق الشمس الذهبي المشهد. تستمر الرحلات 60-90 دقيقة وتنتهي بإفطار شمبانيا في العراء. تخضع للأحوال الجوية والحجز المسبق.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Hot Air Balloon Safari');

  SELECT id INTO a_balloon FROM activities WHERE name = 'Hot Air Balloon Safari';

  -- Maasai Village Visit
  UPDATE activities SET
    description_en = 'A respectful cultural visit to a traditional Maasai manyatta (village) — one of Kenya''s most iconic cultural experiences. Warriors in full red shuka and beaded jewellery demonstrate the adumu (jumping dance), fire-making, and spear throwing. Elders explain the pastoral lifestyle, cattle-centred economy, and age-grade social system. Traditional crafts and beadwork are available directly from the artisans. Entrance fees go directly to the community.',
    description_ar = 'زيارة ثقافية محترمة لقرية مانياتا الماسائية التقليدية — واحدة من أكثر التجارب الثقافية المميزة في كينيا. يُظهر المحاربون في الشوكا الحمراء والمجوهرات المخرزة رقصة أدوم (رقصة القفز) وصنع النار وإلقاء الرمح. يشرح كبار السن أسلوب الحياة الرعوي والاقتصاد القائم على الماشية والنظام الاجتماعي. المنتجات الحرفية والأعمال المخرزة متاحة مباشرة من الحرفيين. تذهب رسوم الدخول مباشرة إلى المجتمع.',
    has_content = true
  WHERE name = 'Maasai Village Visit';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Maasai Village Visit', true, true, NULL,
    'A respectful cultural visit to a traditional Maasai manyatta (village) — one of Kenya''s most iconic cultural experiences. Warriors in full red shuka and beaded jewellery demonstrate the adumu (jumping dance), fire-making, and spear throwing. Elders explain the pastoral lifestyle, cattle-centred economy, and age-grade social system. Traditional crafts and beadwork are available directly from the artisans. Entrance fees go directly to the community.',
    'زيارة ثقافية محترمة لقرية مانياتا الماسائية التقليدية — واحدة من أكثر التجارب الثقافية المميزة في كينيا. يُظهر المحاربون في الشوكا الحمراء والمجوهرات المخرزة رقصة أدوم (رقصة القفز) وصنع النار وإلقاء الرمح. يشرح كبار السن أسلوب الحياة الرعوي والاقتصاد القائم على الماشية والنظام الاجتماعي. المنتجات الحرفية والأعمال المخرزة متاحة مباشرة من الحرفيين. تذهب رسوم الدخول مباشرة إلى المجتمع.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Maasai Village Visit');

  SELECT id INTO a_maasai_village FROM activities WHERE name = 'Maasai Village Visit';

  -- Observation Hill Sundowner
  UPDATE activities SET
    description_en = 'A sundowner visit to Observation Hill inside Lake Nakuru National Park — a raised viewpoint offering sweeping panoramas over the entire lake, the pink flamingo flocks massed at the shore, and the Rift Valley escarpment beyond. The guide brings cool drinks and snacks as the sun descends, painting the soda lake in shades of gold and rose. One of Kenya''s most photographed sunsets.',
    description_ar = 'زيارة غروب الشمس إلى تلة الرصد داخل حديقة بحيرة ناكورو الوطنية — منظور مرتفع يُطل على البحيرة بأكملها وأسراب الفلامنغو الوردية المحتشدة على الشاطئ وهضبة وادي الصدع خلفها. يُحضر المرشد مشروبات باردة ووجبات خفيفة بينما تنحدر الشمس وتلون بحيرة الصودا بألوان ذهبية وورديه. أحد أكثر مشاهد الغروب تصويراً في كينيا.',
    has_content = true,
    destination_id = d_nakuru
  WHERE name = 'Observation Hill Sundowner';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Observation Hill Sundowner', true, true, d_nakuru,
    'A sundowner visit to Observation Hill inside Lake Nakuru National Park — a raised viewpoint offering sweeping panoramas over the entire lake, the pink flamingo flocks massed at the shore, and the Rift Valley escarpment beyond. The guide brings cool drinks and snacks as the sun descends, painting the soda lake in shades of gold and rose. One of Kenya''s most photographed sunsets.',
    'زيارة غروب الشمس إلى تلة الرصد داخل حديقة بحيرة ناكورو الوطنية — منظور مرتفع يُطل على البحيرة بأكملها وأسراب الفلامنغو الوردية المحتشدة على الشاطئ وهضبة وادي الصدع خلفها. يُحضر المرشد مشروبات باردة ووجبات خفيفة بينما تنحدر الشمس وتلون بحيرة الصودا بألوان ذهبية وورديه. أحد أكثر مشاهد الغروب تصويراً في كينيا.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Observation Hill Sundowner');

  SELECT id INTO a_obs_hill FROM activities WHERE name = 'Observation Hill Sundowner';

  -- Photography Masterclass
  UPDATE activities SET
    description_en = 'An in-field photography workshop led by a professional wildlife photographer, designed to help guests capture the best images of their safari. The session covers camera settings for fast-moving animals, golden-hour composition, and techniques for low-light lion and leopard shots. Whether you are shooting with a DSLR or a smartphone, the guide tailors advice to your equipment. Operates during the morning or evening game drive.',
    description_ar = 'ورشة تصوير ميدانية يقودها مصور بري محترف، صُمِّمت لمساعدة الضيوف على التقاط أفضل الصور في رحلتهم. يتناول الجلسة إعدادات الكاميرا للحيوانات سريعة الحركة وتكوين صورة الساعة الذهبية وتقنيات التصوير في ضوء منخفض للأسود والفهود. سواء كنت تصور بـ DSLR أو هاتف ذكي، يكيّف المرشد نصائحه مع معداتك.',
    has_content = true
  WHERE name = 'Photography Masterclass';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Photography Masterclass', true, true, NULL,
    'An in-field photography workshop led by a professional wildlife photographer, designed to help guests capture the best images of their safari. The session covers camera settings for fast-moving animals, golden-hour composition, and techniques for low-light lion and leopard shots. Whether you are shooting with a DSLR or a smartphone, the guide tailors advice to your equipment. Operates during the morning or evening game drive.',
    'ورشة تصوير ميدانية يقودها مصور بري محترف، صُمِّمت لمساعدة الضيوف على التقاط أفضل الصور في رحلتهم. يتناول الجلسة إعدادات الكاميرا للحيوانات سريعة الحركة وتكوين صورة الساعة الذهبية وتقنيات التصوير في ضوء منخفض للأسود والفهود. سواء كنت تصور بـ DSLR أو هاتف ذكي، يكيّف المرشد نصائحه مع معداتك.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Photography Masterclass');

  SELECT id INTO a_photography FROM activities WHERE name = 'Photography Masterclass';

  -- Sanctuary Farm Visit
  UPDATE activities SET
    description_en = 'A visit to Sanctuary Farm on the shores of Lake Naivasha — a private conservancy home to Rothschild giraffes, zebras, Cape buffaloes, and over 200 bird species. Guests walk freely among the giraffes, feed them from hand, and explore the lakeshore under the guidance of a naturalist. Optional boat trips, cycling within the property, and sundowner drinks overlooking the lake complete a perfect afternoon.',
    description_ar = 'زيارة لمزرعة سانكتشري على شواطئ بحيرة نايفاشا — محمية خاصة تضم زرافات روثشيلد والحمير الوحشية وجاموس الرأس والبيسون وأكثر من 200 نوع من الطيور. يتجول الضيوف بحرية بين الزرافات ويطعمونها من يدهم ويستكشفون الشاطئ بإرشاد من عالم طبيعة. تكمل رحلات الزوارق الاختيارية وركوب الدراجات والمشروبات بين شواطئ البحيرة فترة ما بعد الظهر المثالية.',
    has_content = true,
    destination_id = d_naivasha
  WHERE name = 'Sanctuary Farm Visit';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Sanctuary Farm Visit', true, true, d_naivasha,
    'A visit to Sanctuary Farm on the shores of Lake Naivasha — a private conservancy home to Rothschild giraffes, zebras, Cape buffaloes, and over 200 bird species. Guests walk freely among the giraffes, feed them from hand, and explore the lakeshore under the guidance of a naturalist. Optional boat trips, cycling within the property, and sundowner drinks overlooking the lake complete a perfect afternoon.',
    'زيارة لمزرعة سانكتشري على شواطئ بحيرة نايفاشا — محمية خاصة تضم زرافات روثشيلد والحمير الوحشية وجاموس الرأس والبيسون وأكثر من 200 نوع من الطيور. يتجول الضيوف بحرية بين الزرافات ويطعمونها من يدهم ويستكشفون الشاطئ بإرشاد من عالم طبيعة. تكمل رحلات الزوارق الاختيارية وركوب الدراجات والمشروبات بين شواطئ البحيرة فترة ما بعد الظهر المثالية.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Sanctuary Farm Visit');

  SELECT id INTO a_sanctuary_farm FROM activities WHERE name = 'Sanctuary Farm Visit';

  -- Thomson Falls Visit
  UPDATE activities SET
    description_en = 'A visit to Thomson''s Falls in Nyahururu — a breathtaking 74-metre waterfall named after Scottish explorer Joseph Thomson who "discovered" it in 1883. The falls plunge into a deep forested gorge surrounded by colobus monkeys and colourful forest birds. A short walking trail descends to the base of the falls for an up-close view of the thundering torrent. Local artisans sell carvings and crafts near the viewing platform.',
    description_ar = 'زيارة شلالات تومسون في نياهورورو — شلال مبهر بارتفاع 74 متراً يحمل اسم المستكشف الاسكتلندي جوزيف تومسون الذي "اكتشفه" عام 1883. تنهمر المياه في خانق غابوي عميق تسكنه قرود الكولوبوس وطيور الغابة الملونة. يهبط ممر مشي قصير إلى قاعدة الشلالات للمشاهدة عن قرب. يبيع الحرفيون المحليون المنحوتات والأعمال الحرفية بالقرب من منصة المشاهدة.',
    has_content = true,
    destination_id = d_nyahururu
  WHERE name = 'Thomson Falls Visit';

  INSERT INTO activities (name, is_active, has_content, destination_id, description_en, description_ar)
  SELECT
    'Thomson Falls Visit', true, true, d_nyahururu,
    'A visit to Thomson''s Falls in Nyahururu — a breathtaking 74-metre waterfall named after Scottish explorer Joseph Thomson who "discovered" it in 1883. The falls plunge into a deep forested gorge surrounded by colobus monkeys and colourful forest birds. A short walking trail descends to the base of the falls for an up-close view of the thundering torrent. Local artisans sell carvings and crafts near the viewing platform.',
    'زيارة شلالات تومسون في نياهورورو — شلال مبهر بارتفاع 74 متراً يحمل اسم المستكشف الاسكتلندي جوزيف تومسون الذي "اكتشفه" عام 1883. تنهمر المياه في خانق غابوي عميق تسكنه قرود الكولوبوس وطيور الغابة الملونة. يهبط ممر مشي قصير إلى قاعدة الشلالات للمشاهدة عن قرب. يبيع الحرفيون المحليون المنحوتات والأعمال الحرفية بالقرب من منصة المشاهدة.'
  WHERE NOT EXISTS (SELECT 1 FROM activities WHERE name = 'Thomson Falls Visit');

  SELECT id INTO a_thomson_falls FROM activities WHERE name = 'Thomson Falls Visit';


  -- ═══════════════════════════════════════════════════════════════
  -- 3. PARKS & RESERVES
  -- ═══════════════════════════════════════════════════════════════

  UPDATE parks SET
    description_en = 'A unique national park near Lake Naivasha famous for its dramatic volcanic gorge, towering rock columns, and geothermal steam vents. Hells Gate is one of Kenya''s only parks where visitors can walk, cycle, and hike freely among wildlife including zebras, giraffes, buffalo, hyenas, and leopards — without the safety of a vehicle. The 68 sq km park is also home to over 100 bird species and stunning cliff-face vulture colonies. The gorge walls reach 120 metres and the walking trail to the inner gorge follows the same route as the animated film The Lion King drew inspiration from.',
    description_ar = 'حديقة وطنية فريدة بالقرب من بحيرة نايفاشا، تشتهر بخانقها البركاني الدرامي وأعمدة الصخور الشاهقة وفوهات البخار الحرارية الأرضية. تُعدّ هيلز غيت إحدى المحميات النادرة في كينيا حيث يمكن للزوار المشي وركوب الدراجات والتنزه بحرية بين الحياة البرية — الحمير الوحشية والزرافات والجاموس والضباع والفهود — دون الحماية من مركبة. تضم المحمية البالغة 68 كم² أكثر من 100 نوع من الطيور ومستعمرات النسور الرائعة على واجهات الجروف.',
    is_active = true
  WHERE name = 'Hells Gate National Park' AND country = 'Kenya';

  INSERT INTO parks (name, country, is_active, description_en, description_ar)
  SELECT
    'Hells Gate National Park', 'Kenya', true,
    'A unique national park near Lake Naivasha famous for its dramatic volcanic gorge, towering rock columns, and geothermal steam vents. Hells Gate is one of Kenya''s only parks where visitors can walk, cycle, and hike freely among wildlife including zebras, giraffes, buffalo, hyenas, and leopards — without the safety of a vehicle. The 68 sq km park is also home to over 100 bird species and stunning cliff-face vulture colonies. The gorge walls reach 120 metres and the walking trail to the inner gorge follows the same route as the animated film The Lion King drew inspiration from.',
    'حديقة وطنية فريدة بالقرب من بحيرة نايفاشا، تشتهر بخانقها البركاني الدرامي وأعمدة الصخور الشاهقة وفوهات البخار الحرارية الأرضية. تُعدّ هيلز غيت إحدى المحميات النادرة في كينيا حيث يمكن للزوار المشي وركوب الدراجات والتنزه بحرية بين الحياة البرية — الحمير الوحشية والزرافات والجاموس والضباع والفهود — دون الحماية من مركبة. تضم المحمية البالغة 68 كم² أكثر من 100 نوع من الطيور ومستعمرات النسور الرائعة على واجهات الجروف.'
  WHERE NOT EXISTS (SELECT 1 FROM parks WHERE name = 'Hells Gate National Park' AND country = 'Kenya');

  UPDATE parks SET
    description_en = 'A protected parkland encircling Lake Nakuru in the Rift Valley, famous worldwide for its vast flocks of lesser and greater flamingos that turn the lake''s shores a vivid pink. The 188 sq km park is a rhino sanctuary for both black and white rhinos and is home to lions, leopards, Rothschild giraffes, waterbucks, and over 400 bird species. Observation Hill provides a panoramic viewpoint over the entire lake. The park is one of Kenya''s most visited and rewards visitors year-round.',
    description_ar = 'منطقة محمية تحيط ببحيرة ناكورو في وادي الصدع، تشتهر عالمياً بأسراب الفلامنغو الصغير والكبير الهائلة التي تحوّل شواطئ البحيرة إلى اللون الوردي الزاهي. المحمية البالغة 188 كم² ملجأ لوحيد القرن الأسود والأبيض معاً وموطن للأسود والفهود وزرافات روثشيلد والواترباك وأكثر من 400 نوع من الطيور. تلة الرصد تقدم منظوراً بانورامياً على البحيرة بأكملها. إحدى أكثر محميات كينيا زيارةً وتكافئ الزوار على مدار العام.',
    is_active = true
  WHERE name = 'Lake Nakuru National Park' AND country = 'Kenya';

  INSERT INTO parks (name, country, is_active, description_en, description_ar)
  SELECT
    'Lake Nakuru National Park', 'Kenya', true,
    'A protected parkland encircling Lake Nakuru in the Rift Valley, famous worldwide for its vast flocks of lesser and greater flamingos that turn the lake''s shores a vivid pink. The 188 sq km park is a rhino sanctuary for both black and white rhinos and is home to lions, leopards, Rothschild giraffes, waterbucks, and over 400 bird species. Observation Hill provides a panoramic viewpoint over the entire lake. The park is one of Kenya''s most visited and rewards visitors year-round.',
    'منطقة محمية تحيط ببحيرة ناكورو في وادي الصدع، تشتهر عالمياً بأسراب الفلامنغو الصغير والكبير الهائلة التي تحوّل شواطئ البحيرة إلى اللون الوردي الزاهي. المحمية البالغة 188 كم² ملجأ لوحيد القرن الأسود والأبيض معاً وموطن للأسود والفهود وزرافات روثشيلد والواترباك وأكثر من 400 نوع من الطيور. تلة الرصد تقدم منظوراً بانورامياً على البحيرة بأكملها. إحدى أكثر محميات كينيا زيارةً وتكافئ الزوار على مدار العام.'
  WHERE NOT EXISTS (SELECT 1 FROM parks WHERE name = 'Lake Nakuru National Park' AND country = 'Kenya');

  UPDATE parks SET
    description_en = 'A highland wilderness park covering the Aberdare mountain range at altitudes between 2,000 and 4,000 metres. The park''s diverse habitats — rainforest, bamboo zones, moorland, and alpine meadow — support an extraordinary range of wildlife including elephants, buffalo, black rhinos, giant forest hogs, bongo antelopes, leopards, hyenas, and colobus monkeys. The famous Ark and Treetops lodges offer night-time wildlife viewing over floodlit waterholes. Waterfalls including the 300-metre Gura Falls are among Kenya''s highest.',
    description_ar = 'محمية برية جبلية تغطي سلسلة جبال أبيرداري على ارتفاعات تتراوح بين 2,000 و4,000 متر. تدعم الموائل المتنوعة للمحمية — الغابات المطيرة ومناطق الخيزران والمراعي والمروج الألبية — مجموعة استثنائية من الحياة البرية: الأفيال والجاموس ووحيد القرن الأسود والخنزير البري الضخم وظبي البونغو والفهد والضبع وقرد الكولوبوس. توفر مطاعم The Ark وTreetops الشهيرة مشاهدة الحياة البرية ليلاً على مواقع الشرب المضاءة.',
    is_active = true
  WHERE name = 'Aberdare National Park' AND country = 'Kenya';

  INSERT INTO parks (name, country, is_active, description_en, description_ar)
  SELECT
    'Aberdare National Park', 'Kenya', true,
    'A highland wilderness park covering the Aberdare mountain range at altitudes between 2,000 and 4,000 metres. The park''s diverse habitats — rainforest, bamboo zones, moorland, and alpine meadow — support an extraordinary range of wildlife including elephants, buffalo, black rhinos, giant forest hogs, bongo antelopes, leopards, hyenas, and colobus monkeys. The famous Ark and Treetops lodges offer night-time wildlife viewing over floodlit waterholes. Waterfalls including the 300-metre Gura Falls are among Kenya''s highest.',
    'محمية برية جبلية تغطي سلسلة جبال أبيرداري على ارتفاعات تتراوح بين 2,000 و4,000 متر. تدعم الموائل المتنوعة للمحمية — الغابات المطيرة ومناطق الخيزران والمراعي والمروج الألبية — مجموعة استثنائية من الحياة البرية: الأفيال والجاموس ووحيد القرن الأسود والخنزير البري الضخم وظبي البونغو والفهد والضبع وقرد الكولوبوس. توفر مطاعم The Ark وTreetops الشهيرة مشاهدة الحياة البرية ليلاً على مواقع الشرب المضاءة.'
  WHERE NOT EXISTS (SELECT 1 FROM parks WHERE name = 'Aberdare National Park' AND country = 'Kenya');

  UPDATE parks SET
    description_en = 'A soda lake reserve in the northern Rift Valley renowned for its spectacular concentrations of lesser flamingos and powerful boiling hot springs that bubble and spout along the eastern shoreline. The alkaline lake sits in a dramatic rocky escarpment and is one of the most volcanically active landscapes in Kenya. Greater kudus frequent the surrounding scrubland, and the lake hosts some of East Africa''s largest flamingo aggregations when water levels are right.',
    description_ar = 'محمية بحيرة صودا في شمال وادي الصدع تشتهر بتركزات الفلامنغو الصغير الاستثنائية والينابيع الساخنة المغلية القوية التي تفور وتتطاير على طول الشاطئ الشرقي. تقع البحيرة القلوية في منحدر صخري درامي وتُعدّ من أكثر المناطق البركانية نشاطاً في كينيا. تتردد الكودو الكبيرة على الأراضي المحيطة، وتستضيف البحيرة بعضاً من أكبر تجمعات الفلامنغو في شرق أفريقيا.',
    is_active = true
  WHERE name = 'Lake Bogoria National Reserve' AND country = 'Kenya';

  INSERT INTO parks (name, country, is_active, description_en, description_ar)
  SELECT
    'Lake Bogoria National Reserve', 'Kenya', true,
    'A soda lake reserve in the northern Rift Valley renowned for its spectacular concentrations of lesser flamingos and powerful boiling hot springs that bubble and spout along the eastern shoreline. The alkaline lake sits in a dramatic rocky escarpment and is one of the most volcanically active landscapes in Kenya. Greater kudus frequent the surrounding scrubland, and the lake hosts some of East Africa''s largest flamingo aggregations when water levels are right.',
    'محمية بحيرة صودا في شمال وادي الصدع تشتهر بتركزات الفلامنغو الصغير الاستثنائية والينابيع الساخنة المغلية القوية التي تفور وتتطاير على طول الشاطئ الشرقي. تقع البحيرة القلوية في منحدر صخري درامي وتُعدّ من أكثر المناطق البركانية نشاطاً في كينيا. تتردد الكودو الكبيرة على الأراضي المحيطة، وتستضيف البحيرة بعضاً من أكبر تجمعات الفلامنغو في شرق أفريقيا.'
  WHERE NOT EXISTS (SELECT 1 FROM parks WHERE name = 'Lake Bogoria National Reserve' AND country = 'Kenya');

  UPDATE parks SET
    description_en = 'Kenya''s most celebrated wildlife reserve and a global icon of the African safari, the Maasai Mara covers 1,510 sq km of open savannah in the southwestern Rift Valley. Home to the densest population of lions in Africa and the setting for the annual Great Migration when over 1.5 million wildebeest and zebras cross the Mara River. Year-round game viewing offers encounters with cheetahs, leopards, elephants, hyenas, and hundreds of bird species. The Mara forms the northern extension of Tanzania''s Serengeti ecosystem.',
    description_ar = 'أشهر محميات الحياة البرية في كينيا ورمز عالمي للسفاري الأفريقية، تغطي ماسائي مارا 1,510 كم² من السافانا المفتوحة في جنوب غرب وادي الصدع. موطن لأكثف كثافة للأسود في أفريقيا ومسرح الهجرة الكبرى السنوية حيث تعبر أكثر من 1.5 مليون حيوان من الجلادة والحمير الوحشية نهر مارا. تقدم مشاهدة الألعاب على مدار العام مشاهدات للفهد الصياد والفهد المرقط والأفيال والضباع ومئات أنواع الطيور.',
    is_active = true
  WHERE name = 'Maasai Mara National Reserve' AND country = 'Kenya';

  INSERT INTO parks (name, country, is_active, description_en, description_ar)
  SELECT
    'Maasai Mara National Reserve', 'Kenya', true,
    'Kenya''s most celebrated wildlife reserve and a global icon of the African safari, the Maasai Mara covers 1,510 sq km of open savannah in the southwestern Rift Valley. Home to the densest population of lions in Africa and the setting for the annual Great Migration when over 1.5 million wildebeest and zebras cross the Mara River. Year-round game viewing offers encounters with cheetahs, leopards, elephants, hyenas, and hundreds of bird species. The Mara forms the northern extension of Tanzania''s Serengeti ecosystem.',
    'أشهر محميات الحياة البرية في كينيا ورمز عالمي للسفاري الأفريقية، تغطي ماسائي مارا 1,510 كم² من السافانا المفتوحة في جنوب غرب وادي الصدع. موطن لأكثف كثافة للأسود في أفريقيا ومسرح الهجرة الكبرى السنوية حيث تعبر أكثر من 1.5 مليون حيوان من الجلادة والحمير الوحشية نهر مارا. تقدم مشاهدة الألعاب على مدار العام مشاهدات للفهد الصياد والفهد المرقط والأفيال والضباع ومئات أنواع الطيور.'
  WHERE NOT EXISTS (SELECT 1 FROM parks WHERE name = 'Maasai Mara National Reserve' AND country = 'Kenya');

  UPDATE parks SET
    description_en = 'A UNESCO World Heritage Site protecting Africa''s second-highest peak (5,199 m) and its surrounding mountain ecosystem. The park encompasses glaciers, moorlands, bamboo forests, and dense rainforest populated by colobus monkeys, elephants, buffalo, bongo antelopes, and leopards. Mount Kenya can be trekked via multiple routes to Point Lenana (4,985 m), the trekking summit. The lower forest zones are accessible from the main gates and offer spectacular forest hikes without the need for technical climbing equipment.',
    description_ar = 'موقع تراث عالمي لليونسكو يحمي ثاني أعلى قمة في أفريقيا (5,199 م) ونظامها البيئي الجبلي المحيط. تشمل المحمية الأنهار الجليدية والمراعي الجبلية وغابات الخيزران والغابات المطيرة الكثيفة حيث تعيش قرود الكولوبوس والأفيال والجاموس وظباء البونغو والفهود. يمكن التنزه على جبل كينيا عبر مسارات متعددة وصولاً إلى نقطة لينانا (4,985 م). المناطق الغابوية السفلى يمكن الوصول إليها من البوابات الرئيسية.',
    is_active = true
  WHERE name = 'Mount Kenya National Park' AND country = 'Kenya';

  INSERT INTO parks (name, country, is_active, description_en, description_ar)
  SELECT
    'Mount Kenya National Park', 'Kenya', true,
    'A UNESCO World Heritage Site protecting Africa''s second-highest peak (5,199 m) and its surrounding mountain ecosystem. The park encompasses glaciers, moorlands, bamboo forests, and dense rainforest populated by colobus monkeys, elephants, buffalo, bongo antelopes, and leopards. Mount Kenya can be trekked via multiple routes to Point Lenana (4,985 m), the trekking summit. The lower forest zones are accessible from the main gates and offer spectacular forest hikes without the need for technical climbing equipment.',
    'موقع تراث عالمي لليونسكو يحمي ثاني أعلى قمة في أفريقيا (5,199 م) ونظامها البيئي الجبلي المحيط. تشمل المحمية الأنهار الجليدية والمراعي الجبلية وغابات الخيزران والغابات المطيرة الكثيفة حيث تعيش قرود الكولوبوس والأفيال والجاموس وظباء البونغو والفهود. يمكن التنزه على جبل كينيا عبر مسارات متعددة وصولاً إلى نقطة لينانا (4,985 م). المناطق الغابوية السفلى يمكن الوصول إليها من البوابات الرئيسية.'
  WHERE NOT EXISTS (SELECT 1 FROM parks WHERE name = 'Mount Kenya National Park' AND country = 'Kenya');

  UPDATE parks SET
    description_en = 'One of Kenya''s most iconic parks, Amboseli sits at the foot of Mount Kilimanjaro and is famous for its large elephant herds that roam the open grasslands against the backdrop of Africa''s highest snow-capped peak. The 392 sq km park is also home to large concentrations of Cape buffaloes, lions, cheetahs, zebras, giraffes, and over 600 bird species. The image of an elephant silhouetted against Kilimanjaro is one of Africa''s most iconic wildlife photographs.',
    description_ar = 'إحدى أكثر حدائق كينيا الوطنية شهرة، تقع أمبوسيلي عند سفح جبل كيليمانجارو وتشتهر بقطعان الأفيال الكبيرة التي تجوب المراعي المفتوحة بمحاذاة أعلى قمة مكسوة بالثلوج في أفريقيا. تضم المحمية البالغة 392 كم² أيضاً تركزات كبيرة من جاموس الرأس والأسود والفهود الصياد والحمير الوحشية والزرافات وأكثر من 600 نوع من الطيور.',
    is_active = true
  WHERE name = 'Amboseli National Park' AND country = 'Kenya';

  INSERT INTO parks (name, country, is_active, description_en, description_ar)
  SELECT
    'Amboseli National Park', 'Kenya', true,
    'One of Kenya''s most iconic parks, Amboseli sits at the foot of Mount Kilimanjaro and is famous for its large elephant herds that roam the open grasslands against the backdrop of Africa''s highest snow-capped peak. The 392 sq km park is also home to large concentrations of Cape buffaloes, lions, cheetahs, zebras, giraffes, and over 600 bird species. The image of an elephant silhouetted against Kilimanjaro is one of Africa''s most iconic wildlife photographs.',
    'إحدى أكثر حدائق كينيا الوطنية شهرة، تقع أمبوسيلي عند سفح جبل كيليمانجارو وتشتهر بقطعان الأفيال الكبيرة التي تجوب المراعي المفتوحة بمحاذاة أعلى قمة مكسوة بالثلوج في أفريقيا. تضم المحمية البالغة 392 كم² أيضاً تركزات كبيرة من جاموس الرأس والأسود والفهود الصياد والحمير الوحشية والزرافات وأكثر من 600 نوع من الطيور.'
  WHERE NOT EXISTS (SELECT 1 FROM parks WHERE name = 'Amboseli National Park' AND country = 'Kenya');

  UPDATE parks SET
    description_en = 'A semi-arid reserve in northern Kenya along the Ewaso Ng''iro River, home to species found nowhere else in Kenya: the reticulated giraffe, Grevy''s zebra, Somali ostrich, Beisa oryx, and the gerenuk (long-necked antelope). The dry riverine forest attracts large numbers of elephants and provides superb leopard sightings. The local Samburu people — cousins of the Maasai — inhabit the surrounding countryside and contribute to the reserve''s cultural richness.',
    description_ar = 'محمية شبه جافة في شمال كينيا على طول نهر إيواسو نيرو، موطن لأنواع لا تتواجد في أي مكان آخر في كينيا: الزرافة الشبكية وحمار زيبرا غريفي والنعامة الصومالية وأوريكس بيسا وجيرنوك (الظبي ذو العنق الطويل). تجذب غابة النهر الجافة أعداداً كبيرة من الأفيال وتوفر مشاهدات ممتازة للفهد. يقطن شعب السامبورو — أبناء عمومة الماسائي — المناطق المحيطة ويُثرون بُعده الثقافي.',
    is_active = true
  WHERE name = 'Samburu National Reserve' AND country = 'Kenya';

  INSERT INTO parks (name, country, is_active, description_en, description_ar)
  SELECT
    'Samburu National Reserve', 'Kenya', true,
    'A semi-arid reserve in northern Kenya along the Ewaso Ng''iro River, home to species found nowhere else in Kenya: the reticulated giraffe, Grevy''s zebra, Somali ostrich, Beisa oryx, and the gerenuk (long-necked antelope). The dry riverine forest attracts large numbers of elephants and provides superb leopard sightings. The local Samburu people — cousins of the Maasai — inhabit the surrounding countryside and contribute to the reserve''s cultural richness.',
    'محمية شبه جافة في شمال كينيا على طول نهر إيواسو نيرو، موطن لأنواع لا تتواجد في أي مكان آخر في كينيا: الزرافة الشبكية وحمار زيبرا غريفي والنعامة الصومالية وأوريكس بيسا وجيرنوك (الظبي ذو العنق الطويل). تجذب غابة النهر الجافة أعداداً كبيرة من الأفيال وتوفر مشاهدات ممتازة للفهد. يقطن شعب السامبورو — أبناء عمومة الماسائي — المناطق المحيطة ويُثرون بُعده الثقافي.'
  WHERE NOT EXISTS (SELECT 1 FROM parks WHERE name = 'Samburu National Reserve' AND country = 'Kenya');


  -- ═══════════════════════════════════════════════════════════════
  -- 4. UPDATE TOUR_DAYS — link destinations + activities
  -- ═══════════════════════════════════════════════════════════════
  SELECT id INTO v_tour_id
  FROM tours WHERE slug = 'kenya-8d-7n-nairobi-bike-tour';

  IF v_tour_id IS NOT NULL THEN

    -- Day 1: Nairobi — Arrival
    UPDATE tour_days SET
      destination_id   = d_nairobi,
      activity_ids     = ARRAY[a_airport_transfer, a_city_tour, a_welcome_dinner],
      meal_breakfast   = false,
      meal_lunch       = false,
      meal_dinner      = true
    WHERE tour_id = v_tour_id AND day_number = 1;

    -- Day 2: Nairobi → Lake Naivasha 140 km
    UPDATE tour_days SET
      destination_id   = d_naivasha,
      activity_ids     = ARRAY[a_bike_riding, a_sanctuary_farm, a_boat_naivasha],
      meal_breakfast   = true,
      meal_lunch       = true,
      meal_dinner      = true
    WHERE tour_id = v_tour_id AND day_number = 2;

    -- Day 3: Lake Naivasha → Nakuru 190 km
    UPDATE tour_days SET
      destination_id   = d_nakuru,
      activity_ids     = ARRAY[a_bike_riding, a_guided_game_drive, a_obs_hill],
      meal_breakfast   = true,
      meal_lunch       = true,
      meal_dinner      = true
    WHERE tour_id = v_tour_id AND day_number = 3;

    -- Day 4: Nakuru → Eldoret via Kericho 260 km
    UPDATE tour_days SET
      destination_id   = d_eldoret,
      activity_ids     = ARRAY[a_bike_riding, a_coffee_farm],
      meal_breakfast   = true,
      meal_lunch       = true,
      meal_dinner      = true
    WHERE tour_id = v_tour_id AND day_number = 4;

    -- Day 5: Eldoret → Nyahururu via Iten & Marigat 220 km
    UPDATE tour_days SET
      destination_id   = d_nyahururu,
      activity_ids     = ARRAY[a_bike_riding, a_thomson_falls],
      meal_breakfast   = true,
      meal_lunch       = true,
      meal_dinner      = true
    WHERE tour_id = v_tour_id AND day_number = 5;

    -- Day 6: Nyahururu → Castle Forest → Lagoon Resort 200 km
    UPDATE tour_days SET
      destination_id   = d_mtkenyaforest,
      activity_ids     = ARRAY[a_bike_riding, a_forest_hike],
      meal_breakfast   = true,
      meal_lunch       = true,
      meal_dinner      = true
    WHERE tour_id = v_tour_id AND day_number = 6;

    -- Day 7: Lagoon Resort → Nairobi via Tea Farms 190 km
    UPDATE tour_days SET
      destination_id   = d_nairobi,
      activity_ids     = ARRAY[a_bike_riding, a_coffee_farm, a_farewell_dinner],
      meal_breakfast   = true,
      meal_lunch       = true,
      meal_dinner      = false
    WHERE tour_id = v_tour_id AND day_number = 7;

    -- Day 8: Nairobi — Departure
    UPDATE tour_days SET
      destination_id   = d_nairobi,
      activity_ids     = ARRAY[a_airport_transfer],
      meal_breakfast   = false,
      meal_lunch       = false,
      meal_dinner      = false
    WHERE tour_id = v_tour_id AND day_number = 8;

    RAISE NOTICE '✓ Tour days updated with destinations and activities';
  ELSE
    RAISE NOTICE '⚠ Kenya tour not found — run seed_02 first';
  END IF;

  RAISE NOTICE '✓ seed_03 complete: destinations, activities, parks all populated';

END;
$$;
