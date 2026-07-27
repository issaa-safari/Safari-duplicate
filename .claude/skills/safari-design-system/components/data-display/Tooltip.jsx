import React from 'react';

export function Tooltip({ label, children }) {
  const [show, setShow] = React.useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span style={{
          position: 'absolute',
          bottom: '125%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bush)',
          color: '#fff',
          fontSize: 11,
          fontFamily: 'var(--font-body)',
          padding: '6px 10px',
          borderRadius: 'var(--radius-sm)',
          whiteSpace: 'nowrap',
          boxShadow: 'var(--shadow-sm)',
          zIndex: 10,
        }}>
          {label}
        </span>
      )}
    </span>
  );
}
