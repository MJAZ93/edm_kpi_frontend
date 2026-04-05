import React, { useState } from 'react'

interface TooltipProps { children: React.ReactNode; content: string; placement?: 'top' | 'bottom' }

export default function Tooltip({ children, content, placement = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <span style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          ...(placement === 'top' ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
          background: '#1a1f2e', color: '#fff', fontSize: 12, fontWeight: 600,
          padding: '5px 10px', borderRadius: 8, whiteSpace: 'nowrap',
          zIndex: 100, pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}>
          {content}
        </span>
      )}
    </span>
  )
}
