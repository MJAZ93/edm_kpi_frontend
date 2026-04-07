import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, BarChart3, Map, Trophy, GitCompare,
  Building2, Globe, Users, ShieldAlert, Bell, ClipboardList,
  ChevronDown, ChevronRight, LogOut,
} from 'lucide-react'
import Avatar from '../ui/Avatar'
import { useAuthStore } from '../../stores/auth.store'
import { useUIStore } from '../../stores/ui.store'
import { useAuth } from '../../hooks/useAuth'

interface NavItem {
  key: string
  label: string
  icon: React.ReactNode
  path?: string
  children?: NavItem[]
  badge?: boolean
  permission?: string      // if set, item is hidden when can(permission) === false
}

const NAV: NavItem[] = [
  { key: 'dashboard',     label: 'Dashboard',      icon: <LayoutDashboard size={17} />, path: '/dashboard' },
  { key: 'projects',      label: 'Projectos',      icon: <FolderKanban size={17} />,    path: '/projects' },
  {
    key: 'analytics', label: 'Relatórios', icon: <BarChart3 size={17} />,
    children: [
      { key: 'drill',  label: 'Drill-Down',      icon: <ChevronRight size={14} />, path: '/analytics/drill-down', permission: 'view:drill_down' },
      { key: 'map',    label: 'Mapa',             icon: <Map size={14} />,          path: '/analytics/map', permission: 'view:map' },
      { key: 'top',    label: 'Top Performers',   icon: <Trophy size={14} />,       path: '/analytics/top-performers' },
      { key: 'bench',  label: 'Benchmark',        icon: <GitCompare size={14} />,   path: '/analytics/benchmark' },
    ],
  },
  { key: 'blockers', label: 'Impedimentos', icon: <ShieldAlert size={17} />, path: '/blockers', permission: 'view:operational_nav' },
  {
    key: 'org', label: 'Organização', icon: <Building2 size={17} />, permission: 'view:operational_nav',
    children: [
      { key: 'org',           label: 'Árvore',        icon: <ChevronRight size={14} />, path: '/org' },
      { key: 'pelouros',      label: 'Pelouros',      icon: <ChevronRight size={14} />, path: '/org/pelouros',      permission: 'view:pelouros' },
      { key: 'direcoes',      label: 'Direcções',     icon: <ChevronRight size={14} />, path: '/org/direcoes',      permission: 'view:direcoes' },
      { key: 'departamentos', label: 'Departamentos', icon: <ChevronRight size={14} />, path: '/org/departamentos', permission: 'view:departamentos' },
    ],
  },
  {
    key: 'geo', label: 'Geografia', icon: <Globe size={17} />, permission: 'manage:geo',
    children: [
      { key: 'geo/regioes', label: 'Regiões', icon: <ChevronRight size={14} />, path: '/geo/regioes' },
      { key: 'geo/ascs',   label: 'ASCs',    icon: <ChevronRight size={14} />, path: '/geo/ascs' },
    ],
  },
  { key: 'users',         label: 'Utilizadores', icon: <Users size={17} />,         path: '/users',         permission: 'manage:users' },
  { key: 'notifications', label: 'Notificações', icon: <Bell size={17} />,          path: '/notifications', badge: true, permission: 'view:operational_nav' },
  { key: 'audit',         label: 'Auditoria',    icon: <ClipboardList size={17} />, path: '/audit',         permission: 'view:audit' },
]

interface SidebarProps { activeKey?: string }

export default function Sidebar({ activeKey = '' }: SidebarProps) {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const clearAuth = useAuthStore(s => s.clearAuth)
  const notificationCount = useUIStore(s => s.notificationCount)
  const { can } = useAuth()

  // Filter nav items by permission
  const visibleNav = NAV
    .filter(item => !item.permission || can(item.permission))
    .map(item => item.children
      ? { ...item, children: item.children.filter(c => !c.permission || can(c.permission)) }
      : item
    )

  // auto-expand parent of active item
  const initialExpanded: Record<string, boolean> = {}
  visibleNav.forEach(item => {
    if (item.children) {
      initialExpanded[item.key] = item.children.some(c => c.key === activeKey)
    }
  })

  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded)

  const toggle = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  const go = (path: string) => navigate(path)

  return (
    <aside style={{
      width: 252, minHeight: '100vh', background: 'var(--sidebar-bg)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      borderRight: '1px solid var(--sidebar-border)', position: 'sticky', top: 0, height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--sidebar-border)', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="EDM KPI" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>EDM KPI</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>KPI Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {visibleNav.map(item => {
          if (item.children) {
            const isExp = expanded[item.key]
            const hasActive = item.children.some(c => c.key === activeKey)
            return (
              <div key={item.key}>
                <button onClick={() => toggle(item.key)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  background: hasActive ? 'rgba(255,255,255,0.04)' : 'none',
                  border: 'none', borderRadius: 10, cursor: 'pointer',
                  color: hasActive ? 'rgba(255,255,255,0.90)' : 'var(--sidebar-text)',
                  fontSize: 13.5, fontWeight: hasActive ? 700 : 600, transition: 'background 150ms',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--sidebar-item-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = hasActive ? 'rgba(255,255,255,0.04)' : 'none')}
                >
                  {item.icon}
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  <ChevronDown size={14} style={{ transition: 'transform 200ms', transform: isExp ? 'rotate(180deg)' : 'none', opacity: 0.5 }} />
                </button>
                {isExp && (
                  <div style={{ paddingLeft: 10, marginTop: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {item.children.map(child => {
                      const isActive = child.key === activeKey
                      return (
                        <button key={child.key} onClick={() => child.path && go(child.path)} style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                          background: isActive ? 'var(--sidebar-item-active)' : 'none',
                          border: isActive ? '1px solid rgba(232,103,10,0.22)' : '1px solid transparent',
                          borderRadius: 8, cursor: 'pointer',
                          color: isActive ? 'var(--sidebar-accent)' : 'var(--sidebar-text)',
                          fontSize: 13, fontWeight: isActive ? 700 : 500, transition: 'background 150ms',
                        }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget.style.background = 'var(--sidebar-item-hover)') }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget.style.background = 'none') }}
                        >
                          {child.icon}{child.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const isActive = item.key === activeKey
          return (
            <button key={item.key} onClick={() => item.path && go(item.path)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              background: isActive ? 'var(--sidebar-item-active)' : 'none',
              border: isActive ? '1px solid rgba(232,103,10,0.25)' : '1px solid transparent',
              borderRadius: 10, cursor: 'pointer',
              color: isActive ? 'var(--sidebar-accent)' : 'var(--sidebar-text)',
              fontSize: 13.5, fontWeight: isActive ? 700 : 600, transition: 'background 150ms',
            }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget.style.background = 'var(--sidebar-item-hover)') }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget.style.background = 'none') }}
            >
              {item.icon}
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              {item.badge && notificationCount > 0 && (
                <span style={{ background: 'var(--color-primary)', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 999, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={user?.name ?? 'User'} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? '—'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: 600 }}>{user?.role ?? ''}</div>
        </div>
        <button onClick={() => { clearAuth(); navigate('/login') }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.40)', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 6 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.40)')}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
