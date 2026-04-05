import React from 'react'
import { Check } from 'lucide-react'

interface CheckboxProps { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }

export default function Checkbox({ checked, onChange, label, disabled }: CheckboxProps) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <span
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          border: checked ? 'none' : '1.5px solid var(--color-border-strong)',
          background: checked ? 'var(--color-primary)' : 'var(--color-surface-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 150ms',
          boxShadow: checked ? '0 2px 6px rgba(232,103,10,0.30)' : 'none',
        }}
      >
        {checked && <Check size={12} strokeWidth={3} color="#fff" />}
      </span>
      {label && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{label}</span>}
    </label>
  )
}
