const { Field, TextareaField, SelectField, Checkbox, Radio, Button, Alert } = window.SafariAdventureRidersDesignSystem_473602;

function QuoteRequestPage({ lang }) {
  const isAr = lang === 'ar';
  const [trail, setTrail] = React.useState('bike');
  const [agree, setAgree] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ background: 'var(--sand)', minHeight: '70vh', padding: '64px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 10px' }}>Request a Quote</h1>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-body)', margin: '0 0 32px' }}>Tell us about your dream trip and we'll get back to you within 24 hours.</p>

        {sent && <div style={{ marginBottom: 20 }}><Alert variant="success">Thanks! Your request has been sent — we'll be in touch on WhatsApp or email shortly.</Alert></div>}

        <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-warm)', padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 10, fontFamily: 'var(--font-body)' }}>Which trail interests you?</label>
            <div style={{ display: 'flex', gap: 24 }}>
              <Radio name="trail" checked={trail === 'bike'} onChange={() => setTrail('bike')} label="Group Bike Tour" />
              <Radio name="trail" checked={trail === 'private'} onChange={() => setTrail('private')} label="Private Safari" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Full name" required placeholder="Jane Traveller" />
            <Field label="Email" type="email" required placeholder="you@example.com" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <SelectField label="Group size"><option>1–2 travellers</option><option>3–5 travellers</option><option>6+ travellers</option></SelectField>
            <SelectField label="Preferred month"><option>Flexible</option><option>August 2026</option><option>September 2026</option><option>October 2026</option></SelectField>
          </div>
          <TextareaField label="Tell us about your trip" rows={4} placeholder="Dates, interests, special occasions..." />
          <Checkbox checked={agree} onChange={setAgree} label="I agree to be contacted about this enquiry via email or WhatsApp" />
          <Button variant="primary" size="lg" disabled={!agree} onClick={() => setSent(true)}>Send Request</Button>
        </div>
      </div>
    </div>
  );
}

window.QuoteRequestPage = QuoteRequestPage;
