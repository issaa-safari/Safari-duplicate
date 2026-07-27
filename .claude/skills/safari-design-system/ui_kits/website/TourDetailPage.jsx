const { Button, StaffPill, ProgressBar } = window.SafariAdventureRidersDesignSystem_473602;

const DEPARTURES = [
  { id: 1, start: 'Aug 12, 2026', end: 'Aug 20, 2026', seats: 4, max: 12, price: 2450, status: 'available' },
  { id: 2, start: 'Sep 3, 2026', end: 'Sep 11, 2026', seats: 2, max: 12, price: 2450, status: 'low' },
  { id: 3, start: 'Oct 1, 2026', end: 'Oct 9, 2026', seats: 0, max: 12, price: 2450, status: 'full' },
];

const STAFF = [{ name: 'James Otieno', role: 'Lead Guide' }, { name: 'Fatima Noor', role: 'Trip Coordinator' }, { name: 'Peter Kamau', role: 'Driver' }];

function TourDetailPage({ lang, go, tour }) {
  const isAr = lang === 'ar';
  const active = tour || window.TOURS[0];
  const accent = active.type === 'bike' ? '#B0492B' : '#C9A24B';
  const tripLabel = active.type === 'bike' ? (isAr ? 'جولة دراجات' : 'Bike Tour') : (isAr ? 'سفاري خاص' : 'Private Safari');

  const statusBadge = (s) => {
    const map = {
      available: { bg: 'var(--status-success-bg)', fg: 'var(--status-success-fg)', label: 'available' },
      low: { bg: 'var(--status-warn-bg)', fg: 'var(--status-warn-fg)', label: 'seats left' },
      full: { bg: 'var(--status-neutral-bg)', fg: 'var(--status-neutral-fg)', label: 'Fully Booked' },
    };
    return map[s];
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <section style={{ position: 'relative', minHeight: '78vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden', background: 'var(--bush)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${active.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'var(--grad-hero)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 'var(--container-md)', margin: '0 auto', width: '100%', padding: '0 24px 56px' }}>
          <span style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 4, background: accent, color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-body)', marginBottom: 20 }}>{tripLabel}</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem,5vw,3.6rem)', fontWeight: 700, color: '#fff', lineHeight: 1.08, margin: '0 0 14px', maxWidth: 700 }}>{active.title}</h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.78)', maxWidth: 560, lineHeight: 1.6, margin: '0 0 24px', fontFamily: 'var(--font-body)' }}>{active.desc}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
            {[`${active.days} days`, active.countries, active.type === 'bike' ? 'max 10' : 'max 6'].map((c) => (
              <span key={c} style={{ padding: '4px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', fontSize: 13, fontWeight: 600, color: '#fff' }}>{c}</span>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
            <div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block' }}>From</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 700, color: '#fff' }}>$2,450<span style={{ fontSize: '0.45em', color: 'rgba(255,255,255,0.6)', fontWeight: 400, marginInlineStart: 6 }}>/ person</span></span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <a style={{ padding: '14px 28px', borderRadius: 8, background: accent, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Book Now</a>
              <a onClick={() => go('quote')} style={{ padding: '14px 28px', borderRadius: 8, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Request Quote</a>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '64px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 'var(--container-md)', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 24px' }}>Upcoming Departures</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {DEPARTURES.map((d) => {
              const s = statusBadge(d.status);
              const pct = Math.round(((d.max - d.seats) / d.max) * 100);
              return (
                <div key={d.id} style={{ background: d.status === 'full' ? '#f9f9f7' : '#fff', borderRadius: 12, border: '1px solid var(--border-warm)', padding: '20px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, opacity: d.status === 'full' ? 0.7 : 1 }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>{d.start} <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>→</span> {d.end}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{active.days} days</div>
                  </div>
                  <div style={{ flex: '1 1 160px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, background: s.bg, color: s.fg, fontSize: 12, fontWeight: 600 }}>{d.status === 'low' ? `${d.seats} ${s.label}` : d.status === 'available' ? `${d.seats} ${s.label}` : s.label}</span>
                    <div style={{ marginTop: 8, width: 160 }}><ProgressBar percent={pct} /></div>
                  </div>
                  <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>per person</div><div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-heading)' }}>${d.price.toLocaleString()}</div></div>
                    <Button variant="ghost" size="sm">Details</Button>
                    {d.status !== 'full' && <Button variant="primary" size="sm">Book</Button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ padding: '0 24px 72px', background: '#fff' }}>
        <div style={{ maxWidth: 'var(--container-md)', margin: '0 auto' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 18 }}>Meet Your Team</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {STAFF.map((m) => <StaffPill key={m.name} name={m.name} role={m.role} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

window.TourDetailPage = TourDetailPage;
