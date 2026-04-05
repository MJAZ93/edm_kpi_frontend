import React from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
  badges?: React.ReactNode
}

export default function PageHeader({ eyebrow, title, subtitle, actions, badges }: PageHeaderProps) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,252,247,0.97) 0%, rgba(240,236,227,0.60) 100%)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '24px 28px',
      marginBottom: 28,
      boxShadow: 'var(--shadow-soft)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          {eyebrow && (
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              {eyebrow}
            </p>
          )}
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2, marginBottom: subtitle ? 6 : 0 }}>
            {title}
          </h1>
          {subtitle && <p style={{ fontSize: 14, color: 'var(--color-text-soft)', fontWeight: 500 }}>{subtitle}</p>}
          {badges && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{badges}</div>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>{actions}</div>}
      </div>
    </div>
  )
}
