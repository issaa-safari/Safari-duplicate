import React from 'react';

export function Toast({ variant = 'success', children, onClose }) {
  const v = variant === 'error'
    ? { bg: 'var(--bush)', accent: 'var(--status-danger-fg)' }
    : { bg: 'var(--bush)', accent: 'var(--olive)' };
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: v.bg,
      color: '#fff',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 18px',
      boxShadow: 'var(--shadow-float)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--fs-sm)',
      maxWidth: 360,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.accent, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{children}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0,
        }}>×</button>
      )}
    </div>
  );
}
