type Review ={ name: string; location_en: string; location_ar: string; en: string; ar: string }

const REVIEWS: Review[] = [
  {
    name: 'Sarah M.',
    location_en: 'London, UK',
    location_ar: 'لندن، المملكة المتحدة',
    en: 'The most incredible trip of our lives. Our guide spotted the Big Five within two days and the lodges were beyond anything we imagined.',
    ar: 'أروع رحلة في حياتنا. رصد دليلنا الحيوانات الخمسة الكبرى خلال يومين وكانت النزل تفوق كل ما تخيلناه.',
  },
  {
    name: 'Abdullah A.',
    location_en: 'Riyadh, Saudi Arabia',
    location_ar: 'الرياض، السعودية',
    en: 'Everything was arranged perfectly from the airport pickup to the final game drive. Communication in Arabic made it so easy for my family.',
    ar: 'كان كل شيء منظماً بشكل مثالي من الاستقبال في المطار حتى آخر جولة. التواصل بالعربية جعل الأمر سهلاً جداً لعائلتي.',
  },
  {
    name: 'Elena & Marco',
    location_en: 'Milan, Italy',
    location_ar: 'ميلانو، إيطاليا',
    en: 'Witnessing the Great Migration was a dream come true. Professional, safe, and genuinely passionate guides. We will be back.',
    ar: 'كانت مشاهدة الهجرة الكبرى حلماً تحقق. أدلاء محترفون وآمنون وشغوفون حقاً. سنعود بالتأكيد.',
  },
]

export default function Testimonials({ lang = 'en' }: { lang?: string }) {
  const isAr = lang === 'ar'
  const heading = isAr ? 'ماذا يقول مسافرونا' : 'What Our Travellers Say'
  // No fabricated metrics (PRODUCT.md) — describe the reviews, don't invent numbers
  const sub = isAr
    ? 'آراء حقيقية من مسافرين استكشفوا شرق أفريقيا معنا'
    : 'Real feedback from travellers who explored East Africa with us'

  return (
    <section className="py-16 md:py-20 bg-sand" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4">
        <h2
          className="text-3xl md:text-4xl font-bold text-bush text-center mb-3"
          style={{ fontFamily: 'var(--font-display, "Readex Pro", sans-serif)' }}
        >
          {heading}
        </h2>
        <p className="text-stone text-center mb-12 max-w-2xl mx-auto">{sub}</p>
        <div className="grid md:grid-cols-3 gap-8">
          {REVIEWS.map((r) => (
            <div key={r.name} className="bg-white rounded-xl p-8 border border-stone/20 shadow-sm flex flex-col">
              <div className="text-gold text-lg mb-4" aria-hidden="true">★★★★★</div>
              <p className="text-stone leading-relaxed flex-grow">“{isAr ? r.ar : r.en}”</p>
              <div className="mt-6 pt-4 border-t border-sand">
                {/* <bdi> keeps Latin names (with trailing periods) intact inside RTL text */}
                <p className="font-semibold text-bush"><bdi>{r.name}</bdi></p>
                <p className="text-sm text-olive-dk">{isAr ? r.location_ar : r.location_en}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
