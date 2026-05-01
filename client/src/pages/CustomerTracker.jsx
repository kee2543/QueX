import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { Clock, Users, ArrowLeft, LogOut, Bell, CheckCircle } from 'lucide-react';

export default function CustomerTracker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, joinQueueRoom, leaveQueueRoom } = useSocket();
  const [positionData, setPositionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    fetchPosition();

    // Socket listeners
    if (socket) {
      joinQueueRoom(id);

      socket.on('position-update', (data) => {
        setPositionData(prev => ({
          ...prev,
          position: data.position,
          estimatedWait: data.estimatedWait
        }));
      });

      socket.on('queue-status-changed', (data) => {
        setPositionData(prev => prev ? { ...prev, queueStatus: data.status } : null);
      });

      socket.on('queue-deleted', () => {
        setError('This queue has been closed by the organization.');
      });
    }

    return () => {
      leaveQueueRoom(id);
      if (socket) {
        socket.off('position-update');
        socket.off('queue-status-changed');
        socket.off('queue-deleted');
      }
    };
  }, [id, socket]);

  const fetchPosition = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/queues/${id}/position`);
      setPositionData(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('You are not in this queue or the queue does not exist.');
      } else {
        setError(err.response?.data?.error || 'Failed to fetch position.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave the queue? You will lose your spot.')) {
      return;
    }
    
    setLeaving(true);
    try {
      await api.post(`/queues/${id}/leave`);
      navigate('/queues');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to leave queue');
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <span>Loading Tracker...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container" style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--color-danger)' }}>Status</h2>
        <p style={{ marginBottom: '2rem' }}>{error}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/queues')}>Back to Queues</button>
      </div>
    );
  }

  if (!positionData) return null;

  return (
    <div className="page-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <button className="btn btn-secondary btn-sm" style={{ marginBottom: '2rem' }} onClick={() => navigate('/queues')}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="glass-card" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {positionData.position === 1 && (
           <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '0.5rem', background: 'var(--color-success)', color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>
             You are next! Please head to the entrance.
           </div>
        )}
        
        <h2 style={{ fontSize: '1.5rem', marginTop: positionData.position === 1 ? '1.5rem' : '0' }}>Your Live Status</h2>
        <div style={{ 
          color: positionData.queueStatus === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-warning)',
          fontSize: '0.9rem',
          fontWeight: '600',
          marginBottom: '2rem'
        }}>
          {positionData.queueStatus === 'ACTIVE' ? 'Queue is Active' : `Queue is ${positionData.queueStatus}`}
        </div>

        <div style={{ 
          width: '180px', 
          height: '180px', 
          borderRadius: '50%', 
          background: 'var(--gradient-primary)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '0 auto 2rem',
          boxShadow: 'var(--shadow-glow)',
          border: '4px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{ fontSize: '1rem', opacity: 0.9 }}>Position</span>
          <span style={{ fontSize: '4.5rem', fontWeight: '800', lineHeight: 1 }}>{positionData.position}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <Clock size={20} color="var(--text-secondary)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{Math.ceil(positionData.estimatedWait)} <span style={{fontSize: '0.9rem'}}>min</span></div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Est. Wait Time</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <Users size={20} color="var(--text-secondary)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{positionData.position - 1}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>People Ahead</div>
          </div>
        </div>

        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
          <Bell size={24} color="var(--color-info)" />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Notifications Active</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>You'll be alerted when your position changes.</div>
          </div>
        </div>

        <button 
          className="btn btn-danger btn-full" 
          onClick={handleLeave}
          disabled={leaving}
        >
          <LogOut size={16} /> {leaving ? 'Leaving...' : 'Leave Queue'}
        </button>
      </div>
    </div>
  );
}
