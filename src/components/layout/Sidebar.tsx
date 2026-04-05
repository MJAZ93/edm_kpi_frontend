import React, { useState } from 'react'
import {
  LayoutDashboard, FolderKanban, BarChart3, Map, Trophy, GitCompare,
  Building2, Globe, Users, ShieldAlert, Bell, ClipboardList,
  Palette, ChevronDown, ChevronRight, LogOut, Zap,
} from 'lucide-react'
import Avatar from '../ui/Avatar'

interface NavItem {
  key: string
  label: string
  icon: React.ReactNode
  path?: string
  children?: NavItem[]
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} />, path: '/dashboard' },
  { key: 'projects', label: 'Projectos', icon: <FolderKanban size={17} />, path: '/projects' },
  {
    key: 'analytics', label: 'Analytics', icon: <BarChart3 size={17} />,
    children: [
      { key: 'drill', label: 'Drill-Down', icon: <ChevronRight size={15} />, path: '/analytics/drill-down' },
      { key: 'map', label: 'Mapa', icon: <Map size={15} />, path: '/analytics/map' },
      { key: 'top', label: 'Top Performers', icon: <Trophy size={15} />, path: '/analytics/top-performers' },
      { key: 'bench', label: 'Benchmark', icon: <GitCompare size={15} />, path: '/analytics/benchmark' },
    ],
  },
  { key: 'blockers', label: 'Impedimentos', icon: <ShieldAlert size={17} />, path: '/blockers' },
  {
    key: 'org', label: 'Organização', icon: <Building2 size={17} />,
    children: [
      { key: 'pelouros', label: 'Pelouros', icon: <ChevronRight size={15} />, path: '/org/pelouros' },
      { key: 'direcoes', label: 'Direcções', icon: <ChevronRight size={15} />, path: '/org/direcoes' },
      { key: 'departamentos', label: 'Departamentos', icon: <ChevronRight size={15} />, path: '/org/departamentos' },
    ],
  },
  {
    key: 'geo', label: 'Geografia', icon: <Globe size={17} />,
    children: [
      { key: 'regioes', label: 'Regiões', icon: <ChevronRight size={15} />, path: '/geo/regioes' },
      { key: 'ascs', label: 'ASCs', icon: <ChevronRight size={15} />, path: '/geo/ascs' },
    ],
  },
  { key: 'users', label: 'Utilizadores', icon: <Users size={17} />, path: '/users' },
  { key: 'notifications', label: 'Notificações', icon: <Bell size={17} />, path: '/notifications' },
  { key: 'audit', label: 'Auditoria', icon: <ClipboardList size={17} />, path: '/audit' },
  { key: 'design-system', label: 'Design System', icon: <Palette size={17} />, path: '/design-system' },
]

interface SidebarProps { activeKey?: string }

export default function Sidebar({ activeKey = 'design-system' }: SidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ analytics: true, org: false, geo: false })

  return (
    <aside style={{
      width: 252, minHeight: '100vh', background: 'var(--sidebar-bg)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      borderRight: '1px solid var(--sidebar-border)',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--sidebar-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-deep) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={18} color="#fff" fill="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>CommV</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>KPI Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => {
          if (item.children) {
            const isExp = expanded[item.key]
            return (
              <div key={item.key}>
                <button
                  onClick={() => setExpanded(p => ({ ...p, [item.key]: !p[item.key] }))}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    background: 'none', border: 'none', borderRadius: 10, cursor: 'pointer',
                    color: 'var(--sidebar-text)', fontSize: 13.5, fontWeight: 600,
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--sidebar-item-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {item.icon}
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  <ChevronDown size={14} style={{ transition: 'transform 200ms', transform: isExp ? 'rotate(180deg)' : 'none', opacity: 0.5 }} />
                </button>
                {isExp && (
                  <div style={{ paddingLeft: 12, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {item.children.map(child => {
                      const isActive = child.key === activeKey
                      return (
                        <button key={child.key} style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                          background: isActive ? 'var(--sidebar-item-active)' : 'none',
                          border: 'none', borderRadius: 8, cursor: 'pointer',
                          color: isActive ? 'var(--sidebar-accent)' : 'var(--sidebar-text)',
                          fontSize: 13, fontWeight: isActive ? 700 : 500,
                          transition: 'background 150ms',
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
            <button key={item.key} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              background: isActive ? 'var(--sidebar-item-active)' : 'none',
              border: isActive ? '1px solid rgba(232,103,10,0.25)' : '1px solid transparent',
              borderRadius: 10, cursor: 'pointer',
              color: isActive ? 'var(--sidebar-accent)' : 'var(--sidebar-text)',
              fontSize: 13.5, fontWeight: isActive ? 700 : 600,
              transition: 'background 150ms',
            }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget.style.background = 'var(--sidebar-item-hover)') }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget.style.background = 'none') }}
            >
              {item.icon}
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              {item.key === 'notifications' && (
                <span style={{ background: 'var(--color-primary)', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 999, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>3</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: '14px 14px', borderTop: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name="Carlos Ferreira" size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Carlos Ferreira</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: 600 }}>CA</div>
        </div>
        <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.40)', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 6 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.40)')}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
