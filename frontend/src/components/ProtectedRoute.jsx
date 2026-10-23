import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute({ adminOnly = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="page-state">Checking your session…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/services" replace />
  return <Outlet />
}
