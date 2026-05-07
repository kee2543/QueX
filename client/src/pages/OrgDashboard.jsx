import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage, isNetworkError } from '../utils/api';
import { Building, Users, Settings, Play, Pause, Square, Plus, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';

export default function OrgDashboard() {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orgForm, setOrgForm] = useState({ name: '', description: '' });
  const [queueForm, setQueueForm] = useState({ name: '', maxCapacity: 100, serviceRate: 5 });
  const [needsOrg, setNeedsOrg] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // Track which action is in progress
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/orgs/me/queues');
      setQueues(res.data);
      setNeedsOrg(false);
      if (res.data.length === 0) {
        setShowCreateForm(true);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        const msg = err.response.data.error || err.response.data.message || '';
        if (msg.toLowerCase().includes('organization')) {
          setNeedsOrg(true);
        }
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  const handleRetry = () => {
    setRetrying(true);
    fetchData();
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    setActionLoading('create-org');
    try {
      await api.post('/orgs', orgForm);
      setNeedsOrg(false);
      setShowCreateForm(true);
      setError('');
    } catch (err) {
      setError(isNetworkError(err)
        ? 'Network issue — please try again in a moment.'
        : (err.response?.data?.error || 'Failed to create organization'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateQueue = async (e) => {
    e.preventDefault();
    setActionLoading('create-queue');
    try {
      const res = await api.post('/orgs/me/queues', {
        name: queueForm.name,
        maxCapacity: parseInt(queueForm.maxCapacity),
        serviceRate: parseFloat(queueForm.serviceRate),
      });
      setQueues([...queues, { ...res.data, waitingCount: 0, entries: [] }]);
      setShowCreateForm(false);
      setQueueForm({ name: '', maxCapacity: 100, serviceRate: 5 });
      setError('');
    } catch (err) {
      setError(isNetworkError(err)
        ? 'Network issue — please try again in a moment.'
        : (err.response?.data?.error || 'Failed to create queue'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (queueId, status) => {
    setActionLoading(`status-${queueId}`);
    try {
      const res = await api.patch(`/orgs/me/queues/${queueId}/status`, { status });
      setQueues(queues.map(q => q.id === queueId ? { ...q, status: res.data.status } : q));
      setError('');
    } catch (err) {
      setError(isNetworkError(err)
        ? 'Network issue — status update may not have gone through. Refreshing...'
        : 'Failed to update status');
      // Auto-refresh to get the truth from the server
      setTimeout(fetchData, 2000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCallNext = async (queueId) => {
    setActionLoading(`call-${queueId}`);
    try {
      await api.post(`/orgs/me/queues/${queueId}/call-next`);
      fetchData(); // Refresh to stay in sync with positions
    } catch (err) {
      setError(isNetworkError(err)
        ? 'Network issue — the call may not have gone through. Refreshing...'
        : (err.response?.data?.error || 'Failed to call next user'));
      // Auto-refresh to get the truth
      setTimeout(fetchData, 2000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteQueue = async (queueId) => {
    if (!window.confirm('Are you sure you want to delete this queue? This action cannot be undone.')) return;
    setActionLoading(`delete-${queueId}`);
    try {
      await api.delete(`/orgs/me/queues/${queueId}`);
      const updated = queues.filter(q => q.id !== queueId);
      setQueues(updated);
      if (updated.length === 0) {
        setShowCreateForm(true);
      }
      setError('');
    } catch (err) {
      setError(isNetworkError(err)
        ? 'Network issue — please verify if the queue was deleted.'
        : (err.response?.data?.error || 'Failed to delete queue'));
      // Auto-refresh to get the truth
      setTimeout(fetchData, 2000);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <span>Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  if (needsOrg) {
    return (
      <div className="page-container" style={{ maxWidth: '600px' }}>
        <div className="glass-card">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Building size={48} color="var(--color-primary)" style={{ marginBottom: '1rem', display: 'inline-block' }} />
            <h2>Create Your Organization</h2>
            <p className="page-subtitle">You need an organization profile to host queues.</p>
          </div>
          {error && (
            <div className="error-banner" style={{ marginBottom: '1rem' }}>
              <div className="error-banner-content">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            </div>
          )}
          <form onSubmit={handleCreateOrg}>
            <div className="form-group">
              <label className="form-label">Organization Name</label>
              <input
                type="text"
                className="form-input"
                value={orgForm.name}
                onChange={e => setOrgForm({ ...orgForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows="3"
                value={orgForm.description}
                onChange={e => setOrgForm({ ...orgForm, description: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={actionLoading === 'create-org'}>
              {actionLoading === 'create-org' ? <><div className="spinner"></div> Creating...</> : 'Create Organization'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Organization Dashboard</h1>
          <p className="page-subtitle">Manage your virtual queues ({queues.length}/5)</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleRetry} disabled={retrying} title="Refresh dashboard">
            <RefreshCw size={16} className={retrying ? 'spin' : ''} />
          </button>
          {!showCreateForm && queues.length < 5 && (
            <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
              <Plus size={18} /> New Queue
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: '1.5rem' }}>
          <div className="error-banner-content">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleRetry} disabled={retrying}>
            <RefreshCw size={14} className={retrying ? 'spin' : ''} /> Retry
          </button>
        </div>
      )}

      {showCreateForm && (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto 3rem auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Users size={40} color="var(--color-primary)" style={{ marginBottom: '1rem', display: 'inline-block' }} />
            <h2>{queues.length === 0 ? 'Create Your First Queue' : 'Create New Queue'}</h2>
            <p className="page-subtitle">Set up a virtual queue for your customers.</p>
          </div>
          <form onSubmit={handleCreateQueue}>
            <div className="form-group">
              <label className="form-label">Queue Name</label>
              <input
                type="text"
                className="form-input"
                value={queueForm.name}
                onChange={e => setQueueForm({ ...queueForm, name: e.target.value })}
                placeholder="e.g. Reception, Service Desk..."
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Capacity</label>
              <input
                type="number"
                className="form-input"
                value={queueForm.maxCapacity}
                onChange={e => setQueueForm({ ...queueForm, maxCapacity: e.target.value })}
                min="1"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Est. Service Rate (min/person)</label>
              <input
                type="number"
                className="form-input"
                value={queueForm.serviceRate}
                onChange={e => setQueueForm({ ...queueForm, serviceRate: e.target.value })}
                min="0.1"
                step="0.1"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary btn-full" disabled={actionLoading === 'create-queue'}>
                {actionLoading === 'create-queue' ? <><div className="spinner"></div> Creating...</> : 'Create Queue'}
              </button>
              {queues.length > 0 && (
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        {queues.map((q) => (
          <div key={q.id} className="glass-card" style={{ borderLeft: `4px solid ${q.status === 'ACTIVE' ? 'var(--color-success)' : q.status === 'PAUSED' ? 'var(--color-warning)' : 'var(--color-danger)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{q.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%',
                    backgroundColor: q.status === 'ACTIVE' ? 'var(--color-success)' : q.status === 'PAUSED' ? 'var(--color-warning)' : 'var(--color-danger)'
                  }}></span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
                    {q.status}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/queue-view/${q.id}`)}>
                  <Settings size={16} /> Manage
                </button>
                {q.status !== 'ACTIVE' && (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleStatusChange(q.id, 'ACTIVE')}
                    disabled={actionLoading === `status-${q.id}`}
                  >
                    {actionLoading === `status-${q.id}` ? <div className="spinner" style={{width:'14px',height:'14px'}}></div> : <Play size={14} />} Start
                  </button>
                )}
                {q.status === 'ACTIVE' && (
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--color-warning)', color: 'white', border: 'none' }}
                    onClick={() => handleStatusChange(q.id, 'PAUSED')}
                    disabled={actionLoading === `status-${q.id}`}
                  >
                    {actionLoading === `status-${q.id}` ? <div className="spinner" style={{width:'14px',height:'14px'}}></div> : <Pause size={14} />} Pause
                  </button>
                )}
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteQueue(q.id)}
                  disabled={actionLoading === `delete-${q.id}`}
                >
                  {actionLoading === `delete-${q.id}` ? <div className="spinner" style={{width:'14px',height:'14px'}}></div> : <Trash2 size={14} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Waiting</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{q.waitingCount}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{q.serviceRate}m/p</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Capacity</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{q.maxCapacity}</div>
              </div>
            </div>

            <button 
              className="btn btn-primary btn-full" 
              onClick={() => handleCallNext(q.id)}
              disabled={q.status !== 'ACTIVE' || q.waitingCount === 0 || actionLoading === `call-${q.id}`}
            >
              {actionLoading === `call-${q.id}` ? (
                <><div className="spinner"></div> Calling...</>
              ) : (
                <><Users size={18} /> Call Next User</>
              )}
            </button>
          </div>
        ))}

        {queues.length === 0 && !loading && !showCreateForm && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No queues created yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
