import React from 'react';

const fieldStyle = (hasError) => ({
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 'var(--radius-md)',
  border: `1px solid ${hasError ? 'var(--status-danger-fg)' : 'var(--border-warm)'}`,
  padding: '10px 14px',
  fontSize: 'var(--fs-body)',
  fontFamily: 'var(--font-body)',
  color: 'var(--text-heading)',
  background: '#fff',
  outline: 'none',
});

function Label({ children, required }) {
  if (!children) return null;
  return (
    <label style={{
      display: 'block',
      fontSize: 'var(--fs-sm)',
      fontWeight: 600,
      color: 'var(--text-heading)',
      marginBottom: 6,
      fontFamily: 'var(--font-body)',
    }}>
      {children}{required && <span style={{ color: 'var(--murram)' }}> *</span>}
    </label>
  );
}

function ErrorText({ children }) {
  if (!children) return null;
  return <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--status-danger-fg)', margin: '6px 0 0' }}>{children}</p>;
}

function useFocusRing(hasError) {
  const [focused, setFocused] = React.useState(false);
  return {
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: focused ? { boxShadow: `0 0 0 3px ${hasError ? 'rgba(176,73,43,0.18)' : 'rgba(122,154,74,0.25)'}`, borderColor: hasError ? 'var(--status-danger-fg)' : 'var(--olive)' } : {},
  };
}

export function Field({ label, error, required, ...props }) {
  const ring = useFocusRing(!!error);
  return (
    <div>
      <Label required={required}>{label}</Label>
      <input {...props} {...ring} style={{ ...fieldStyle(!!error), ...ring.style }} />
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

export function TextareaField({ label, error, required, rows = 4, ...props }) {
  const ring = useFocusRing(!!error);
  return (
    <div>
      <Label required={required}>{label}</Label>
      <textarea rows={rows} {...props} {...ring} style={{ ...fieldStyle(!!error), ...ring.style, resize: 'vertical', fontFamily: 'var(--font-body)' }} />
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

export function SelectField({ label, error, required, children, ...props }) {
  const ring = useFocusRing(!!error);
  return (
    <div>
      <Label required={required}>{label}</Label>
      <select {...props} {...ring} style={{ ...fieldStyle(!!error), ...ring.style, appearance: 'auto' }}>
        {children}
      </select>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
