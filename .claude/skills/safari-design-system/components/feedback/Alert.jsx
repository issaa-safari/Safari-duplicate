import React from 'react';

const VARIANT = {
  error: { bg: 'var(--status-danger-bg)', fg: 'var(--status-danger-fg)' },
  success: { bg: 'var(--status-success-bg)', fg: 'var(--status-success-fg)' },
  warning: { bg: 'var(--status-warn-bg)', fg: 'var(--status-warn-fg)' },
  info: { bg: 'var(--olive-tint)', fg: 'var(--olive-dk)' },
};

export function Alert({ variant = 'info', children }) {
  const v = VARIANT[variant] || VARIANT.info;
  return (
    <p
      role={variant === 'error' ? 'alert' : 'status'}
      style={{
        fontSize: 'var(--fs-sm)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        margin: 0,
        background: v.bg,
        color: v.fg,
        fontFamily: 'var(--font-body)',
        lineHeight: 'var(--lh-snug)',
      }}
    >
      {children}
    </p>
  );
}
