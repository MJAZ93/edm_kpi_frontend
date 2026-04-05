import React from 'react'

type CardVariant = 'default' | 'elevated' | 'bordered' | 'muted'

interface CardProps {
  variant?: CardVariant
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
  padding?: number | string
}

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  default:  { background: 'var(--color-surface)', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--color-border)' },
  elevated: { background: 'var(--color-surface-strong)', boxShadow: 'var(--shadow-medium)', border: '1px solid var(--color-border)' },
  bordered: { background: 'var(--color-surface)', boxShadow: 'none', border: '1.5px solid var(--color-border-strong)' },
  muted:    { background: 'var(--color-surface-muted)', boxShadow: 'none', border: '1px solid var(--color-border)' },
}

export default function Card({ variant = 'default', children, style, onClick, padding = 24 }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 'var(--radius-md)',
        padding,
        ...variantStyles[variant],
        ...(onClick ? { cursor: 'pointer', transition: 'box-shadow 180ms, transform 180ms' } : {}),
        ...style,
      }}
      onMouseEnter={onClick ? e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-medium)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' } : undefined}
      onMouseLeave={onClick ? e => { (e.currentTarget as HTMLElement).style.boxShadow = variantStyles[variant].boxShadow as string; (e.currentTarget as HTMLElement).style.transform = 'none' } : undefined}
    >
      {children}
    </div>
  )
}
