import React from 'react';

export function Checkbox({ checked, onChange, label, disabled = false }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <span
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: `1.5px solid ${checked ? 'var(--olive)' : 'var(--border-warm)'}`,
          background: checked ? 'var(--olive)' : '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition-colors)',
          flexShrink: 0,
        }}
      >
        {checked && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label && <span style={{ fontSize: 'var(--fs-body)', color: 'var(--text-heading)', fontFamily: 'var(--font-body)' }}>{label}</span>}
    </label>
  );
}
