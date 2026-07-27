import React from 'react';

const VARIANT = {
  primary: {
    background: 'var(--olive)',
    color: '#fff',
    border: '1px solid var(--olive)',
  },
  secondary: {
    background: '#fff',
    color: 'var(--text-heading)',
    border: '1px solid var(--border-warm)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--olive)',
    border: '1.5px solid var(--olive)',
  },
  danger: {
    background: 'transparent',
    color: 'var(--status-danger-fg)',
    border: 'none',
  },
};

const SIZE = {
  sm: { padding: '9px 16px', fontSize: 'var(--fs-sm)' },
  md: { padding: '12px 24px', fontSize: 'var(--fs-base)' },
  lg: { padding: '14px 28px', fontSize: 'var(--fs-base)' },
};

const HOVER_BG = {
  primary: 'var(--olive-dk)',
  secondary: 'var(--sand)',
  ghost: 'var(--olive-tint)',
  danger: 'transparent',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  disabled = false,
  icon,
  iconPosition = 'left',
  children,
  onClick,
  type = 'button',
}) {
  const [hover, setHover] = React.useState(false);
  const v = VARIANT[variant] || VARIANT.primary;
  const s = SIZE[size] || SIZE.md;
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        borderRadius: 'var(--radius-md)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.55 : 1,
        transition: 'var(--transition-colors), transform var(--dur-fast) var(--ease-out-expo)',
        transform: hover && !isDisabled ? 'translateY(-1px)' : 'none',
        ...v,
        ...s,
        background: hover && !isDisabled ? HOVER_BG[variant] : v.background,
      }}
    >
      {icon && iconPosition === 'left' && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {loading ? (loadingText || 'Saving…') : children}
      {icon && iconPosition === 'right' && <span style={{ display: 'inline-flex' }}>{icon}</span>}
    </button>
  );
}
