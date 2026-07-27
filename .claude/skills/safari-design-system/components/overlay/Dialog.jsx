import React from 'react';

export function Dialog({ title, children, onClose, footer }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '10vh', background: 'rgba(26,46,19,0.55)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 420, background: '#fff',
        borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        boxShadow: 'var(--shadow-float)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border-warm)',
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" style={{
            background: 'none', border: 'none', fontSize: 20, lineHeight: 1,
            color: 'var(--text-muted)', cursor: 'pointer',
          }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
        </div>
        {footer && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 10,
            padding: '14px 20px', borderTop: '1px solid var(--border-warm)', background: 'var(--admin-bg)',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
