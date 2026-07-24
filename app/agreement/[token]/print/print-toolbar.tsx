'use client'

const G = '#7A9A4A'

export default function PrintToolbar({ ar }: { ar?: boolean }) {
  return (
    <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 50, display: 'flex', gap: 8 }}>
      <button
        onClick={() => window.print()}
        style={{ background: G, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
      >
        {ar ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}
      </button>
      <button
        onClick={() => window.history.back()}
        style={{ background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}
      >
        {ar ? 'رجوع →' : '← Back'}
      </button>
    </div>
  )
}
