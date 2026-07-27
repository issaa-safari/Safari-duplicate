const { FeatureCard, Card, Eyebrow, Button } = window.SafariAdventureRidersDesignSystem_473602;

const BIKE_IMG = 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=900&q=70';
const SAFARI_IMG = 'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=900&q=70';
const HERO_IMG = 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=2000&q=70';

function HomePage({ lang, go }) {
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const t = isAr ? {
    headline: 'اركب البرية. اقتحم البرية.',
    sub: 'جولات دراجات جماعية وسفاري خاصة في كينيا وشرق أفريقيا — مُصممة لمن يطلب أكثر من مجرد رحلة سياحية.',
    cta: 'اختر مسارك', quote: 'طلب عرض سعر',
    trailHeading: 'اختر مسارك', trailSub: 'مسارين مختلفان. نفس الشغف بأفريقيا.',
    c1: 'مقرنا نيروبي، كينيا', c2: 'تأسسنا عام 2009', c3: 'نتحدث الإنجليزية والعربية والسواحيلية',
    whyHeading: 'لماذا تحجز مباشرة؟', whySub: "ليس مجرد شعار — هذا ما يعنيه الحجز المباشر معنا عملياً.",
    testHeading: 'ماذا يقول مسافرونا',
    ctaHeading: 'هل أنت مستعد لتخطيط رحلتك؟', ctaSub: 'تواصل معنا لتحصل على عرض مخصص، أو ابدأ محادثة على واتساب.',
    ctaQuote: 'طلب عرض سعر', ctaWhatsapp: 'تحدث معنا على واتساب',
  } : {
    headline: 'Ride the Bush. Drive the Wild.',
    sub: 'Group bike tours and private safaris across Kenya and East Africa — designed for people who want more than a package holiday.',
    cta: 'Plan Your Adventure', quote: 'Request a Quote',
    trailHeading: 'Choose Your Trail', trailSub: 'Two different paths. The same passion for East Africa.',
    c1: 'Based in Nairobi, Kenya', c2: 'Operating since 2009', c3: 'English · Arabic · Swahili',
    whyHeading: 'Why book direct?', whySub: "Not a slogan — here's what booking direct with us actually means.",
    testHeading: 'What Our Travellers Say',
    ctaHeading: 'Ready to plan your trip?', ctaSub: 'Get in touch for a personalised quote, or start a conversation on WhatsApp.',
    ctaQuote: 'Request a Quote', ctaWhatsapp: 'Chat on WhatsApp',
  };

  const whyPoints = isAr ? [
    { title: 'بدون رسوم وكالات', body: 'أنت تتفاوض مباشرة مع المشغل الذي ينفذ الرحلة. لا وسيط، لا هامش ربح مضخوم.' },
    { title: 'مرشدون صمموا المسارات بأنفسهم', body: 'صمم مرشدونا مسارات الرحلات من خلال سنوات في الميدان — وليس من كتالوج.' },
    { title: 'دعم عبر واتساب بشكل أساسي', body: 'بالعربية والإنجليزية والسواحيلية. أشخاص حقيقيون لا صندوق تذاكر.' },
  ] : [
    { title: 'No agency markup', body: "You're quoting directly with the operator who runs the trip. No middleman, no inflated margins." },
    { title: 'Guides who built the routes', body: 'Our guides designed the itineraries from years in the field — not adapted from a catalogue.' },
    { title: 'WhatsApp-first support', body: 'English, Arabic and Swahili. Real people, not a ticket queue.' },
  ];

  const reviews = [
    { name: 'Sarah M.', loc: 'London, UK', text: 'The most incredible trip of our lives. Our guide spotted the Big Five within two days.' },
    { name: 'Abdullah A.', loc: 'Riyadh, Saudi Arabia', text: 'Everything was arranged perfectly from the airport pickup to the final game drive.' },
    { name: 'Elena & Marco', loc: 'Milan, Italy', text: 'Witnessing the Great Migration was a dream come true. We will be back.' },
  ];

  return (
    <div dir={dir}>
      {/* Hero */}
      <section style={{
        position: 'relative', minHeight: '86vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end', overflow: 'hidden', background: 'var(--bush)',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${HERO_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'var(--grad-hero)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 'var(--container-sm)', margin: '0 auto', width: '100%', padding: '0 24px 72px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-hero)', fontWeight: 700, color: '#fff', lineHeight: 'var(--lh-tight)', margin: '0 0 20px', letterSpacing: 'var(--ls-tight)' }}>{t.headline}</h1>
          <p style={{ color: 'var(--text-on-dark)', fontFamily: 'var(--font-body)', fontSize: 'var(--fs-lg)', lineHeight: 'var(--lh-relaxed)', margin: '0 0 36px', maxWidth: 560 }}>{t.sub}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            <a onClick={() => go('tours')} style={{ background: '#fff', color: 'var(--bush)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 8, cursor: 'pointer' }}>{t.cta}</a>
            <a onClick={() => go('quote')} style={{ border: '2px solid rgba(255,255,255,0.5)', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, padding: '12px 28px', borderRadius: 8, cursor: 'pointer' }}>{t.quote}</a>
          </div>
        </div>
      </section>

      {/* Choose Your Trail */}
      <section style={{ background: 'var(--bush)', padding: 'var(--section-pad-y) var(--section-pad-x)' }}>
        <div style={{ maxWidth: 'var(--container-md)', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-display)', fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>{t.trailHeading}</h2>
            <p style={{ color: 'var(--text-on-dark-soft)', fontFamily: 'var(--font-body)', margin: 0 }}>{t.trailSub}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>
            <FeatureCard imageUrl={BIKE_IMG} accent="#B0492B" badge={isAr ? 'جولات الدراجات' : 'Group Bike Tours'} heading={isAr ? 'اركب البرية' : 'Ride the Bush'} body={isAr ? 'جولات دراجات جماعية بقيادة خبراء من نيروبي إلى الساحل.' : 'Expert-led group rides from Nairobi to the coast. Fully supported, KTM-grade adventure.'} cta={isAr ? 'استكشف جولات الدراجات' : 'Explore Bike Tours'} href="#" />
            <FeatureCard imageUrl={SAFARI_IMG} accent="#C9A24B" badge={isAr ? 'سفاري خاص' : 'Private Safari'} heading={isAr ? 'أطلق العنان للبرية' : 'Drive the Wild'} body={isAr ? 'مسارات مخصصة، مخيمات حصرية، مجموعتك وحدها فقط.' : 'Custom itineraries, exclusive camps, your group only.'} cta={isAr ? 'استكشف السفاري الخاص' : 'Explore Private Safaris'} href="#" />
          </div>
        </div>
      </section>

      {/* Credibility bar */}
      <section style={{ background: 'var(--bush)', padding: 'var(--section-pad-y-sm) var(--section-pad-x)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 40px' }}>
          {[t.c1, t.c2, t.c3].map((f, i) => (
            <span key={i} style={{ color: 'var(--text-on-dark-soft)', fontFamily: 'var(--font-body)', fontSize: 14, letterSpacing: 'var(--ls-wide)' }}>
              {i > 0 && <span style={{ color: 'rgba(234,227,210,0.3)', marginInlineEnd: 10 }}>·</span>}{f}
            </span>
          ))}
        </div>
      </section>

      {/* Why book direct */}
      <section style={{ background: 'var(--sand)', padding: 'var(--section-pad-y) var(--section-pad-x)' }}>
        <div style={{ maxWidth: 'var(--container-md)', margin: '0 auto' }}>
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--bush)', margin: '0 0 10px' }}>{t.whyHeading}</h2>
            <p style={{ color: 'var(--stone)', fontFamily: 'var(--font-body)', margin: 0 }}>{t.whySub}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24 }}>
            {whyPoints.map((p) => (
              <Card key={p.title}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--bush)', margin: '0 0 10px' }}>{p.title}</h3>
                <p style={{ color: 'var(--stone)', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{p.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ background: '#fff', padding: '64px 24px 80px' }}>
        <div style={{ maxWidth: 'var(--container-md)', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--bush)', margin: '0 0 32px' }}>{t.testHeading}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24 }}>
            {reviews.map((r) => (
              <Card key={r.name}>
                <div style={{ color: 'var(--star)', fontSize: 16, marginBottom: 12 }}>★★★★★</div>
                <p style={{ color: 'var(--text-heading)', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>“{r.text}”</p>
                <div style={{ borderTop: '1px solid var(--border-warm)', paddingTop: 14 }}>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-heading)', fontFamily: 'var(--font-body)' }}>{r.name}</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--olive)', fontFamily: 'var(--font-body)' }}>{r.loc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: 'var(--bush)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-display)', fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>{t.ctaHeading}</h2>
          <p style={{ color: 'var(--text-on-dark-soft)', fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.7, margin: '0 0 36px' }}>{t.ctaSub}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
            <Button variant="primary" size="lg" onClick={() => go('quote')}>{t.ctaQuote}</Button>
            <a onClick={(e) => e.preventDefault()} style={{ background: 'var(--whatsapp)', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, padding: '14px 28px', borderRadius: 8, cursor: 'pointer' }}>{t.ctaWhatsapp}</a>
          </div>
        </div>
      </section>
    </div>
  );
}

window.HomePage = HomePage;
