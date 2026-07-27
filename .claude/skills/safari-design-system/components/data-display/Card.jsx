import React from 'react';

export function Card({ children, padding = 24, hoverable = false, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => hoverable && setHover(true)}
      onMouseLeave={() => hoverable && setHover(false)}
      style={{
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-warm)',
        padding,
        transition: 'transform var(--dur-base) var(--ease-out-expo), box-shadow var(--dur-base) var(--ease-out-expo)',
        transform: hover ? 'translateY(var(--lift-row))' : 'none',
        boxShadow: hover ? 'var(--shadow-card)' : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Feature card — full-bleed image, accent-tinted gradient, content pinned to bottom.
// Used for "Choose Your Trail" (bike vs private) style features.
export function FeatureCard({ imageUrl, accent, badge, heading, body, cta, href }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block',
        position: 'relative',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        minHeight: 360,
        textDecoration: 'none',
        transform: hover ? `translateY(var(--lift-card))` : 'none',
        transition: 'transform var(--dur-base) var(--ease-out-expo)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${accent}ee 0%, ${accent}44 40%, rgba(0,0,0,0.15) 100%)` }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', minHeight: 360, padding: '28px 26px', boxSizing: 'border-box' }}>
        <span style={{
          display: 'inline-block', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
          backdropFilter: 'blur(4px)', borderRadius: 'var(--radius-pill)', padding: '4px 14px',
          fontSize: 'var(--fs-xs)', fontWeight: 700, letterSpacing: 'var(--ls-eyebrow)', textTransform: 'uppercase',
          color: '#fff', fontFamily: 'var(--font-body)', marginBottom: 14, alignSelf: 'flex-start',
        }}>{badge}</span>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h3)', fontWeight: 700, color: '#fff', margin: '0 0 10px', lineHeight: 'var(--lh-heading)' }}>{heading}</h3>
        <p style={{ color: 'rgba(255,255,255,0.88)', fontFamily: 'var(--font-body)', fontSize: 'var(--fs-body)', lineHeight: 'var(--lh-body)', margin: '0 0 22px' }}>{body}</p>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: accent,
          fontWeight: 700, fontSize: 'var(--fs-sm)', padding: '10px 20px', borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-body)',
        }}>{cta} <span aria-hidden="true">→</span></span>
      </div>
    </a>
  );
}
