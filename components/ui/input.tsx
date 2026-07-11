import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, useId } from 'react'

const FIELD_CLS =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground ' +
  'transition-colors duration-150 ' +
  'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring ' +
  'disabled:bg-muted disabled:text-muted-foreground ' +
  'aria-invalid:border-destructive aria-invalid:focus:ring-destructive/40'

const LABEL_CLS = 'block text-sm font-medium text-foreground mb-1'

export function Field({
  label,
  error,
  id,
  className = '',
  labelClass = LABEL_CLS,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; labelClass?: string }) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div>
      {label && <label htmlFor={fieldId} className={labelClass}>{label}</label>}
      <input id={fieldId} className={`${FIELD_CLS} ${className}`} {...props} />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export function TextareaField({
  label,
  id,
  className = '',
  labelClass = LABEL_CLS,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; labelClass?: string }) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div>
      {label && <label htmlFor={fieldId} className={labelClass}>{label}</label>}
      <textarea id={fieldId} className={`${FIELD_CLS} ${className}`} {...props} />
    </div>
  )
}

export function SelectField({
  label,
  id,
  className = '',
  labelClass = LABEL_CLS,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; labelClass?: string }) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div>
      {label && <label htmlFor={fieldId} className={labelClass}>{label}</label>}
      <select id={fieldId} className={`${FIELD_CLS} ${className}`} {...props}>
        {children}
      </select>
    </div>
  )
}
