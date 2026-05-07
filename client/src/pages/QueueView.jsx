import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { ArrowLeft, Users, UserMinus, Clock, RefreshCw, AlertTriangle, WifiOff } from 'lucide-react';

export default function QueueView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, joinQueueRoom, leaveQueueRoom, isConnected } = useSocket();
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (id) { fetchQueue(); } else { navigate('/dashboard'); }
    return () => { if (id) leaveQueueRoom(id); };
  }, [id]);

  useEffect(() => {
    if (socket && id) {
      joinQueueRoom(id);
      socket.on('user-joined', fetchQueue);
      socket.on('user-left', fetchQueue);
      socket.on('user-called', fetchQueue);
      return () => { socket.off('user-joined'); socket.off('user-left'); socket.off('user-called'); };
    }
  }, [socket, id]);

  useEffect(() => { if (isConnected && queueData) fetchQueue(); }, [isConnected]);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await api.get(`/orgs/me/queues/${id}`);
      setQueueData(res.data);
      setError('');
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); setRetrying(false); }
  }, [id]);

  const handleRetry = () => { setRetrying(true); fetchQueue(); };

  const handleRemove = async (entryId) => {
    if (!window.confirm('Remove this user from the queue?')) return;
    setRemovingId(entryId);
    try { await api.delete(`/orgs/me/queues/${id}/entries/${entryId}`); fetchQueue(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to remove user.'); }
    finally { setRemovingId(null); }
  };

  if (loading) return (<div className="page-container"><div className="loading-screen"><div className="spinner"></div><span>Loading Live View...</span></div></div>);

  if (!queueData) return (
    <div className="page-container" style={{ textAlign: 'center' }}>
      <h2>Error</h2><p>{error || 'No queue found'}</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
        <button className="btn btn-primary" onClick={handleRetry} disabled={retrying}><RefreshCw size={16} className={retrying ? 'spin' : ''} /> Try Again</button>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    </div>
  );

  const waitingEntries = queueData.entries?.filter(e => e.status === 'WAITING') || [];

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button className="btn btn-secondary btn-sm" style={{ marginBottom: '2rem' }} onClick={() => navigate('/dashboard')}><ArrowLeft size={16} /> Back to Dashboard</button>

      {error && queueData && (
        <div className="error-banner" style={{ marginBottom: '1.5rem' }}>
          <div className="error-banner-content"><AlertTriangle size={18} /><span>{error}</span></div>
          <button className="btn btn-secondary btn-sm" onClick={handleRetry} disabled={retrying}><RefreshCw size={14} className={retrying ? 'spin' : ''} /> Retry</button>
        </div>
      )}
      {!isConnected && queueData && (
        <div className="warning-banner" style={{ marginBottom: '1.5rem' }}>
          <WifiOff size={16} /><span>Real-time updates paused. Data may be outdated.</span>
          <button className="btn btn-secondary btn-sm" onClick={handleRetry} disabled={retrying}><RefreshCw size={14} className={retrying ? 'spin' : ''} /></button>
        </div>
      )}

      <div className="page-header"><h1 className="page-title">{queueData.name} - Live View</h1><p className="page-subtitle">Manage users in your queue.</p></div>

      <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Waiting</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={24} color="var(--color-primary)" />{queueData.waitingCount} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>/ {queueData.maxCapacity}</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Status</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '600', color: queueData.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-warning)' }}>{queueData.status}</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleRetry} disabled={retrying} title="Refresh"><RefreshCw size={16} className={retrying ? 'spin' : ''} /></button>
      </div>

      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Waiting List</h2>
      {waitingEntries.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No one is currently waiting.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {waitingEntries.map((entry, index) => (
            <div key={entry.id} className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(124, 58, 237, 0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>{index + 1}</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{entry.user.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> Joined {new Date(entry.joinedAt).toLocaleTimeString()}</div>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => handleRemove(entry.id)} disabled={removingId === entry.id} title="Remove User">
                {removingId === entry.id ? <div className="spinner" style={{width:'16px',height:'16px'}}></div> : <UserMinus size={16} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
