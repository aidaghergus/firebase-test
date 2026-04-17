import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  )
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return children
}

export function AdminRoute({ children }) {
  const { user, role, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (role !== 'admin') return <Navigate to="/app" replace />
  return children
}