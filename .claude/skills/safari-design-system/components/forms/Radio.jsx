import React from 'react';

export function Radio({ checked, onChange, label, name, disabled = false }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <span
        onClick={() => !disabled && onChange && onChange()}
        role="radio"
        aria-checked={checked}
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: `1.5px solid ${checked ? 'var(--olive)' : 'var(--border-warm)'}`,
          background: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition-colors)',
          flexShrink: 0,
        }}
      >
        {checked && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--olive)' }} />}
      </span>
      {label && <span style={{ fontSize: 'var(--fs-body)', color: 'var(--text-heading)', fontFamily: 'var(--font-body)' }}>{label}</span>}
    </label>
  );
}
