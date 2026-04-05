import React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string; hint?: string
}

export default function Textarea({ label, error, hint, id, style, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label htmlFor={inputId} style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-soft)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>}
      <textarea
        id={inputId} {...props}
        style={{
          width: '100%', minHeight: 96, padding: '12px 14px',
          background: 'var(--color-surface-strong)',
          border: error ? '1.5px solid var(--color-traffic-red)' : '1.5px solid var(--color-border-strong)',
          borderRadius: 14, fontSize: 14, color: 'var(--color-text)',
          outline: 'none', resize: 'vertical', transition: 'border-color 150ms, box-shadow 150ms',
          ...style,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,103,10,0.15)' }}
        onBlur={e => { e.currentTarget.style.borderColor = error ? 'var(--color-traffic-red)' : 'var(--color-border-strong)'; e.currentTarget.style.boxShadow = 'none' }}
      />
      {error && <span style={{ fontSize: 12, color: 'var(--color-traffic-red)', fontWeight: 600 }}>{error}</span>}
      {!error && hint && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{hint}</span>}
    </div>
  )
}
