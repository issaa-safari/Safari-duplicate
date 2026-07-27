import React from 'react';

export function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 12, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          height: 22,
          width: 38,
          flexShrink: 0,
          borderRadius: 'var(--radius-pill)',
          border: '2px solid transparent',
          background: checked ? 'var(--olive)' : '#D6D2C6',
          transition: 'background var(--dur-fast) var(--ease-out-expo)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: 0,
        }}
      >
        <span style={{
          display: 'block',
          height: 16,
          width: 16,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: 'var(--shadow-sm)',
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform var(--dur-fast) var(--ease-out-expo)',
        }} />
      </button>
      {label && <span style={{ fontSize: 'var(--fs-body)', color: 'var(--text-heading)', fontFamily: 'var(--font-body)' }}>{label}</span>}
    </label>
  );
}
