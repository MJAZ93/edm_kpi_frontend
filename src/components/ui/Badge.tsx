import React from 'react'

type BadgeVariant = 'default' | 'orange' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  dot?: boolean
  style?: React.CSSProperties
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default:  { background: 'var(--color-surface-muted)', color: 'var(--color-text-soft)', border: '1px solid var(--color-border)' },
  orange:   { background: 'var(--color-primary-soft)', color: 'var(--color-primary-deep)', border: '1px solid rgba(232,103,10,0.20)' },
  success:  { background: 'var(--color-traffic-green-bg)', color: 'var(--color-traffic-green)', border: '1px solid rgba(22,163,74,0.20)' },
  warning:  { background: 'var(--color-traffic-yellow-bg)', color: 'var(--color-traffic-yellow)', border: '1px solid rgba(202,138,4,0.20)' },
  danger:   { background: 'var(--color-traffic-red-bg)', color: 'var(--color-traffic-red)', border: '1px solid rgba(220,38,38,0.20)' },
  info:     { background: 'rgba(74,111,165,0.10)', color: '#2d5fa5', border: '1px solid rgba(74,111,165,0.20)' },
  muted:    { background: 'rgba(138,143,154,0.10)', color: 'var(--color-text-muted)', border: '1px solid rgba(138,143,154,0.20)' },
}

export default function Badge({ variant = 'default', children, dot, style }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 700, letterSpacing: '0.01em',
      ...variantStyles[variant], ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />}
      {children}
    </span>
  )
}
