import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface Props {
  action: string
}

/** Redirects to /dashboard if the current user cannot perform `action`. */
export default function PermissionRoute({ action }: Props) {
  const { can } = useAuth()
  if (!can(action)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
