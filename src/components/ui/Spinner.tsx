import React from 'react'

interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; color?: string }

const sizes = { sm: 16, md: 24, lg: 40 }

export default function Spinner({ size = 'md', color = 'var(--color-primary)' }: SpinnerProps) {
  const s = sizes[size]
  return (
    <>
      <div style={{ width: s, height: s, borderRadius: '50%', border: `${s > 20 ? 3 : 2}px solid rgba(232,103,10,0.20)`, borderTopColor: color, animation: 'spin 0.65s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
