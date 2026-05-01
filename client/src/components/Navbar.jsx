import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import { LogOut, ExternalLink } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isOrg, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeEntry, setActiveEntry] = useState(null);

  useEffect(() => {
    if (isAuthenticated && !isOrg) {
      fetchActiveEntry();
    } else {
      setActiveEntry(null);
    }
  }, [isAuthenticated, isOrg, location.pathname]); // Refresh on navigation

  useEffect(() => {
    if (socket && activeEntry) {
      const handleUserLeft = (data) => {
        if (data.userId === user?.id) setActiveEntry(null);
      };
      const handleQueueDeleted = (data) => {
        if (data.queueId === activeEntry.queueId) setActiveEntry(null);
      };

      socket.on('user-left', handleUserLeft);
      socket.on('queue-deleted', handleQueueDeleted);

      return () => {
        socket.off('user-left', handleUserLeft);
        socket.off('queue-deleted', handleQueueDeleted);
      };
    }
  }, [socket, activeEntry, user?.id]);

  const fetchActiveEntry = async () => {
    try {
      const res = await api.get('/queues/me/active');
      setActiveEntry(res.data);
    } catch (err) {
      console.error('Failed to fetch active entry');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLeave = async (e) => {
    e.preventDefault();
    if (!activeEntry) return;
    if (!window.confirm(`Leave queue "${activeEntry.queue.name}"?`)) return;

    try {
      await api.post(`/queues/${activeEntry.queueId}/leave`);
      setActiveEntry(null);
      if (location.pathname.startsWith('/tracker')) {
        navigate('/queues');
      }
    } catch (err) {
      alert('Failed to leave queue');
    }
  };

  return (
    <nav className="navbar">
      <Link to={isAuthenticated ? (isOrg ? '/dashboard' : '/queues') : '/'} className="navbar-brand">
        QueueX
      </Link>

      <div className="navbar-nav">
        {isAuthenticated ? (
          <>
            {!isOrg && activeEntry && (
              <div className="navbar-active-queue">
                <Link to={`/tracker/${activeEntry.queueId}`} className="queue-pill">
                  <span className="dot"></span>
                  <span className="name">{activeEntry.queue.name}</span>
                  <ExternalLink size={12} />
                </Link>
                <button 
                  className="leave-btn" 
                  onClick={handleLeave}
                  title="Leave Queue"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}
            <div className="navbar-user">
              <span>{user?.name}</span>
              <span className="navbar-role">{user?.role}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-secondary btn-sm">Sign In</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
