'use client'

const G = '#7A9A4A'

/**
 * Local rather than the agreement's toolbar: this one sits inside the admin
 * chrome, so it has to clear the sticky top bar instead of hugging the viewport.
 */
export default function PrintToolbar() {
  return (
    <div
      className="no-print"
      style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', maxWidth: 780, margin: '16px auto 0', padding: '0 48px' }}
    >
      <button
        onClick={() => window.print()}
        style={{ background: G, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
      >
        Print / Save PDF
      </button>
      <button
        onClick={() => window.history.back()}
        style={{ background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}
      >
        ← Back
      </button>
    </div>
  )
}
