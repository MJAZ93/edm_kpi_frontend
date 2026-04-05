import React from 'react'
import { Bell, Search, ChevronRight } from 'lucide-react'
import Avatar from '../ui/Avatar'

interface TopbarProps {
  breadcrumb?: string[]
}

export default function Topbar({ breadcrumb = ['CommV'] }: TopbarProps) {
  return (
    <header style={{
      height: 64, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
      display: 'flex', alignItems: 'center', paddingInline: 28, gap: 16,
      boxShadow: '0 2px 8px rgba(120,60,10,0.05)', flexShrink: 0,
    }}>
      {/* Breadcrumb */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>
        {breadcrumb.map((crumb, i) => (
          <React.Fragment key={crumb}>
            {i > 0 && <ChevronRight size={13} />}
            <span style={{ color: i === breadcrumb.length - 1 ? 'var(--color-text)' : undefined, fontWeight: i === breadcrumb.length - 1 ? 700 : 600 }}>{crumb}</span>
          </React.Fragment>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        <input placeholder="Pesquisar..." style={{
          height: 36, paddingLeft: 32, paddingRight: 14, borderRadius: 10,
          border: '1.5px solid var(--color-border)', background: 'var(--color-bg)',
          fontSize: 13, color: 'var(--color-text)', outline: 'none', width: 200,
        }} />
      </div>

      {/* Notifications */}
      <button style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 8, borderRadius: 10, color: 'var(--color-text-soft)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-muted)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <Bell size={19} />
        <span style={{
          position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%',
          background: 'var(--color-primary)', border: '2px solid var(--color-surface)',
        }} />
      </button>

      {/* Avatar */}
      <Avatar name="Carlos Ferreira" size="sm" />
    </header>
  )
}
