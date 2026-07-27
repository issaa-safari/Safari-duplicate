import React from 'react';

export function LanguageToggle({ value = 'en', onChange }) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      paddingInlineStart: 16,
      borderInlineStart: '1px solid var(--border-warm)',
    }}>
      {['en', 'ar'].map((lang) => (
        <button
          key={lang}
          onClick={() => onChange && onChange(lang)}
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-body)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: value === lang ? 700 : 500,
            background: value === lang ? '#E5E7EB' : 'transparent',
            color: value === lang ? 'var(--text-heading)' : 'var(--text-muted)',
            transition: 'var(--transition-colors)',
          }}
        >
          {lang === 'en' ? 'EN' : 'العربية'}
        </button>
      ))}
    </div>
  );
}

export function NavLink({ children, active = false, onClick }) {
  return (
    <a
      onClick={onClick}
      style={{
        fontSize: 'var(--fs-sm)',
        fontWeight: 500,
        color: active ? 'var(--text-heading)' : 'var(--text-body)',
        textDecoration: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
      }}
    >
      {children}
    </a>
  );
}
