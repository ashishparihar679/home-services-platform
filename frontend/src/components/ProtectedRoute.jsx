import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { dashboardPath } from '../utils/auth'

export default function ProtectedRoute({ allowedRoles, superuserOnly = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="page-state">Checking your session…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (allowedRoles?.length && !allowedRoles.includes(user.role)) return <Navigate to={dashboardPath(user)} replace />
  if (superuserOnly && !(user.role === 'admin' && user.is_superuser === true)) return <Navigate to={dashboardPath(user)} replace />
  return <Outlet />
}
