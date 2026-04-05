import React from 'react'

interface SwitchProps { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }

export default function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <span onClick={() => !disabled && onChange(!checked)} style={{
        width: 44, height: 24, borderRadius: 999, position: 'relative',
        background: checked ? 'var(--color-primary)' : 'var(--color-bg-strong)',
        border: checked ? 'none' : '1.5px solid var(--color-border-strong)',
        transition: 'background 200ms', display: 'inline-block', flexShrink: 0,
        boxShadow: checked ? '0 2px 8px rgba(232,103,10,0.30)' : 'none',
      }}>
        <span style={{
          position: 'absolute', top: checked ? 3 : 2, left: checked ? 23 : 2,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.20)', transition: 'left 200ms',
        }} />
      </span>
      {label && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{label}</span>}
    </label>
  )
}
