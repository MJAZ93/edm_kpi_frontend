import React from 'react'
import { Bell, Search, ChevronRight, LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../ui/Avatar'
import { useAuthStore } from '../../stores/auth.store'
import { useUIStore } from '../../stores/ui.store'

interface TopbarProps {
  breadcrumb?: string[]
}

export default function Topbar({ breadcrumb = ['EDM KPI'] }: TopbarProps) {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const clearAuth = useAuthStore(s => s.clearAuth)
  const notificationCount = useUIStore(s => s.notificationCount)
  const [menuOpen, setMenuOpen] = React.useState(false)

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <header style={{
      height: 64, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
      display: 'flex', alignItems: 'center', paddingInline: 28, gap: 16,
      boxShadow: '0 2px 8px rgba(120,60,10,0.05)', flexShrink: 0, position: 'sticky', top: 0, zIndex: 40,
    }}>
      {/* Breadcrumb */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>
        {breadcrumb.map((crumb, i) => (
          <React.Fragment key={`${crumb}-${i}`}>
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
      <button
        onClick={() => navigate('/notifications')}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 8, borderRadius: 10, color: 'var(--color-text-soft)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-muted)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <Bell size={19} />
        {notificationCount > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: 16, height: 16, borderRadius: 999, padding: '0 4px',
            background: 'var(--color-primary)', border: '2px solid var(--color-surface)',
            fontSize: 9, fontWeight: 800, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
      </button>

      {/* Avatar + dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 10 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-muted)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <Avatar name={user?.name ?? 'User'} size="sm" />
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>{user?.name ?? '—'}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>{user?.role ?? ''}</p>
          </div>
        </button>

        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 50,
              background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)',
              borderRadius: 12, boxShadow: 'var(--shadow-medium)', minWidth: 180, overflow: 'hidden',
            }}>
              <button onClick={() => { navigate('/profile'); setMenuOpen(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <User size={15} /> Meu Perfil
              </button>
              <div style={{ height: 1, background: 'var(--color-border)', margin: '0 12px' }} />
              <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--color-traffic-red)', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-traffic-red-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <LogOut size={15} /> Terminar sessão
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
