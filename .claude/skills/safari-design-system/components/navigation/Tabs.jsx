import React from 'react';

export function Tabs({ tabs, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-warm)' }}>
      {tabs.map((tab) => {
        const active = tab === value;
        return (
          <button
            key={tab}
            onClick={() => onChange && onChange(tab)}
            style={{
              padding: '10px 18px',
              fontSize: 'var(--fs-body)',
              fontFamily: 'var(--font-body)',
              fontWeight: active ? 700 : 500,
              color: active ? 'var(--olive-dk)' : 'var(--text-body)',
              background: 'none',
              border: 'none',
              borderBottom: active ? '2px solid var(--olive)' : '2px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
              transition: 'var(--transition-colors)',
            }}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
