import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Building, Users, Clock, ArrowLeft, Bell } from 'lucide-react';

export default function JoinQueue() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [notifyPos, setNotifyPos] = useState(3);

  useEffect(() => {
    const fetchQueueDetails = async () => {
      try {
        const res = await api.get(`/queues/${id}`);
        setQueue(res.data);
      } catch (err) {
        setError('Failed to load queue details.');
      } finally {
        setLoading(false);
      }
    };
    fetchQueueDetails();
  }, [id]);

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoining(true);
    setError('');
    try {
      await api.post(`/queues/${id}/join`, { notify_at_position: parseInt(notifyPos) });
      navigate(`/tracker/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join queue');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!queue) {
    return (
      <div className="page-container" style={{ textAlign: 'center' }}>
        <h2>Queue Not Found</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/queues')}>Back to Browse</button>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '600px' }}>
      <button className="btn btn-secondary btn-sm" style={{ marginBottom: '2rem' }} onClick={() => navigate('/queues')}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Building size={48} color="var(--color-primary)" style={{ marginBottom: '1rem', display: 'inline-block' }} />
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{queue.orgName}</h2>
          <p className="page-subtitle">{queue.name}</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <Users size={24} color="var(--text-secondary)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{queue.waitingCount}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>People Waiting</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <Clock size={24} color="var(--text-secondary)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{(queue.waitingCount * queue.serviceRate).toFixed(0)} <span style={{fontSize: '1rem'}}>min</span></div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Est. Wait Time</div>
          </div>
        </div>

        <form onSubmit={handleJoin}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={16} /> Notify me when I reach position:
            </label>
            <input
              type="number"
              className="form-input"
              value={notifyPos}
              onChange={(e) => setNotifyPos(e.target.value)}
              min="1"
              max="10"
              required
            />
            <small style={{ color: 'var(--text-muted)' }}>We will send an extra notification when you reach this position.</small>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full btn-lg" 
            style={{ marginTop: '1rem' }}
            disabled={joining || queue.status !== 'ACTIVE' || queue.waitingCount >= queue.maxCapacity}
          >
            {joining ? 'Joining...' : 'Join Queue'}
          </button>
        </form>
      </div>
    </div>
  );
}
