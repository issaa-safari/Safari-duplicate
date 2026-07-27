const { Card, Button } = window.SafariAdventureRidersDesignSystem_473602;

function DashboardPage({ lang }) {
  const isAr = lang === 'ar';
  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ background: 'var(--admin-bg)', minHeight: '70vh', padding: '48px 24px' }}>
      <div style={{ maxWidth: 'var(--container-md)', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 4px' }}>Welcome back, Sarah</h1>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-muted)', margin: '0 0 32px' }}>Your bookings and trip documents in one place.</p>

        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 14 }}>Upcoming trip</h3>
        <Card style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-heading)' }}>Masai Mara Private Safari</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Sep 3 – Sep 11, 2026 · 2 travellers</div>
            </div>
            <span style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--status-success-bg)', color: 'var(--status-success-fg)', fontSize: 12, fontWeight: 600 }}>Confirmed</span>
            <Button variant="ghost" size="sm">View Booking</Button>
          </div>
        </Card>

        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 14 }}>Past trips</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          {[{ t: 'Nairobi to Coast Ride', d: 'Mar 2025' }, { t: 'Amboseli & Kilimanjaro Views', d: 'Nov 2024' }].map((b) => (
            <Card key={b.t}>
              <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontFamily: 'var(--font-body)', marginBottom: 4 }}>{b.t}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{b.d}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

window.DashboardPage = DashboardPage;
