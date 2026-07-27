import React from 'react';

export function ProgressBar({ percent = 0, color }) {
  const barColor = color || (percent >= 80 ? 'var(--murram)' : 'var(--olive)');
  return (
    <div style={{ height: 4, borderRadius: 'var(--radius-pill)', background: 'var(--sand)', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${Math.min(100, Math.max(0, percent))}%`,
        background: barColor,
        borderRadius: 'var(--radius-pill)',
        transition: 'width var(--dur-slow) var(--ease-out-expo)',
      }} />
    </div>
  );
}
