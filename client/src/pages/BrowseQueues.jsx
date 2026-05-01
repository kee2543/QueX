import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Search, Users, Clock, ArrowRight, LogOut, MapPin } from 'lucide-react';

export default function BrowseQueues() {
  const [queues, setQueues] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [queuesRes, activeRes] = await Promise.all([
        api.get('/queues'),
        api.get('/queues/me/active')
      ]);
      setQueues(queuesRes.data);
      setActiveEntry(activeRes.data);
    } catch (err) {
      setError('Failed to load queues.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async (queueId) => {
    if (!window.confirm('Are you sure you want to leave this queue? You will lose your spot.')) return;
    setProcessingId(queueId);
    try {
      await api.post(`/queues/${queueId}/leave`);
      setActiveEntry(null);
      // Refresh to update counts
      const res = await api.get('/queues');
      setQueues(res.data);
    } catch (err) {
      alert('Failed to leave queue');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredQueues = queues.filter(q => 
    q.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.orgName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Browse Queues</h1>
          <p className="page-subtitle">Find and join available virtual queues.</p>
        </div>
        <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search organizations or queues..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '50vh' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {filteredQueues.length > 0 ? (
            filteredQueues.map(queue => (
              <div key={queue.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', border: activeEntry?.queueId === queue.id ? '1px solid var(--color-primary)' : '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{queue.name}</h3>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{queue.orgName}</div>
                  </div>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: 'var(--radius-sm)', 
                    fontSize: '0.75rem', 
                    fontWeight: '600',
                    backgroundColor: queue.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : queue.status === 'PAUSED' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: queue.status === 'ACTIVE' ? 'var(--color-success)' : queue.status === 'PAUSED' ? 'var(--color-warning)' : 'var(--color-danger)'
                  }}>
                    {queue.status}
                  </span>
                </div>
                
                <div style={{ flex: 1, marginBottom: '1.5rem' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {queue.orgDescription}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <Users size={16} color="var(--color-primary)" />
                      <span>{queue.waitingCount} / {queue.maxCapacity}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <Clock size={16} color="var(--color-warning)" />
                      <span>~{Math.ceil(queue.estimatedWait)} min</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {activeEntry?.queueId === queue.id ? (
                    <>
                      <button 
                        className="btn btn-secondary" 
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => navigate(`/tracker/${queue.id}`)}
                      >
                        <MapPin size={16} /> Track
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)' }}
                        onClick={() => handleLeave(queue.id)}
                        disabled={processingId === queue.id}
                      >
                        <LogOut size={16} />
                      </button>
                    </>
                  ) : (
                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', justifyContent: 'center' }}
                      disabled={
                        queue.status !== 'ACTIVE' || 
                        queue.waitingCount >= queue.maxCapacity ||
                        (activeEntry && activeEntry.queueId !== queue.id) ||
                        processingId === queue.id
                      }
                      onClick={() => navigate(`/queues/${queue.id}/join`)}
                    >
                      {activeEntry ? 'Already in a Queue' : 'Join Queue'} <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No queues found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
