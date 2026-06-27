import Link from 'next/link'
import { Suspense } from 'react'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import { getServerLocale } from '@/lib/i18n'

const G = '#7A9A4A'

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const sp = await searchParams
  const locale = await getServerLocale(sp)
  const isAr = locale === 'ar'

  const t = isAr ? {
    title: 'عن سفاري أدفنتشر رايدرز',
    subtitle: 'اكتشف قصتنا ورسالتنا في صنع تجارب أفريقية لا تُنسى.',
    ourStory: 'قصتنا',
    story1: 'تأسست سفاري أدفنتشر رايدرز عام 2009 من شغف بالحياة البرية والمناظر الطبيعية المذهلة في أفريقيا. ما بدأ كعملية صغيرة مع حفنة من خبراء الطبيعة نما ليصبح أحد أكثر منظمي رحلات السفاري الموثوقين في شرق أفريقيا.',
    story2: 'على مدى السنوات الخمس عشرة الماضية، حظينا بشرف مشاركة البرية الأفريقية مع أكثر من 500 مسافر من جميع أنحاء العالم. كل رحلة سفاري هي أكثر من مجرد عطلة — إنها تجربة تحويلية تربطك بالطبيعة والثقافات بطرق لن تنساها أبداً.',
    story3: 'التزامنا بالسياحة المسؤولة والحفاظ على البيئة والخدمة الاستثنائية يميزنا. نؤمن بأن أفضل رحلات السفاري هي تلك التي يتم فيها التخطيط لكل تفصيلة وتنفيذها بعناية.',
    missionValues: 'رسالتنا وقيمنا',
    ourMission: 'رسالتنا',
    missionText: 'صنع تجارب أفريقية أصيلة وتحويلية من خلال رحلات سفاري بقيادة خبراء تضع الحفاظ على الحياة البرية والاحترام الثقافي ورضا المسافر في المقدمة.',
    ourValues: 'قيمنا',
    values: ['التميز في كل تفصيلة', 'الحفاظ على البيئة والاستدامة', 'الاحترام الثقافي والنزاهة', 'السلامة والموثوقية'],
    whyChoose: 'لماذا يختارنا المسافرون',
    expertTitle: 'معرفة محلية خبيرة',
    expertText: 'مرشدونا الطبيعيون وُلدوا ونشأوا في شرق أفريقيا بخبرة لا مثيل لها في سلوك الحياة البرية والأنظمة البيئية.',
    curatedTitle: 'تجارب مصممة بعناية',
    curatedText: 'كل رحلة سفاري مخصصة وفقاً لاهتماماتك وإيقاعك وتفضيلاتك — لا جولات نمطية هنا.',
    conservationTitle: 'التركيز على الحفاظ على البيئة',
    conservationText: 'نسبة من كل جولة تدعم مشاريع الحفاظ المحلية ومبادرات المجتمع.',
    ctaTitle: 'هل أنت مستعد للانضمام إلى مغامرتنا؟',
    ctaText: 'دعنا نساعدك في التخطيط لرحلة سفاري العمر. فريقنا جاهز لإنشاء تجربة شخصية لك.',
    ctaButton: 'خطط رحلتك',
  } : {
    title: 'About Safari Adventure Riders',
    subtitle: 'Discover our story and mission to create unforgettable African experiences.',
    ourStory: 'Our Story',
    story1: "Founded in 2009, Safari Adventure Riders was born from a passion for Africa's incredible wildlife and landscapes. What started as a small operation with just a handful of expert naturalists has grown into one of East Africa's most trusted safari operators.",
    story2: "Over the past 15 years, we've had the privilege of sharing the African bush with over 500 travelers from around the world. Each safari is more than just a vacation—it's a transformative experience that connects you with nature and cultures in ways you'll never forget.",
    story3: 'Our commitment to responsible tourism, conservation, and exceptional service sets us apart. We believe that the best safaris are those where every detail is thoughtfully planned and executed.',
    missionValues: 'Our Mission & Values',
    ourMission: 'Our Mission',
    missionText: 'To create authentic, transformative African experiences through expert-led safaris that prioritize wildlife conservation, cultural respect, and traveler satisfaction.',
    ourValues: 'Our Values',
    values: ['Excellence in every detail', 'Conservation and sustainability', 'Cultural respect and integrity', 'Safety and reliability'],
    whyChoose: 'Why Travelers Choose Us',
    expertTitle: 'Expert Local Knowledge',
    expertText: 'Our naturalist guides are born and raised in East Africa with unparalleled expertise in wildlife behavior and ecosystems.',
    curatedTitle: 'Curated Experiences',
    curatedText: 'Every safari is customized to your interests, pace, and preferences—no cookie-cutter tours here.',
    conservationTitle: 'Conservation Focus',
    conservationText: 'A percentage of every tour supports local conservation projects and community initiatives.',
    ctaTitle: 'Ready to Join Our Adventure?',
    ctaText: 'Let us help you plan the safari of a lifetime. Our team is ready to create a personalized experience just for you.',
    ctaButton: 'Plan Your Safari',
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <Suspense>
        <PublicHeader />
      </Suspense>
      <main>
        {/* Page Header */}
        <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.title}</h1>
            <p className="text-lg text-gray-300">{t.subtitle}</p>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">{t.ourStory}</h2>
                <p className="text-gray-600 mb-4 leading-relaxed">{t.story1}</p>
                <p className="text-gray-600 mb-4 leading-relaxed">{t.story2}</p>
                <p className="text-gray-600 leading-relaxed">{t.story3}</p>
              </div>
              <div className="rounded-xl h-96 flex items-center justify-center text-8xl" style={{ backgroundColor: G }}>
                🦁
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Values */}
        <section className="py-16 md:py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">{t.missionValues}</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-8 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t.ourMission}</h3>
                <p className="text-gray-600">{t.missionText}</p>
              </div>
              <div className="bg-white rounded-xl p-8 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t.ourValues}</h3>
                <ul className="text-gray-600 space-y-2">
                  {t.values.map((v) => <li key={v}>✓ {v}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Why Us */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">{t.whyChoose}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">🌍</div>
                <h3 className="font-bold text-gray-900 mb-3">{t.expertTitle}</h3>
                <p className="text-gray-600 text-sm">{t.expertText}</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🏕️</div>
                <h3 className="font-bold text-gray-900 mb-3">{t.curatedTitle}</h3>
                <p className="text-gray-600 text-sm">{t.curatedText}</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">💚</div>
                <h3 className="font-bold text-gray-900 mb-3">{t.conservationTitle}</h3>
                <p className="text-gray-600 text-sm">{t.conservationText}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20" style={{ backgroundColor: G }}>
          <div className="max-w-4xl mx-auto px-4 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{t.ctaTitle}</h2>
            <p className="text-lg mb-8 opacity-90">{t.ctaText}</p>
            <Link
              href={`/quote-request?lang=${locale}`}
              className="px-8 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition inline-block"
            >
              {t.ctaButton}
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
