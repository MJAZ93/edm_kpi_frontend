import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider, type PersistedClient } from '@tanstack/react-query-persist-client'
import { get, set, del } from 'idb-keyval'
import { Toaster } from 'react-hot-toast'

import ProtectedRoute from './router/ProtectedRoute'
import PermissionRoute from './router/PermissionRoute'
import AppShell from './components/layout/AppShell'

// Auth — eagerly loaded (entry points)
import LoginPage from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import ChangePasswordPage from './pages/auth/ChangePasswordPage'

// Dashboard — eagerly loaded (landing page)
import DashboardPage from './pages/dashboard/DashboardPage'

// All other pages — lazy loaded for code splitting
const ProjectsPage       = React.lazy(() => import('./pages/projects/ProjectsPage'))
const ProjectDetailPage  = React.lazy(() => import('./pages/projects/ProjectDetailPage'))
const TaskDetailPage     = React.lazy(() => import('./pages/tasks/TaskDetailPage'))
const DrillDownPage      = React.lazy(() => import('./pages/analytics/DrillDownPage'))
const MapPage            = React.lazy(() => import('./pages/analytics/MapPage'))
const TopPerformersPage  = React.lazy(() => import('./pages/analytics/TopPerformersPage'))
const BenchmarkPage      = React.lazy(() => import('./pages/analytics/BenchmarkPage'))
const BlockersPage       = React.lazy(() => import('./pages/blockers/BlockersPage'))
const OrgPage            = React.lazy(() => import('./pages/org/OrgPage'))
const OrgEntityPage      = React.lazy(() => import('./pages/org/OrgEntityPage'))
const DepartamentoDetailPage = React.lazy(() => import('./pages/org/DepartamentoDetailPage'))
const UserDetailPage = React.lazy(() => import('./pages/users/UserDetailPage'))
const RegioesPage        = React.lazy(() => import('./pages/geo/RegioesPage'))
const AscsPage           = React.lazy(() => import('./pages/geo/AscsPage'))
const UsersPage          = React.lazy(() => import('./pages/users/UsersPage'))
const FeedbackPage       = React.lazy(() => import('./pages/feedback/FeedbackPage'))
const NotificationsPage  = React.lazy(() => import('./pages/notifications/NotificationsPage'))
const AuditPage          = React.lazy(() => import('./pages/audit/AuditPage'))
const ProfilePage        = React.lazy(() => import('./pages/profile/ProfilePage'))
const DesignSystemPage   = React.lazy(() => import('./pages/design-system/DesignSystemPage'))


const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,             // 5min — data stays fresh, no refetch on navigate
      gcTime: 1000 * 60 * 60 * 24,          // 24h — keep cache entries alive for persistence
      refetchOnWindowFocus: false,           // Don't refetch when user alt-tabs back
      refetchOnMount: false,                 // Use cached data on navigation, don't re-spinner
      refetchOnReconnect: false,             // Don't refetch on network reconnect
    },
  },
})

// ── Persist geo & org queries to IndexedDB ────────────────────────────────
// IndexedDB has no practical size limit (vs localStorage's ~5MB), so we can
// persist everything including polygon data (33MB+).
const IDB_KEY = 'edm-kpi-query-cache'
const PERSISTED_KEYS = ['geo', 'departamentos', 'direcoes', 'pelouros']

const persister = {
  persistClient: async (client: PersistedClient) => { await set(IDB_KEY, client) },
  restoreClient: async (): Promise<PersistedClient | undefined> => await get(IDB_KEY),
  removeClient:  async () => { await del(IDB_KEY) },
}

const persistOptions = {
  persister,
  maxAge: 1000 * 60 * 60 * 24,              // 24h — matches daily refresh cadence
  dehydrateOptions: {
    shouldDehydrateQuery: (query: any) => {
      if (query.state.status !== 'success') return false
      const key = query.queryKey as string[]
      return PERSISTED_KEYS.includes(key[0])
    },
  },
}

export default function App() {
  return (
    <PersistQueryClientProvider client={qc} persistOptions={persistOptions}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            {/* Standalone — no AppShell (shown during forced password change) */}
            <Route path="/change-password" element={<ChangePasswordPage />} />

            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />

              <Route path="/tasks/:id" element={<TaskDetailPage />} />

              <Route path="/analytics/drill-down" element={<DrillDownPage />} />
              <Route path="/analytics/map" element={<MapPage />} />
              <Route path="/analytics/top-performers" element={<TopPerformersPage />} />
              <Route path="/analytics/benchmark" element={<BenchmarkPage />} />

              <Route path="/feedback" element={<FeedbackPage />} />

              <Route path="/blockers" element={<BlockersPage />} />

              <Route path="/org" element={<OrgPage />} />
              <Route path="/org/departamentos/:id" element={<DepartamentoDetailPage />} />
              <Route path="/users/:id" element={<UserDetailPage />} />

              {/* Org admin — gated by role */}
              <Route element={<PermissionRoute action="view:pelouros" />}>
                <Route path="/org/pelouros" element={<OrgEntityPage type="pelouro" />} />
              </Route>
              <Route element={<PermissionRoute action="view:direcoes" />}>
                <Route path="/org/direcoes" element={<OrgEntityPage type="direcao" />} />
              </Route>
              <Route element={<PermissionRoute action="view:departamentos" />}>
                <Route path="/org/departamentos" element={<OrgEntityPage type="departamento" />} />
              </Route>

              {/* Geography — CA only */}
              <Route element={<PermissionRoute action="manage:geo" />}>
                <Route path="/geo/regioes" element={<RegioesPage />} />
                <Route path="/geo/ascs" element={<AscsPage />} />
              </Route>

              {/* User management — CA only */}
              <Route element={<PermissionRoute action="manage:users" />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>

              <Route path="/notifications" element={<NotificationsPage />} />

              {/* Audit — CA, PELOURO, DIRECAO */}
              <Route element={<PermissionRoute action="view:audit" />}>
                <Route path="/audit" element={<AuditPage />} />
              </Route>
              <Route path="/profile" element={<ProfilePage />} />

              <Route path="/design-system" element={<DesignSystemPage />} />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: 'var(--shadow-elevated)',
          },
        }}
      />
    </PersistQueryClientProvider>
  )
}
