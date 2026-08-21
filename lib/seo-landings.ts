import type { LandingCopy } from '@/components/public/seo-landing-page'

export type SeoLanding = {
  title: { en: string; ar: string }
  description: { en: string; ar: string }
  copy: { en: LandingCopy; ar: LandingCopy }
}

const relatedEn = [
  { href: '/kenya-safari', label: 'Kenya Safari' },
  { href: '/maasai-mara-safari', label: 'Maasai Mara Safari' },
  { href: '/amboseli-safari', label: 'Amboseli Safari' },
  { href: '/family-safari-kenya', label: 'Family Safari Kenya' },
]
const relatedAr = [
  { href: '/kenya-safari', label: 'سفاري كينيا' },
  { href: '/maasai-mara-safari', label: 'سفاري ماساي مارا' },
  { href: '/amboseli-safari', label: 'سفاري أمبوسيلي' },
  { href: '/family-safari-kenya', label: 'سفاري كينيا للعوائل' },
]

export const seoLandings: Record<string, SeoLanding> = {
  'maasai-mara-safari': {
    title: { en: 'Maasai Mara Safari Tours | Safari Adventure Riders', ar: 'سفاري ماساي مارا | رحلات خاصة في كينيا' },
    description: { en: 'Plan a private Maasai Mara safari with a Nairobi-based local operator. Tailored stays, game drives and Kenya itineraries.', ar: 'خطط لسفاري ماساي مارا مع مشغل محلي في نيروبي. برامج خاصة وإقامة وجولات سفاري مصممة حسب رحلتك.' },
    copy: {
      en: { eyebrow:'Kenya wildlife safari', title:'Maasai Mara Safari — Planned Directly in Kenya', intro:'Experience one of Kenya’s most famous wildlife regions with a private itinerary built around your dates, group and preferred accommodation style.', sections:[{title:'Why visit the Maasai Mara?',body:'The Mara is known for exceptional wildlife viewing, open savannah landscapes and seasonal migration activity. It works well as the centrepiece of a first Kenya safari.'},{title:'Private and tailored itineraries',body:'We can combine the Mara with Nairobi, Lake Naivasha, Amboseli, Lake Nakuru or other regions to match your available time.'},{title:'For families, couples and photographers',body:'Trip pacing, lodge level, vehicle arrangements and activities can be adapted to your group and travel priorities.'}], faqs:[{question:'How many nights should I spend in Maasai Mara?',answer:'Many itineraries use two to four nights, depending on the wider route and how much wildlife time you want.'},{question:'Can Maasai Mara be combined with Amboseli?',answer:'Yes. Maasai Mara and Amboseli are commonly combined within a wider Kenya safari itinerary.'}], related: relatedEn },
      ar: { eyebrow:'سفاري الحياة البرية في كينيا', title:'سفاري ماساي مارا — برنامج مصمم من داخل كينيا', intro:'استمتع بواحدة من أشهر مناطق الحياة البرية في كينيا مع برنامج خاص مبني على مواعيدك وعدد المسافرين ومستوى الإقامة الذي تفضله.', sections:[{title:'لماذا ماساي مارا؟',body:'تشتهر ماساي مارا بكثافة الحياة البرية والسهول المفتوحة وموسم الهجرة، وهي من أهم الوجهات لأول رحلة سفاري في كينيا.'},{title:'برامج خاصة ومرنة',body:'يمكن دمج ماساي مارا مع نيروبي ونيفاشا وأمبوسيلي وناكورو وغيرها حسب عدد أيام الرحلة.'},{title:'للعوائل والأزواج والمصورين',body:'نرتب وتيرة الرحلة ومستوى السكن والمركبة والأنشطة بما يناسب طبيعة المجموعة واهتماماتها.'}], faqs:[{question:'كم ليلة مناسبة في ماساي مارا؟',answer:'غالباً من ليلتين إلى أربع ليالٍ حسب البرنامج الكامل وكمية وقت السفاري التي ترغب بها.'},{question:'هل يمكن دمج ماساي مارا مع أمبوسيلي؟',answer:'نعم، ويمكن تصميم برنامج يجمع الوجهتين ضمن رحلة واحدة في كينيا.'}], related: relatedAr }
    }
  },
  'amboseli-safari': {
    title: { en: 'Amboseli Safari Tours | Kenya Private Safaris', ar: 'سفاري أمبوسيلي | رحلات كينيا الخاصة' },
    description: { en: 'Book a tailored Amboseli safari with a Kenya-based operator. Elephant viewing, Kilimanjaro landscapes and private itineraries.', ar: 'احجز سفاري أمبوسيلي مع مشغل كيني محلي. مشاهدة الأفيال ومناظر كليمنجارو وبرامج خاصة ومخصصة.' },
    copy: {
      en: { eyebrow:'Southern Kenya safari', title:'Amboseli Safari — Elephants, Open Plains and Kilimanjaro Views', intro:'Amboseli is one of Kenya’s strongest safari choices for elephant viewing and iconic landscapes, and it combines well with Nairobi and other parks.', sections:[{title:'A strong first or second safari stop',body:'Amboseli offers accessible wildlife viewing and distinctive scenery, making it valuable in short and longer Kenya itineraries.'},{title:'Tailored around your schedule',body:'We can plan road or flight connections, lodge choices and game-drive timing around the rest of your Kenya trip.'}], faqs:[{question:'What is Amboseli best known for?',answer:'Amboseli is especially known for elephants and views toward Mount Kilimanjaro when conditions are clear.'}], related: relatedEn },
      ar: { eyebrow:'سفاري جنوب كينيا', title:'سفاري أمبوسيلي — الأفيال ومناظر كليمنجارو', intro:'أمبوسيلي من أفضل وجهات كينيا لمشاهدة الأفيال والاستمتاع بالمناظر المفتوحة، ويمكن دمجها بسهولة مع نيروبي ومحميات أخرى.', sections:[{title:'وجهة ممتازة ضمن برنامج كينيا',body:'تجمع أمبوسيلي بين سهولة مشاهدة الحياة البرية والمناظر المميزة، وتناسب البرامج القصيرة والطويلة.'},{title:'برنامج حسب جدولك',body:'نرتب التنقلات والإقامة وأوقات الجولات بما يتناسب مع بقية برنامجك في كينيا.'}], faqs:[{question:'بماذا تشتهر أمبوسيلي؟',answer:'تشتهر خصوصاً بالأفيال وإطلالات جبل كليمنجارو عندما تكون الرؤية واضحة.'}], related: relatedAr }
    }
  },
  'family-safari-kenya': {
    title: { en: 'Family Safari Kenya | Private Family Safari Packages', ar: 'سفاري كينيا للعوائل | برامج عائلية خاصة' },
    description: { en: 'Tailored Kenya family safaris with flexible pacing, private transport and family-friendly lodge choices.', ar: 'برامج سفاري كينيا للعوائل مع جدول مريح ونقل خاص وخيارات إقامة مناسبة للعائلات.' },
    copy: {
      en: { eyebrow:'Family travel in Kenya', title:'Family Safari Kenya — Flexible, Private and Designed for Your Group', intro:'A family safari works best when driving times, accommodation and activities are planned around the ages and energy levels of the group.', sections:[{title:'Private pacing',body:'We can reduce long driving days, add rest time and select activities that work for different ages.'},{title:'Family-friendly accommodation',body:'Lodge and camp choices can be filtered for room configuration, comfort, location and practical family needs.'},{title:'More than game drives',body:'Depending on the route, your family trip can include nature walks, lakes, cultural experiences and other age-appropriate activities.'}], faqs:[{question:'Is Kenya suitable for a family safari?',answer:'Yes. A well-planned private itinerary can be adjusted around children, preferred comfort level and daily travel time.'}], related: relatedEn },
      ar: { eyebrow:'السفر العائلي في كينيا', title:'سفاري كينيا للعوائل — برنامج خاص ومريح لعائلتك', intro:'نجاح الرحلة العائلية يعتمد على تنظيم المسافات والإقامة والأنشطة بما يناسب أعمار أفراد العائلة وطبيعة الرحلة.', sections:[{title:'وتيرة مريحة وخاصة',body:'يمكن تقليل ساعات الطريق وإضافة أوقات راحة واختيار أنشطة مناسبة لمختلف الأعمار.'},{title:'إقامة مناسبة للعائلة',body:'نختار الفنادق واللودجات حسب توزيع الغرف والراحة والموقع والاحتياجات العملية للعائلة.'},{title:'أكثر من مجرد جولات سفاري',body:'يمكن إضافة البحيرات والمشي والطبيعة والتجارب الثقافية وأنشطة أخرى مناسبة للعائلة حسب المسار.'}], faqs:[{question:'هل كينيا مناسبة للعوائل؟',answer:'نعم، خصوصاً عندما يكون البرنامج خاصاً ويتم ضبط المسافات اليومية والإقامة والأنشطة حسب احتياجات العائلة.'}], related: relatedAr }
    }
  },
  'luxury-kenya-safari': {
    title: { en: 'Luxury Kenya Safari | Private Luxury Safari Packages', ar: 'سفاري كينيا الفاخر | برامج خاصة وفاخرة' },
    description: { en: 'Private luxury Kenya safaris with premium camps, lodges and tailored routes designed by a local operator.', ar: 'سفاري كينيا فاخر مع مخيمات ولودجات مميزة وبرامج خاصة يصممها مشغل محلي في كينيا.' },
    copy: {
      en: { eyebrow:'Premium private safari', title:'Luxury Kenya Safari — Private, Tailored and Locally Planned', intro:'We design premium Kenya itineraries around privacy, strong locations, high-quality accommodation and efficient routing.', sections:[{title:'The right lodge in the right location',body:'Luxury is not only the room. Location, wildlife access, service quality and route efficiency matter just as much.'},{title:'Private transport and tailored timing',body:'Your schedule can be adjusted around preferred game-drive times, flights, rest periods and special experiences.'}], faqs:[{question:'Can a luxury safari be fully private?',answer:'Yes. We can build a private itinerary with dedicated transport and accommodation selected around your preferences.'}], related: relatedEn },
      ar: { eyebrow:'سفاري خاص بمستوى فاخر', title:'سفاري كينيا الفاخر — خصوصية وبرنامج مصمم لك', intro:'نصمم برامج كينيا الراقية بناءً على الخصوصية والموقع والإقامة المميزة وسهولة التنقل بين الوجهات.', sections:[{title:'اختيار السكن بالموقع المناسب',body:'الفخامة ليست الغرفة فقط؛ الموقع وجودة الخدمة والوصول للحياة البرية وكفاءة المسار عوامل أساسية.'},{title:'تنقل خاص وتوقيت مرن',body:'يمكن ضبط جدولك حسب أوقات السفاري والرحلات الجوية والراحة والتجارب الخاصة التي تفضلها.'}], faqs:[{question:'هل يمكن أن تكون رحلة السفاري الفاخرة خاصة بالكامل؟',answer:'نعم، يمكن ترتيب برنامج خاص مع مركبة مخصصة وإقامة يتم اختيارها حسب تفضيلاتك.'}], related: relatedAr }
    }
  },
  'kenya-motorcycle-safari': {
    title: { en: 'Kenya Motorcycle Safari & Adventure Bike Tours', ar: 'رحلات الدراجات النارية في كينيا | سفاري ومغامرات' },
    description: { en: 'Guided Kenya motorcycle and adventure bike tours with local route knowledge, safari experiences and tailored itineraries.', ar: 'رحلات دراجات نارية ومغامرات في كينيا مع مسارات محلية وتجارب سفاري وبرامج منظمة.' },
    copy: {
      en: { eyebrow:'Adventure riding in Kenya', title:'Kenya Motorcycle Safari — Ride Beyond the Usual Safari Route', intro:'Combine adventure riding with Kenya’s landscapes, highlands, lakes and wildlife regions on a locally planned route.', sections:[{title:'Built around real riding routes',body:'The route design considers terrain, daily distance, rider experience, accommodation and support rather than simply connecting tourist stops.'},{title:'Safari and motorcycle adventure together',body:'Selected itineraries can combine riding days with wildlife experiences and rest days for a broader Kenya trip.'}], faqs:[{question:'Do I need off-road experience?',answer:'Requirements depend on the specific tour and terrain. Check the tour difficulty and route details before booking.'}], related: relatedEn },
      ar: { eyebrow:'مغامرات الدراجات في كينيا', title:'رحلات الدراجات النارية في كينيا — مغامرة تتجاوز السفاري التقليدي', intro:'اجمع بين قيادة الدراجات وطبيعة كينيا والمرتفعات والبحيرات ومناطق الحياة البرية ضمن مسار منظم محلياً.', sections:[{title:'مسارات مبنية للقيادة الفعلية',body:'تصميم المسار يراعي التضاريس والمسافة اليومية وخبرة السائق ومستوى الإقامة والدعم، وليس فقط ربط الأماكن السياحية.'},{title:'الدراجات والسفاري في رحلة واحدة',body:'يمكن لبعض البرامج الجمع بين أيام القيادة وتجارب الحياة البرية وأيام الراحة.'}], faqs:[{question:'هل أحتاج خبرة في الطرق الوعرة؟',answer:'يعتمد ذلك على البرنامج والتضاريس. راجع مستوى الصعوبة وتفاصيل المسار قبل الحجز.'}], related: relatedAr }
    }
  },
  'kenya-tanzania-safari': {
    title: { en: 'Kenya & Tanzania Safari | Private East Africa Packages', ar: 'سفاري كينيا وتنزانيا | برامج شرق أفريقيا الخاصة' },
    description: { en: 'Combine Kenya and Tanzania in one tailored East Africa safari with a locally coordinated private itinerary.', ar: 'اجمع كينيا وتنزانيا في برنامج سفاري واحد خاص ومصمم حسب مدة رحلتك واهتماماتك.' },
    copy: {
      en: { eyebrow:'East Africa safari', title:'Kenya & Tanzania Safari — One Tailored East Africa Journey', intro:'Combine major wildlife regions across Kenya and Tanzania in one coordinated itinerary, with pacing and accommodation matched to your trip length.', sections:[{title:'Two countries, one route strategy',body:'Cross-border itineraries need careful sequencing to avoid unnecessary travel time and duplicate experiences.'},{title:'Choose the right combination',body:'Depending on season and priorities, the route can combine Kenya’s Maasai Mara and Amboseli with Tanzania’s Serengeti, Ngorongoro and other regions.'}], faqs:[{question:'How long should a Kenya and Tanzania safari be?',answer:'The right duration depends on the number of regions. A longer itinerary generally allows better pacing and less rushed transfers.'}], related: relatedEn },
      ar: { eyebrow:'سفاري شرق أفريقيا', title:'سفاري كينيا وتنزانيا — رحلة واحدة مصممة بشكل متكامل', intro:'اجمع أهم مناطق الحياة البرية في كينيا وتنزانيا ضمن برنامج واحد منظم، مع ضبط المسافات والإقامة حسب عدد أيامك.', sections:[{title:'دولتان ضمن مسار واحد',body:'البرامج العابرة للحدود تحتاج ترتيباً دقيقاً لتقليل التنقلات غير الضرورية وتجنب تكرار التجارب.'},{title:'اختر الدمج المناسب',body:'حسب الموسم واهتماماتك يمكن دمج ماساي مارا وأمبوسيلي مع سيرينجيتي ونغورونغورو ومناطق أخرى.'}], faqs:[{question:'كم يوم مناسب لرحلة كينيا وتنزانيا؟',answer:'يعتمد ذلك على عدد الوجهات، وكلما زادت المدة أمكن ترتيب التنقلات براحة أكبر.'}], related: relatedAr }
    }
  }
}
