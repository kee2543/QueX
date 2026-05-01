import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — wraps pages that require authentication.
 * Optionally restricts by role: <ProtectedRoute role="ORG">
 */
export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user?.role !== role) {
    // Redirect to appropriate dashboard based on actual role
    const redirectTo = user?.role === 'ORG' ? '/dashboard' : '/queues';
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
