import { useAuthStore } from '../stores/auth.store'
import type { Role } from '../types'

// ADMIN and CA are both top-level roles with full permissions
const ADMIN_ROLES: Role[] = ['ADMIN', 'CA']

// Write actions that regional directors (DIRECAO + director_scope=REGION) cannot perform
const REGIONAL_DIRECTOR_BLOCKED: string[] = [
  'create:project',
  'create:task',
  'create:departamento',
  'update:milestone',
  'approve:blocker',
]

export function useAuth() {
  const { user, token, clearAuth } = useAuthStore()

  const isRole = (...roles: Role[]) => !!user && roles.includes(user.role)
  const isCA = () => isRole('ADMIN', 'CA')
  const isPelouro = () => isRole('PELOURO')
  const isDirecao = () => isRole('DIRECAO')
  const isDepartamento = () => isRole('DEPARTAMENTO')
  /** True when logged-in user is a DIRECAO responsible for a Região only (read-only mode) */
  const isRegionalDirector = () => !!user && user.role === 'DIRECAO' && user.director_scope === 'REGION'

  const can = (action: string): boolean => {
    if (!user) return false

    // Regional directors are blocked from all write actions
    if (isRegionalDirector() && REGIONAL_DIRECTOR_BLOCKED.includes(action)) return false

    const role = user.role
    const perms: Record<string, Role[]> = {
      // Actions
      'create:pelouro':      [...ADMIN_ROLES],
      'create:direcao':      [...ADMIN_ROLES, 'PELOURO'],
      'create:departamento': [...ADMIN_ROLES, 'PELOURO', 'DIRECAO'],
      'create:project':      [...ADMIN_ROLES, 'PELOURO', 'DIRECAO', 'DEPARTAMENTO'],
      'create:task':         [...ADMIN_ROLES, 'PELOURO', 'DIRECAO', 'DEPARTAMENTO'],
      'update:milestone':    ['DIRECAO', 'DEPARTAMENTO'],
      'approve:blocker':     [...ADMIN_ROLES, 'PELOURO', 'DIRECAO'],
      'view:all_dashboard':  [...ADMIN_ROLES],
      // Admin pages (ADMIN only — CA/PELOURO get the executive dashboard)
      'manage:users':        ['ADMIN'],
      'manage:geo':          ['ADMIN'],
      'view:audit':          ['ADMIN'],
      'view:pelouros':       ['ADMIN'],
      'view:direcoes':       ['ADMIN', 'PELOURO'],
      'view:departamentos':  ['ADMIN'],
      // Operational nav items — hidden for CA and PELOURO (executive roles)
      'view:operational_nav': ['ADMIN', 'DIRECAO', 'DEPARTAMENTO'],
      // Drill-down report — only for ADMIN and DEPARTAMENTO (not directors)
      'view:drill_down':      ['ADMIN'],
      // Map — only for ADMIN, CA, PELOURO (directors have it embedded in their dashboard)
      'view:map':             ['ADMIN', 'CA', 'PELOURO'],
    }
    return perms[action]?.includes(role) ?? false
  }

  return { user, token, isRole, isCA, isPelouro, isDirecao, isDepartamento, isRegionalDirector, can, clearAuth }
}
