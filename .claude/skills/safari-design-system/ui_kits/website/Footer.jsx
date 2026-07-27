const { site, WHATSAPP_LINK } = window;

function Footer({ lang, go }) {
  const isAr = lang === 'ar';
  const t = isAr ? {
    tagline: 'اختبر البرية. رحلات سفاري بقيادة خبراء عبر أكثر وجهات شرق أفريقيا شهرة.',
    explore: 'استكشف', browseTours: 'تصفح الجولات', gallery: 'معرض الصور', getQuote: 'احصل على عرض سعر', ourStory: 'قصتنا',
    company: 'الشركة', contactUs: 'اتصل بنا', privacy: 'سياسة الخصوصية', terms: 'شروط الخدمة',
    getInTouch: 'تواصل معنا', email: 'البريد الإلكتروني', phone: 'الهاتف', whatsapp: 'واتساب', rights: 'جميع الحقوق محفوظة.',
  } : {
    tagline: "Experience the wild. Expert-led safaris across East Africa's most iconic destinations.",
    explore: 'Explore', browseTours: 'Browse Tours', gallery: 'Gallery', getQuote: 'Get a Quote', ourStory: 'Our Story',
    company: 'Company', contactUs: 'Contact Us', privacy: 'Privacy Policy', terms: 'Terms of Service',
    getInTouch: 'Get in Touch', email: 'Email', phone: 'Phone', whatsapp: 'WhatsApp', rights: 'All rights reserved.',
  };
  const linkStyle = { color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)' };

  return (
    <footer dir={isAr ? 'rtl' : 'ltr'} style={{ background: '#111827', color: '#d1d5db', marginTop: 60 }}>
      <div style={{ maxWidth: 'var(--container-lg)', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 32, marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <img src="../../assets/logo-safari-riders.png" style={{ height: 26 }} alt="" />
              <span style={{ fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>Safari Adventure Riders</span>
            </div>
            <p style={{ fontSize: 14, color: '#9ca3af', fontFamily: 'var(--font-body)' }}>{t.tagline}</p>
          </div>
          <div>
            <h3 style={{ fontWeight: 700, color: '#fff', marginBottom: 16, fontFamily: 'var(--font-body)', fontSize: 15 }}>{t.explore}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a style={linkStyle} onClick={() => go('tours')}>{t.browseTours}</a>
              <a style={linkStyle} onClick={() => go('gallery')}>{t.gallery}</a>
              <a style={linkStyle} onClick={() => go('quote')}>{t.getQuote}</a>
              <a style={linkStyle} onClick={() => go('about')}>{t.ourStory}</a>
            </div>
          </div>
          <div>
            <h3 style={{ fontWeight: 700, color: '#fff', marginBottom: 16, fontFamily: 'var(--font-body)', fontSize: 15 }}>{t.company}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a style={linkStyle} onClick={() => go('contact')}>{t.contactUs}</a>
              <a style={linkStyle}>{t.privacy}</a>
              <a style={linkStyle}>{t.terms}</a>
            </div>
          </div>
          <div>
            <h3 style={{ fontWeight: 700, color: '#fff', marginBottom: 16, fontFamily: 'var(--font-body)', fontSize: 15 }}>{t.getInTouch}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, fontFamily: 'var(--font-body)' }}>
              <p style={{ margin: 0 }}>{t.email}: info@safariadventureriders.com</p>
              <p style={{ margin: 0 }}>{t.phone}: +254 710 789 789</p>
              <p style={{ margin: 0 }}>{t.whatsapp}: +254 710 789 789</p>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #1f2937', paddingTop: 24, textAlign: 'center', fontSize: 13, color: '#9ca3af', fontFamily: 'var(--font-body)' }}>
          © 2026 Safari Adventure Riders. {t.rights}
        </div>
      </div>
    </footer>
  );
}

function WhatsAppFab() {
  return (
    <a href="#" onClick={(e) => e.preventDefault()} aria-label="Chat on WhatsApp" style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 50, width: 56, height: 56, borderRadius: '50%',
      background: 'var(--whatsapp)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: 'var(--shadow-float)', cursor: 'pointer',
    }}>
      <svg viewBox="0 0 32 32" style={{ width: 28, height: 28, fill: '#fff' }} aria-hidden="true">
        <path d="M16.003 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.6 4.46 1.74 6.4L3.2 28.8l6.57-1.72a12.74 12.74 0 0 0 6.23 1.6h.01c7.06 0 12.8-5.74 12.8-12.8 0-3.42-1.33-6.63-3.75-9.05A12.7 12.7 0 0 0 16.003 3.2Zm0 23.07h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4.03 1.06 1.08-3.93-.25-.4a10.55 10.55 0 0 1-1.62-5.63c0-5.86 4.77-10.62 10.63-10.62 2.84 0 5.5 1.1 7.51 3.11a10.55 10.55 0 0 1 3.11 7.52c0 5.86-4.77 10.63-10.63 10.63Zm5.83-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.71.16-.21.32-.82 1.04-1 1.25-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54l-.6-.01c-.21 0-.55.08-.83.4-.29.32-1.09 1.07-1.09 2.61 0 1.54 1.12 3.03 1.28 3.24.16.21 2.2 3.36 5.33 4.71.74.32 1.32.51 1.78.65.75.24 1.43.21 1.97.13.6-.09 1.89-.77 2.16-1.52.27-.74.27-1.38.18-1.52-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  );
}

window.Footer = Footer;
window.WhatsAppFab = WhatsAppFab;
