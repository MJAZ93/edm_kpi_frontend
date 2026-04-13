import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Sidebar from './Sidebar'
import Spinner from '../ui/Spinner'
import { useNotificationCount } from '../../hooks/useNotificationCount'
import { geoService } from '../../services/geo.service'
import { orgService } from '../../services/org.service'

const BREADCRUMBS: Record<string, string[]> = {
  '/dashboard':              ['DPRP KPIs', 'Dashboard'],
  '/projects':               ['DPRP KPIs', 'Pilares Estratégicos'],
  '/analytics':              ['DPRP KPIs', 'Analytics'],
  '/analytics/drill-down':   ['DPRP KPIs', 'Analytics', 'Drill-Down'],
  '/analytics/map':          ['DPRP KPIs', 'Analytics', 'Mapa'],
  '/analytics/top-performers': ['DPRP KPIs', 'Analytics', 'Top Performers'],
  '/analytics/benchmark':    ['DPRP KPIs', 'Analytics', 'Benchmark'],
  '/blockers':               ['DPRP KPIs', 'Impedimentos'],
  '/org':                    ['DPRP KPIs', 'Organização'],
  '/org/pelouros':           ['DPRP KPIs', 'Organização', 'Pelouros'],
  '/org/direcoes':           ['DPRP KPIs', 'Organização', 'Direcções'],
  '/org/departamentos':      ['DPRP KPIs', 'Organização', 'Departamentos'],
  '/geo/regioes':            ['DPRP KPIs', 'Geografia', 'Regiões'],
  '/geo/ascs':               ['DPRP KPIs', 'Geografia', 'ASCs'],
  '/users':                  ['DPRP KPIs', 'Utilizadores'],
  '/notifications':          ['DPRP KPIs', 'Notificações'],
  '/audit':                  ['DPRP KPIs', 'Auditoria'],
  '/profile':                ['DPRP KPIs', 'Perfil'],
  '/design-system':          ['DPRP KPIs', 'Design System'],
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

  // ── Single source of truth for geo & org data ──────────────────────────
  // These are the ONLY queries in the entire app that fetch this data.
  // All other pages read from cache (no queryFn).
  // staleTime: Infinity → fetched once per session, never refetched.
  const ascs    = useQuery({ queryKey: ['geo', 'ascs'],    queryFn: () => geoService.listAscs(),          staleTime: Infinity })
  const regioes = useQuery({ queryKey: ['geo', 'regioes'], queryFn: () => geoService.listRegioes(),       staleTime: Infinity })
  const depts   = useQuery({ queryKey: ['departamentos'],   queryFn: () => orgService.listDepartamentos(), staleTime: Infinity })
  const dirs    = useQuery({ queryKey: ['direcoes'],         queryFn: () => orgService.listDirecoes(),      staleTime: Infinity })

  const loading = ascs.isLoading || regioes.isLoading || depts.isLoading || dirs.isLoading

  const activeKey = routeToKey(pathname)
  const breadcrumb = BREADCRUMBS[pathname] ?? ['DPRP KPIs']

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <Spinner size="lg" />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)' }}>A carregar dados…</p>
      </div>
    )
  }

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
