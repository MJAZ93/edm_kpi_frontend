import React from 'react'

interface ProgressBarProps {
  value: number        // 0-100
  max?: number
  height?: number
  color?: string
  showLabel?: boolean
  label?: string
  variant?: 'orange' | 'green' | 'red' | 'yellow' | 'auto'
}

function getColor(variant: string, value: number) {
  if (variant === 'auto') {
    if (value >= 90) return 'var(--color-traffic-green)'
    if (value >= 60) return 'var(--color-traffic-yellow)'
    return 'var(--color-traffic-red)'
  }
  const map: Record<string, string> = {
    orange: 'var(--color-primary)',
    green:  'var(--color-traffic-green)',
    red:    'var(--color-traffic-red)',
    yellow: 'var(--color-traffic-yellow)',
  }
  return map[variant] || 'var(--color-primary)'
}

export default function ProgressBar({ value, max = 100, height = 8, color, showLabel = false, label, variant = 'orange' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const fillColor = color || getColor(variant, pct)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {(showLabel || label) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {label && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)' }}>{label}</span>}
          {showLabel && <span style={{ fontSize: 12, fontWeight: 700, color: fillColor }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div style={{ background: 'var(--color-bg-strong)', borderRadius: 999, height, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 999,
          background: `linear-gradient(90deg, ${fillColor}dd, ${fillColor})`,
          transition: 'width 400ms ease',
        }} />
      </div>
    </div>
  )
}
