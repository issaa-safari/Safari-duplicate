import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { assertAdminAccess } from '@/lib/auth/admin-access'

// One-time seeding of the Activities content library with EN + AR descriptions.
// Runs server-side (no SQL paste needed). Idempotent: skips names that already exist.
const ACTIVITIES: { name: string; en: string; ar: string }[] = [
  { name: 'Motorbike Ride', en: 'Explore the landscape on a guided motorbike ride along scenic routes.', ar: 'استكشف المناظر الطبيعية في جولة بدراجة نارية بصحبة مرشد على طرق خلابة.' },
  { name: 'Naivasha', en: 'Visit Lake Naivasha, a tranquil freshwater lake famous for its birdlife and boat safaris.', ar: 'زيارة بحيرة نايفاشا، بحيرة المياه العذبة الهادئة المشهورة بطيورها ورحلات القوارب.' },
  { name: 'Abseiling', en: 'Descend a cliff face on ropes with professional guides and full safety equipment.', ar: 'النزول على وجه منحدر صخري بالحبال مع مرشدين محترفين ومعدات أمان كاملة.' },
  { name: 'Aquarium Visit', en: 'Discover colourful marine life up close at the aquarium.', ar: 'اكتشف الحياة البحرية الملوّنة عن قرب في حوض الأسماك.' },
  { name: 'Arrival', en: 'Arrival and welcome, with meet-and-assist and transfer to your accommodation.', ar: 'الوصول والاستقبال مع المساعدة والنقل إلى مكان إقامتك.' },
  { name: 'Battlesite visit', en: 'Tour a historic battlefield and hear its stories from a knowledgeable local guide.', ar: 'جولة في ساحة معركة تاريخية والاستماع إلى قصصها مع مرشد محلي خبير.' },
  { name: 'Bridge Walk', en: 'Cross a scenic suspension bridge with sweeping views over the valley.', ar: 'اعبر جسراً معلقاً خلاباً مع إطلالات واسعة على الوادي.' },
  { name: 'Bungy Jump', en: 'Take the leap on an adrenaline-filled bungy jump with certified operators.', ar: 'اقفز في تجربة قفز بالحبال المطاطية مليئة بالإثارة مع مشغّلين معتمدين.' },
  { name: 'Bush Breakfast', en: 'Enjoy a relaxed breakfast in the wild, surrounded by untouched nature.', ar: 'استمتع بإفطار هادئ في البرية محاطاً بطبيعة بكر.' },
  { name: 'Cheetah Tracking', en: 'Track cheetahs on foot or by vehicle alongside expert wildlife guides.', ar: 'تتبّع الفهود سيراً أو بالمركبة برفقة مرشدي حياة برية خبراء.' },
  { name: 'Coffee tour', en: 'Walk a working coffee farm and learn the journey from bean to cup with a tasting.', ar: 'تجوّل في مزرعة بنّ عاملة وتعرّف على رحلة البنّ من الحبة إلى الكوب مع تذوّق.' },
  { name: 'Community tours', en: 'Meet a local community and experience their culture, crafts and daily life.', ar: 'التقِ بمجتمع محلي واختبر ثقافته وحرفه وحياته اليومية.' },
  { name: 'Crocodile Farm Visit', en: 'Visit a crocodile farm and learn about these reptiles and their conservation.', ar: 'زيارة مزرعة تماسيح والتعرّف على هذه الزواحف وجهود الحفاظ عليها.' },
  { name: 'CrocodileCage-Diving', en: 'Get face to face with crocodiles from the safety of a submerged cage.', ar: 'قابل التماسيح وجهاً لوجه من داخل قفص غاطس آمن.' },
  { name: 'Cross the Equator', en: 'Stop at the Equator line for a photo and a fun water-rotation demonstration.', ar: 'توقّف عند خط الاستواء لالتقاط صورة ومشاهدة عرض دوران المياه الممتع.' },
  { name: 'Day hike', en: 'A guided day hike through scenic trails at a comfortable pace.', ar: 'نزهة سير ليوم كامل عبر مسارات خلابة بوتيرة مريحة بصحبة مرشد.' },
  { name: 'Day walk', en: 'A gentle guided walk to take in the surroundings and local nature.', ar: 'مشي خفيف بصحبة مرشد للاستمتاع بالمحيط والطبيعة المحلية.' },
  { name: 'Departure', en: 'Check-out and transfer for your onward departure.', ar: 'إنهاء الإقامة والنقل لمغادرتك.' },
  { name: 'Fishing', en: 'Spend time fishing on the lake or river with provided equipment.', ar: 'اقضِ وقتاً في الصيد على البحيرة أو النهر مع توفير المعدات.' },
  { name: 'Fly into', en: 'Scheduled or charter flight into your next destination.', ar: 'رحلة جوية مجدولة أو خاصة إلى وجهتك التالية.' },
  { name: 'Fly out from', en: 'Scheduled or charter flight out from this destination.', ar: 'رحلة جوية مجدولة أو خاصة للمغادرة من هذه الوجهة.' },
  { name: 'Fly-fishing', en: 'Try fly-fishing in clear highland streams with a local guide.', ar: 'جرّب الصيد بالذبابة في جداول المرتفعات الصافية مع مرشد محلي.' },
  { name: 'Guided night walk', en: 'Discover nocturnal wildlife on a guided walk after dark.', ar: 'اكتشف الحياة البرية الليلية في نزهة مسائية بصحبة مرشد.' },
  { name: 'Guided tour', en: 'A guided tour of the area highlights with a local expert.', ar: 'جولة بصحبة مرشد لأبرز معالم المنطقة مع خبير محلي.' },
  { name: 'Lion and leopard tracking', en: 'Search for lions and leopards with experienced trackers.', ar: 'البحث عن الأسود والفهود مع متعقّبين ذوي خبرة.' },
  { name: 'Night Game Drive', en: 'A guided game drive after dark to spot nocturnal animals.', ar: 'رحلة سفاري ليلية بصحبة مرشد لرصد الحيوانات الليلية.' },
  { name: 'Ostrich Farm visit', en: 'Visit an ostrich farm and learn about these remarkable birds.', ar: 'زيارة مزرعة نعام والتعرّف على هذه الطيور المميزة.' },
  { name: 'Overnight hike', en: 'A multi-day hike with a wilderness overnight camp.', ar: 'رحلة سير لعدة أيام مع مبيت في مخيم بريّ.' },
  { name: 'Rhino tracking', en: 'Track rhinos on foot with armed rangers and expert guides.', ar: 'تتبّع وحيد القرن سيراً مع حرّاس مسلّحين ومرشدين خبراء.' },
  { name: 'Rock Art Visit', en: 'Visit ancient rock art sites and learn their cultural significance.', ar: 'زيارة مواقع الفن الصخري القديم والتعرّف على أهميتها الثقافية.' },
  { name: 'Scenic Drive', en: 'A relaxed scenic drive through dramatic landscapes.', ar: 'جولة بالسيارة عبر مناظر طبيعية ساحرة بوتيرة هادئة.' },
  { name: 'Scenic flight', en: 'A light-aircraft scenic flight with breathtaking aerial views.', ar: 'رحلة جوية بطائرة خفيفة مع إطلالات جوية خلابة.' },
  { name: 'Self-Drive Transfer', en: 'A self-drive transfer between destinations at your own pace.', ar: 'نقل بالقيادة الذاتية بين الوجهات بالوتيرة التي تناسبك.' },
  { name: 'Self-Guided Game Drive', en: 'Explore the park at your own pace on a self-guided game drive.', ar: 'استكشف المحمية بالوتيرة التي تناسبك في رحلة سفاري ذاتية.' },
  { name: 'Sibebe Rock Guided Walk', en: 'A guided walk on Sibebe Rock, one of the largest granite domes in the world.', ar: 'نزهة بصحبة مرشد على صخرة سيبيبي، إحدى أكبر القباب الجرانيتية في العالم.' },
  { name: 'Stargazing', en: 'Take in clear night skies on a guided stargazing session.', ar: 'استمتع بسماء ليلية صافية في جلسة مراقبة نجوم بصحبة مرشد.' },
  { name: 'Surfing', en: 'Catch the waves with a surfing session for all levels.', ar: 'اركب الأمواج في جلسة ركوب أمواج لجميع المستويات.' },
  { name: 'Swimming', en: 'Cool off and relax with a swim.', ar: 'انتعش واسترخِ بالسباحة.' },
  { name: 'Take a ferry', en: 'Cross the water by ferry, enjoying the views along the way.', ar: 'اعبر المياه بالعبّارة مستمتعاً بالمناظر على طول الطريق.' },
  { name: 'Treetop walk', en: 'Stroll an elevated canopy walkway among the treetops.', ar: 'تجوّل على ممر مرتفع بين قمم الأشجار.' },
  { name: 'Tuk-tuk ride', en: 'Zip through town the local way on a tuk-tuk ride.', ar: 'تنقّل في المدينة بالطريقة المحلية في جولة بالتوك توك.' },
  { name: 'Village Visit', en: 'Visit a local village to experience traditional life and hospitality.', ar: 'زيارة قرية محلية لاختبار الحياة التقليدية وكرم الضيافة.' },
  { name: 'Visit the Anti-Poaching Dog Team', en: 'Meet the anti-poaching dog unit and see how they protect wildlife.', ar: 'التقِ بوحدة كلاب مكافحة الصيد الجائر وشاهد كيف تحمي الحياة البرية.' },
  { name: 'Visit the Northern White Rhinos', en: 'See the last northern white rhinos and learn about efforts to save them.', ar: 'شاهد آخر وحيدات القرن البيضاء الشمالية وتعرّف على جهود إنقاذها.' },
  { name: 'Walking safari', en: 'Experience the bush on foot with an armed, expert guide.', ar: 'اختبر البرية سيراً على الأقدام مع مرشد خبير مسلّح.' },
  { name: 'Whale watching (land-based)', en: 'Watch whales from scenic coastal viewpoints in season.', ar: 'مراقبة الحيتان من مطلّات ساحلية خلابة في موسمها.' },
  { name: 'White-water rafting', en: 'Tackle exciting rapids on a guided white-water rafting trip.', ar: 'خُض المنحدرات المائية المثيرة في رحلة تجديف بصحبة مرشد.' },
  { name: 'Zip line', en: 'Soar across the canopy on a thrilling zip line.', ar: 'حلّق عبر الغابة على خط انزلاقي مثير.' },
  { name: 'Border crossing', en: 'Assisted crossing of the border between countries.', ar: 'عبور الحدود بين الدول مع المساعدة اللازمة.' },
  { name: 'Crater rim hike', en: 'Hike along a volcanic crater rim with spectacular views.', ar: 'سِر على حافة فوهة بركانية مع إطلالات مذهلة.' },
  { name: 'Hotel Pick Up', en: 'Pick-up from your hotel by your driver-guide.', ar: 'الاصطحاب من فندقك بواسطة السائق المرشد.' },
  { name: 'Museum visit', en: 'Explore the history and culture of the region at the museum.', ar: 'استكشف تاريخ المنطقة وثقافتها في المتحف.' },
  { name: 'Picnic Lunch', en: 'Enjoy a packed picnic lunch in a scenic spot.', ar: 'استمتع بغداء نزهة معبّأ في موقع خلاب.' },
  { name: 'Hotel Drop Off', en: 'Drop-off at your hotel by your driver-guide.', ar: 'التوصيل إلى فندقك بواسطة السائق المرشد.' },
  { name: 'Guided Game Drive', en: 'A classic guided game drive in search of wildlife.', ar: 'رحلة سفاري كلاسيكية بصحبة مرشد بحثاً عن الحياة البرية.' },
  { name: 'Day Tour', en: 'A full-day guided tour of the main highlights of the area.', ar: 'جولة بصحبة مرشد ليوم كامل لأبرز معالم المنطقة.' },
  { name: 'Half Day Tour', en: 'A half-day guided tour of nearby highlights.', ar: 'جولة بصحبة مرشد لنصف يوم لأبرز المعالم القريبة.' },
  { name: 'Relaxing', en: 'Free time to relax at your own pace.', ar: 'وقت حر للاسترخاء بالوتيرة التي تناسبك.' },
  { name: 'Birding', en: 'Spot and identify a variety of birds with a specialist guide.', ar: 'رصد وتمييز أنواع متعددة من الطيور مع مرشد متخصص.' },
  { name: 'Balloon Safari', en: 'Drift over the savannah at sunrise on a hot-air balloon safari.', ar: 'حلّق فوق السافانا عند الشروق في رحلة سفاري بمنطاد الهواء الساخن.' },
  { name: 'Helicopter Flight', en: 'See the landscape from above on a scenic helicopter flight.', ar: 'شاهد المناظر من الأعلى في رحلة بطائرة هليكوبتر.' },
  { name: 'Hiking', en: 'A guided hike through scenic terrain.', ar: 'نزهة سير بصحبة مرشد عبر تضاريس خلابة.' },
  { name: 'Horseback Riding', en: 'Ride through beautiful scenery on a guided horseback excursion.', ar: 'تجوّل عبر مناظر خلابة في رحلة على ظهر الخيل بصحبة مرشد.' },
  { name: 'Mountain Biking', en: 'Hit the trails on a guided mountain-biking ride.', ar: 'انطلق على المسارات في جولة بالدراجات الجبلية بصحبة مرشد.' },
  { name: 'Cycling', en: 'Explore the area on a relaxed guided cycling route.', ar: 'استكشف المنطقة في جولة دراجات هادئة بصحبة مرشد.' },
  { name: 'Quad Biking', en: 'Ride the trails on a quad bike with a guide.', ar: 'انطلق على المسارات بدراجة رباعية بصحبة مرشد.' },
  { name: 'Kayaking', en: 'Paddle the calm waters by kayak.', ar: 'جدّف في المياه الهادئة بقارب الكاياك.' },
  { name: 'Canoeing', en: 'A peaceful canoe trip along the water.', ar: 'رحلة كانو هادئة على المياه.' },
  { name: 'Boat Trip', en: 'A guided boat trip with wildlife and scenery along the shore.', ar: 'رحلة بالقارب بصحبة مرشد لمشاهدة الحياة البرية والمناظر على الضفاف.' },
  { name: 'Rafting', en: 'A guided rafting trip down the river.', ar: 'رحلة تجديف بصحبة مرشد على النهر.' },
  { name: 'Diving', en: 'Explore the underwater world on a guided dive.', ar: 'استكشف العالم تحت الماء في غطسة بصحبة مرشد.' },
  { name: 'Snorkeling', en: 'Snorkel over coral reefs teeming with marine life.', ar: 'غُص بأنبوب التنفس فوق الشعاب المرجانية المليئة بالحياة البحرية.' },
  { name: 'Beach Time', en: 'Free time to relax and enjoy the beach.', ar: 'وقت حر للاسترخاء والاستمتاع بالشاطئ.' },
  { name: 'Visit', en: 'A guided visit to a point of interest.', ar: 'زيارة بصحبة مرشد لأحد المعالم.' },
  { name: 'Sightseeing', en: 'Take in the main sights at a relaxed pace.', ar: 'استمتع بأبرز المعالم بوتيرة هادئة.' },
  { name: 'City Sightseeing', en: 'See the highlights of the city with a guide.', ar: 'شاهد أبرز معالم المدينة بصحبة مرشد.' },
  { name: 'City Tour', en: 'A guided tour of the main attractions of the city.', ar: 'جولة بصحبة مرشد لأهم معالم المدينة.' },
  { name: 'Town Sightseeing', en: 'Explore the character and highlights of the town.', ar: 'استكشف طابع البلدة وأبرز معالمها.' },
  { name: 'Transfer Game Drive', en: 'A transfer between destinations combined with a game drive.', ar: 'نقل بين الوجهات مع رحلة سفاري في الطريق.' },
  { name: 'Transfer by Air', en: 'Transfer between destinations by light aircraft.', ar: 'النقل بين الوجهات بطائرة خفيفة.' },
  { name: 'Transfer by Road', en: 'Transfer between destinations by road with your driver-guide.', ar: 'النقل بين الوجهات براً بصحبة السائق المرشد.' },
  { name: 'Transfer from Airport', en: 'Transfer from the airport to your accommodation.', ar: 'النقل من المطار إلى مكان إقامتك.' },
  { name: 'Transfer to Airport', en: 'Transfer from your accommodation to the airport.', ar: 'النقل من مكان إقامتك إلى المطار.' },
  { name: 'Visit the Maasai', en: 'Visit a Maasai community to experience their culture and traditions.', ar: 'زيارة مجتمع الماساي لاختبار ثقافتهم وتقاليدهم.' },
  { name: 'Early Morning Game Drive', en: 'An early-morning game drive when wildlife is most active.', ar: 'رحلة سفاري في الصباح الباكر حين تكون الحياة البرية أكثر نشاطاً.' },
  { name: 'Evening Game Drive', en: 'An evening game drive as the bush comes alive at dusk.', ar: 'رحلة سفاري مسائية حين تدبّ الحياة في البرية عند الغسق.' },
  { name: 'View the great migration', en: 'Witness the spectacular wildebeest great migration in season.', ar: 'شاهد الهجرة الكبرى المذهلة للحيوانات البرية في موسمها.' },
  { name: 'Wildlife Course', en: 'A short guided course on local wildlife and ecology.', ar: 'دورة قصيرة بصحبة مرشد عن الحياة البرية والبيئة المحلية.' },
  { name: 'Sundowner', en: 'Enjoy a sunset drink at a scenic viewpoint.', ar: 'استمتع بمشروب عند الغروب في موقع خلاب.' },
  { name: 'Mountain Climbing', en: 'A guided mountain climb for keen adventurers.', ar: 'تسلّق جبلي بصحبة مرشد لعشّاق المغامرة.' },
  { name: 'Photo Workshop', en: 'Improve your wildlife photography with a guided workshop.', ar: 'طوّر مهاراتك في تصوير الحياة البرية في ورشة بصحبة مرشد.' },
  { name: 'Start tour', en: 'Official start of your tour with a briefing.', ar: 'البداية الرسمية لجولتك مع جلسة تعريفية.' },
  { name: 'Meet & Greet', en: 'Meet-and-greet on arrival with your representative.', ar: 'استقبال وترحيب عند الوصول مع ممثلكم.' },
  { name: 'End Tour', en: 'Conclusion of your tour.', ar: 'ختام جولتكم.' },
  { name: 'Guided Walk', en: 'A guided walk to explore the area on foot.', ar: 'نزهة سير بصحبة مرشد لاستكشاف المنطقة على الأقدام.' },
  { name: 'Picnic', en: 'A relaxed picnic in a scenic setting.', ar: 'نزهة طعام هادئة في موقع خلاب.' },
  { name: 'Breakfast', en: 'Breakfast is included.', ar: 'الإفطار مشمول.' },
  { name: 'Lunch', en: 'Lunch is included.', ar: 'الغداء مشمول.' },
  { name: 'Dinner', en: 'Dinner is included.', ar: 'العشاء مشمول.' },
]

async function handle() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  try {
    await assertAdminAccess(admin, user.email)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Find which names already exist so we only insert new ones.
  const { data: existing } = await admin.from('activities').select('name')
  const have = new Set((existing ?? []).map((a: any) => (a.name as string).trim().toLowerCase()))

  const toInsert = ACTIVITIES
    .filter(a => !have.has(a.name.trim().toLowerCase()))
    .map(a => ({ name: a.name, description_en: a.en, description_ar: a.ar, is_active: true }))

  let inserted = 0
  if (toInsert.length > 0) {
    const { error, count } = await admin
      .from('activities')
      .insert(toInsert, { count: 'exact' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    inserted = count ?? toInsert.length
  }

  return NextResponse.json({
    success: true,
    total: ACTIVITIES.length,
    inserted,
    skipped: ACTIVITIES.length - toInsert.length,
  })
}

export async function GET() { return handle() }
export async function POST() { return handle() }
