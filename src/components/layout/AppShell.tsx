import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useNotificationCount } from '../../hooks/useNotificationCount'

const BREADCRUMBS: Record<string, string[]> = {
  '/dashboard':              ['EDM KPI', 'Dashboard'],
  '/projects':               ['EDM KPI', 'Projectos'],
  '/analytics':              ['EDM KPI', 'Analytics'],
  '/analytics/drill-down':   ['EDM KPI', 'Analytics', 'Drill-Down'],
  '/analytics/map':          ['EDM KPI', 'Analytics', 'Mapa'],
  '/analytics/top-performers': ['EDM KPI', 'Analytics', 'Top Performers'],
  '/analytics/benchmark':    ['EDM KPI', 'Analytics', 'Benchmark'],
  '/blockers':               ['EDM KPI', 'Impedimentos'],
  '/org':                    ['EDM KPI', 'Organização'],
  '/org/pelouros':           ['EDM KPI', 'Organização', 'Pelouros'],
  '/org/direcoes':           ['EDM KPI', 'Organização', 'Direcções'],
  '/org/departamentos':      ['EDM KPI', 'Organização', 'Departamentos'],
  '/geo/regioes':            ['EDM KPI', 'Geografia', 'Regiões'],
  '/geo/ascs':               ['EDM KPI', 'Geografia', 'ASCs'],
  '/users':                  ['EDM KPI', 'Utilizadores'],
  '/notifications':          ['EDM KPI', 'Notificações'],
  '/audit':                  ['EDM KPI', 'Auditoria'],
  '/profile':                ['EDM KPI', 'Perfil'],
  '/design-system':          ['EDM KPI', 'Design System'],
}

function routeToKey(pathname: string) {
  // strip trailing /
  const p = pathname.replace(/\/$/, '') || '/'
  if (p.startsWith('/projects/')) return 'projects'
  if (p.startsWith('/tasks/'))    return 'tasks'
  return p.replace('/','')
}

export default function AppShell() {
  useNotificationCount()
  const { pathname } = useLocation()

  const activeKey = routeToKey(pathname)
  const breadcrumb = BREADCRUMBS[pathname] ?? ['EDM KPI']

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Sidebar activeKey={activeKey} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
