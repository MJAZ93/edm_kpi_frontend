import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Card from '../ui/Card'

interface StatCardProps {
  label: string
  value: string | number
  delta?: number      // positive = improvement
  deltaLabel?: string
  icon?: React.ReactNode
  color?: string      // icon bg color
  variant?: 'default' | 'elevated'
}

export default function StatCard({ label, value, delta, deltaLabel, icon, color = 'var(--color-primary-soft)', variant = 'default' }: StatCardProps) {
  const deltaColor = delta === undefined ? '' : delta > 0 ? 'var(--color-traffic-green)' : delta < 0 ? 'var(--color-traffic-red)' : 'var(--color-text-muted)'
  const DeltaIcon = delta === undefined ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus

  return (
    <Card variant={variant} padding={22}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
        {icon && (
          <div style={{ width: 36, height: 36, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
            {icon}
          </div>
        )}
      </div>
      <p style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1, marginBottom: 8, overflowWrap: 'anywhere' }}>{value}</p>
      {delta !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <DeltaIcon size={14} style={{ color: deltaColor }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: deltaColor }}>
            {delta > 0 ? '+' : ''}{delta}%
          </span>
          {deltaLabel && <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>{deltaLabel}</span>}
        </div>
      )}
    </Card>
  )
}
