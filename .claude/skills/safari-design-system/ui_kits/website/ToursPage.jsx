const { Button } = window.SafariAdventureRidersDesignSystem_473602;

const TOURS = [
  { id: 1, type: 'bike', title: 'Nairobi to Coast Ride', img: 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=700&q=70', days: 9, countries: 'Kenya', desc: 'A fully-supported group motorcycle tour from the capital to the Indian Ocean, through the Rift Valley and Tsavo.' },
  { id: 2, type: 'private', title: 'Masai Mara Private Safari', img: 'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=700&q=70', days: 6, countries: 'Kenya', desc: 'Exclusive camps and a private guide through the heart of the Mara, timed for the Great Migration.' },
  { id: 3, type: 'bike', title: 'Mount Kenya Highlands Loop', img: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=700&q=70', days: 7, countries: 'Kenya', desc: 'Forest trails and highland switchbacks around Africa\u2019s second-highest peak.' },
  { id: 4, type: 'private', title: 'Serengeti & Ngorongoro', img: 'https://images.unsplash.com/photo-1547970810-dc1eac37d174?auto=format&fit=crop&w=700&q=70', days: 8, countries: 'Tanzania', desc: 'Luxury tented camps across two of East Africa\u2019s most iconic conservation areas.' },
  { id: 5, type: 'bike', title: 'Great Rift Valley Explorer', img: 'https://images.unsplash.com/photo-1535941339077-2dd1c7963098?auto=format&fit=crop&w=700&q=70', days: 5, countries: 'Kenya', desc: 'Volcanic lakes, escarpments and flamingo colonies — an intermediate 5-day ride.' },
  { id: 6, type: 'private', title: 'Amboseli & Kilimanjaro Views', img: 'https://images.unsplash.com/photo-1504173010664-32509aeebb62?auto=format&fit=crop&w=700&q=70', days: 4, countries: 'Kenya', desc: 'Elephant herds against the backdrop of Kilimanjaro, from a private tented camp.' },
];

function ToursPage({ lang, go }) {
  const isAr = lang === 'ar';
  const t = isAr ? {
    title: 'جولات السفاري لدينا',
    subtitle: 'استكشف مجموعتنا المختارة من تجارب السفاري التي لا تُنسى في شرق أفريقيا.',
    days: 'أيام', requestQuote: 'طلب عرض سعر',
    ctaTitle: 'لم تجد الجولة المثالية؟', ctaText: 'أخبرنا بتفضيلاتك وسننشئ رحلة سفاري مخصصة لك.', ctaButton: 'أنشئ جولة مخصصة',
  } : {
    title: 'Our Safari Tours',
    subtitle: "Explore our curated collection of unforgettable East African safari experiences.",
    days: 'days', requestQuote: 'View Tour',
    ctaTitle: "Can't Find the Perfect Tour?", ctaText: "Let us know your preferences and we'll create a custom safari just for you.", ctaButton: 'Create a Custom Tour',
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <section style={{
        color: '#fff', padding: '88px 24px', textAlign: 'center',
        backgroundImage: `linear-gradient(rgba(20,25,15,0.72), rgba(20,25,15,0.8)), url(https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1600&q=60)`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-display)', fontWeight: 700, margin: '0 0 16px' }}>{t.title}</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, color: 'rgba(255,255,255,0.8)', maxWidth: 640, margin: '0 auto' }}>{t.subtitle}</p>
      </section>

      <section style={{ padding: '64px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 'var(--container-md)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 28 }}>
          {TOURS.map((tour) => {
            const accent = tour.type === 'bike' ? 'var(--murram)' : 'var(--gold)';
            return (
              <div key={tour.id} style={{ background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-warm)', overflow: 'hidden', cursor: 'pointer' }} onClick={() => go('tour-detail', tour)}>
                <div style={{ height: 180, backgroundImage: `url(${tour.img})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: 12, insetInlineStart: 12, background: accent, color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 'var(--radius-pill)' }}>
                    {tour.type === 'bike' ? 'Bike Tour' : 'Private Safari'}
                  </span>
                </div>
                <div style={{ padding: 22 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 6px' }}>{tour.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 10px', fontFamily: 'var(--font-body)' }}>{tour.countries} · {tour.days} {t.days}</p>
                  <p style={{ fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6, margin: '0 0 18px', fontFamily: 'var(--font-body)' }}>{tour.desc}</p>
                  <Button variant="primary" size="sm">{t.requestQuote}</Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ padding: '64px 24px', background: 'var(--admin-bg)', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 12px' }}>{t.ctaTitle}</h2>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-body)', margin: '0 0 24px' }}>{t.ctaText}</p>
        <Button variant="primary" size="lg" onClick={() => go('quote')}>{t.ctaButton}</Button>
      </section>
    </div>
  );
}

window.ToursPage = ToursPage;
window.TOURS = TOURS;
