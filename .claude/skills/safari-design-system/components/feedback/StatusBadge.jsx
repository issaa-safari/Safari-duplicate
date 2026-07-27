import React from 'react';

const STATUS = {
  guaranteed: { bg: 'var(--status-success-bg)', fg: 'var(--status-success-fg)' },
  available: { bg: 'var(--status-success-bg)', fg: 'var(--status-success-fg)' },
  low: { bg: 'var(--status-warn-bg)', fg: 'var(--status-warn-fg)' },
  full: { bg: 'var(--status-neutral-bg)', fg: 'var(--status-neutral-fg)' },
  cancelled: { bg: 'var(--status-danger-bg)', fg: 'var(--status-danger-fg)' },
};

export function StatusBadge({ status = 'available', children }) {
  const s = STATUS[status] || STATUS.available;
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 12px',
      borderRadius: 'var(--radius-pill)',
      background: s.bg,
      color: s.fg,
      fontSize: 12,
      fontWeight: 600,
      fontFamily: 'var(--font-body)',
    }}>
      {children}
    </span>
  );
}

// Trail badge — glassy pill over photography (Choose Your Trail cards).
export function TrailBadge({ children }) {
  return (
    <span style={{
      display: 'inline-block',
      background: 'rgba(255,255,255,0.15)',
      border: '1px solid rgba(255,255,255,0.3)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      borderRadius: 'var(--radius-pill)',
      padding: '4px 14px',
      fontSize: 'var(--fs-xs)',
      fontWeight: 700,
      letterSpacing: 'var(--ls-eyebrow)',
      textTransform: 'uppercase',
      color: '#fff',
      fontFamily: 'var(--font-body)',
    }}>
      {children}
    </span>
  );
}

// Eyebrow label — uppercase, olive, used above headings.
export function Eyebrow({ children }) {
  return (
    <span style={{
      fontSize: 'var(--fs-xs)',
      fontWeight: 700,
      letterSpacing: 'var(--ls-eyebrow)',
      textTransform: 'uppercase',
      color: 'var(--olive)',
      fontFamily: 'var(--font-body)',
    }}>
      {children}
    </span>
  );
}
