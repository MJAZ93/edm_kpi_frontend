import React, { useState } from 'react'

interface Tab { key: string; label: string; icon?: React.ReactNode }

interface TabsProps {
  tabs: Tab[]
  activeKey?: string
  onChange?: (key: string) => void
  children?: (key: string) => React.ReactNode
}

export default function Tabs({ tabs, activeKey: controlled, onChange, children }: TabsProps) {
  const [internal, setInternal] = useState(tabs[0]?.key)
  const active = controlled ?? internal

  const handleClick = (key: string) => {
    if (!controlled) setInternal(key)
    onChange?.(key)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--color-border)', marginBottom: 24 }}>
        {tabs.map(tab => {
          const isActive = tab.key === active
          return (
            <button
              key={tab.key}
              onClick={() => handleClick(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', background: 'none', border: 'none',
                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: -2,
                fontSize: 14, fontWeight: isActive ? 700 : 600,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer', transition: 'color 150ms',
                borderRadius: '8px 8px 0 0',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>
      {children?.(active)}
    </div>
  )
}
