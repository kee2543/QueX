import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationToast from './components/NotificationToast';
import Login from './pages/Login';
import Register from './pages/Register';
import OrgDashboard from './pages/OrgDashboard';
import QueueView from './pages/QueueView';
import BrowseQueues from './pages/BrowseQueues';
import JoinQueue from './pages/JoinQueue';
import CustomerTracker from './pages/CustomerTracker';
import Landing from './pages/Landing';

function AppRoutes() {
  const { isAuthenticated, isOrg, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <span>Loading QueueX...</span>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <NotificationToast />
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to={isOrg ? '/dashboard' : '/queues'} /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to={isOrg ? '/dashboard' : '/queues'} /> : <Register />}
        />

        {/* ORG Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="ORG">
              <OrgDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/queue-view/:id?"
          element={
            <ProtectedRoute role="ORG">
              <QueueView />
            </ProtectedRoute>
          }
        />

        {/* USER Routes */}
        <Route
          path="/queues"
          element={
            <ProtectedRoute role="USER">
              <BrowseQueues />
            </ProtectedRoute>
          }
        />
        <Route
          path="/queues/:id/join"
          element={
            <ProtectedRoute role="USER">
              <JoinQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tracker/:id"
          element={
            <ProtectedRoute role="USER">
              <CustomerTracker />
            </ProtectedRoute>
          }
        />

        {/* Default redirect / Landing */}
        <Route
          path="/"
          element={
            isAuthenticated
              ? <Navigate to={isOrg ? '/dashboard' : '/queues'} />
              : <Landing />
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
              <h1 className="page-title">404</h1>
              <p className="page-subtitle">Page not found.</p>
            </div>
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
