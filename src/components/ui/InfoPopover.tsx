import React, { useState, useRef, useEffect } from 'react'
import { Info, X } from 'lucide-react'

interface InfoPopoverProps {
  title?: string
  children: React.ReactNode
}

export default function InfoPopover({ title, children }: InfoPopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="Mais informação"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 18, height: 18, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: open ? 'var(--color-primary)' : 'var(--color-bg-strong)',
          color: open ? '#fff' : 'var(--color-text-muted)',
          padding: 0, transition: 'all 150ms', flexShrink: 0,
        }}
      >
        <Info size={11} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'var(--color-surface-strong)',
          border: '1px solid var(--color-border)',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          padding: '14px 16px', zIndex: 200,
          width: 280, fontSize: 13,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            {title && (
              <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {title}
              </span>
            )}
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0, marginLeft: 'auto' }}>
              <X size={13} />
            </button>
          </div>
          <div style={{ color: 'var(--color-text)', lineHeight: 1.55 }}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
