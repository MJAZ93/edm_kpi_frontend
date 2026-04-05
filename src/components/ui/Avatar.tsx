import React from 'react'

interface AvatarProps { name: string; src?: string; size?: 'sm' | 'md' | 'lg'; style?: React.CSSProperties }

const sizes = { sm: 28, md: 36, lg: 48 }
const fontSizes = { sm: 10, md: 13, lg: 17 }

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export default function Avatar({ name, src, size = 'md', style }: AvatarProps) {
  const s = sizes[size]
  return (
    <div style={{ width: s, height: s, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-deep) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {src
        ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: fontSizes[size], fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>{initials(name)}</span>}
    </div>
  )
}
