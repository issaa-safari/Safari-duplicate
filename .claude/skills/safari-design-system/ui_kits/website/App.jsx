function InfoPage({ label }) {
  return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, textAlign: 'center' }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 8px' }}>{label}</h2>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto' }}>
          Not recreated in this snapshot — the real page exists in the codebase but wasn't a core screen for this kit.
        </p>
      </div>
    </div>
  );
}

function App() {
  const [route, setRoute] = React.useState('home');
  const [tour, setTour] = React.useState(null);
  const [lang, setLang] = React.useState('en');
  const [signedIn, setSignedIn] = React.useState(true);

  function go(next, payload) {
    setRoute(next);
    if (payload) setTour(payload);
    window.scrollTo(0, 0);
  }

  let page;
  if (route === 'home') page = <window.HomePage lang={lang} go={go} />;
  else if (route === 'tours') page = <window.ToursPage lang={lang} go={go} />;
  else if (route === 'tour-detail') page = <window.TourDetailPage lang={lang} go={go} tour={tour} />;
  else if (route === 'quote') page = <window.QuoteRequestPage lang={lang} />;
  else if (route === 'dashboard') page = <window.DashboardPage lang={lang} />;
  else if (route === 'admin') page = <window.AdminPage />;
  else if (route === 'login') page = <InfoPage label="Sign In" />;
  else page = <InfoPage label={route.charAt(0).toUpperCase() + route.slice(1)} />;

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      <window.Header route={route} go={go} lang={lang} setLang={setLang} signedIn={signedIn} />
      {page}
      <window.Footer lang={lang} go={go} />
      <window.WhatsAppFab />

      {/* Kit-only surface switcher — not part of the real product UI */}
      <div style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 60, background: 'var(--bush)', borderRadius: 999, padding: '6px 6px', display: 'flex', gap: 4, boxShadow: 'var(--shadow-float)' }}>
        {['home', 'tours', 'quote', 'dashboard', 'admin'].map((r) => (
          <button key={r} onClick={() => go(r)} style={{
            border: 'none', borderRadius: 999, padding: '7px 14px', fontSize: 12, fontFamily: 'var(--font-body)',
            fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
            background: route === r ? 'var(--olive)' : 'transparent', color: '#fff',
          }}>{r}</button>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
