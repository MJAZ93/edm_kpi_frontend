import React from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export default function Select({ label, error, options, style, id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label htmlFor={selectId} style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-soft)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <select
          id={selectId}
          {...props}
          style={{
            width: '100%', height: 42, padding: '0 36px 0 14px',
            background: 'var(--color-surface-strong)',
            border: error ? '1.5px solid var(--color-traffic-red)' : '1.5px solid var(--color-border-strong)',
            borderRadius: 14, fontSize: 14, color: 'var(--color-text)',
            appearance: 'none', outline: 'none', cursor: 'pointer',
            ...style,
          }}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
      </div>
      {error && <span style={{ fontSize: 12, color: 'var(--color-traffic-red)', fontWeight: 600 }}>{error}</span>}
    </div>
  )
}
