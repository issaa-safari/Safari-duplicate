const { StatusBadge, Button, Toggle, Dialog, Field, TextareaField } = window.SafariAdventureRidersDesignSystem_473602;

const ROWS = [
  { id: 1, tour: 'Nairobi to Coast Ride', dates: 'Aug 12–20', seats: '8/12', status: 'guaranteed' },
  { id: 2, tour: 'Masai Mara Private Safari', dates: 'Sep 3–11', seats: '10/12', status: 'low' },
  { id: 3, tour: 'Serengeti & Ngorongoro', dates: 'Oct 1–9', seats: '12/12', status: 'full' },
  { id: 4, tour: 'Mount Kenya Highlands Loop', dates: 'Nov 5–12', seats: '0/10', status: 'cancelled' },
];

function AdminPage() {
  const [showDialog, setShowDialog] = React.useState(false);
  const [visible, setVisible] = React.useState(true);

  return (
    <div style={{ background: 'var(--admin-bg)', minHeight: '70vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 'var(--container-md)', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--admin-text)', margin: 0 }}>Departures</h1>
            <p style={{ fontSize: 13, color: 'var(--admin-text-muted)', margin: '4px 0 0' }}>Admin — internal operations view</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowDialog(true)}>+ New Departure</Button>
        </div>

        <div style={{ background: 'var(--admin-surface)', borderRadius: 12, border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 12, padding: '10px 20px', fontSize: 11, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--admin-border)' }}>
            <span>Tour</span><span>Dates</span><span>Seats</span><span>Status</span><span></span>
          </div>
          {ROWS.map((r) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--admin-border)', fontSize: 13.5, fontFamily: 'var(--font-body)', color: 'var(--admin-text)' }}>
              <span style={{ fontWeight: 600 }}>{r.tour}</span>
              <span>{r.dates}</span>
              <span>{r.seats}</span>
              <span><StatusBadge status={r.status}>{r.status === 'guaranteed' ? 'Guaranteed' : r.status === 'low' ? 'Low seats' : r.status === 'full' ? 'Full' : 'Cancelled'}</StatusBadge></span>
              <Button variant="ghost" size="sm">Edit</Button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, background: 'var(--admin-surface)', borderRadius: 12, border: '1px solid var(--admin-border)', padding: 20 }}>
          <Toggle checked={visible} onChange={setVisible} label="Show departures publicly while seats remain" />
        </div>
      </div>

      {showDialog && (
        <Dialog
          title="Create Destination"
          onClose={() => setShowDialog(false)}
          footer={<><Button variant="secondary" onClick={() => setShowDialog(false)}>Cancel</Button><Button variant="primary" onClick={() => setShowDialog(false)}>Create</Button></>}
        >
          <Field label="Name" required placeholder="Amboseli National Park" />
          <TextareaField label="Description (English)" rows={3} />
        </Dialog>
      )}
    </div>
  );
}

window.AdminPage = AdminPage;
