import React from 'react';

export function Avatar({ name, size = 44, color = 'var(--olive)' }) {
  const initial = (name || '?').trim()[0]?.toUpperCase() || '?';
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontFamily: 'var(--font-display)',
      fontSize: size * 0.4,
      flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

// Staff pill — avatar + name + role, as seen in "Meet Your Team".
export function StaffPill({ name, role }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: '#fff', borderRadius: 'var(--radius-pill)',
      padding: '10px 20px 10px 10px', border: '1px solid var(--border-warm)',
    }}>
      <Avatar name={name} size={44} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 'var(--fs-body)', color: 'var(--text-heading)', fontFamily: 'var(--font-body)' }}>{name}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-body)', fontFamily: 'var(--font-body)' }}>{role}</div>
      </div>
    </div>
  );
}
