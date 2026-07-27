const { LanguageToggle, Button } = window.SafariAdventureRidersDesignSystem_473602;

function Header({ route, go, lang, setLang, signedIn }) {
  const isAr = lang === 'ar';
  const t = isAr ? {
    tours: 'الجولات', departures: 'الرحلات', gallery: 'المعرض', about: 'نبذة عنا',
    contact: 'اتصل بنا', dashboard: 'حسابي', signin: 'تسجيل الدخول', quote: 'طلب عرض سعر',
  } : {
    tours: 'Tours', departures: 'Departures', gallery: 'Gallery', about: 'About',
    contact: 'Contact', dashboard: 'Dashboard', signin: 'Sign In', quote: 'Request Quote',
  };

  const navItem = (key, label) => (
    <a
      key={key}
      onClick={() => go(key)}
      style={{
        fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
        color: route === key ? 'var(--text-heading)' : 'var(--text-body)',
      }}
    >
      {label}
    </a>
  );

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fff', borderBottom: '1px solid var(--border-warm)' }}>
      <div style={{ maxWidth: 'var(--container-lg)', margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <a onClick={() => go('home')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textDecoration: 'none' }}>
          <img src="../../assets/logo-safari-riders.png" alt="Safari Adventure Riders" style={{ height: 34, width: 'auto' }} />
          <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontFamily: 'var(--font-display)', fontSize: 15 }}>Safari Adventure Riders</span>
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          {navItem('tours', t.tours)}
          {navItem('departures', t.departures)}
          {navItem('gallery', t.gallery)}
          {navItem('about', t.about)}
          {navItem('contact', t.contact)}
          {signedIn ? navItem('dashboard', t.dashboard) : navItem('login', t.signin)}
          <Button variant="primary" size="sm" onClick={() => go('quote')}>{t.quote}</Button>
          <LanguageToggle value={lang} onChange={setLang} />
        </nav>
      </div>
    </header>
  );
}

window.Header = Header;
