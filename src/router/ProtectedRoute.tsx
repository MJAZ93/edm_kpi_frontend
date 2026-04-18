import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store'

export default function ProtectedRoute() {
  const token = useAuthStore(s => s.token)
  const user = useAuthStore(s => s.user)
  const location = useLocation()

  if (!token) return <Navigate to="/login" replace />

  // Force password change on first login — redirect everything except the change-password page itself
  if (user?.force_password_change && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return <Outlet />
}
