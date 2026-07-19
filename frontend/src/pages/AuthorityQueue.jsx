import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { incidentsAPI, getCurrentUser } from '../api/client';

const DEPT_NAMES = {
  'municipal-roads': 'Municipal Road Dept',
  'drainage-dept': 'Drainage Dept',
  'traffic-police': 'Traffic Police',
};

export default function AuthorityQueue() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'authority') { navigate('/'); return; }
    fetchIncidents();
  }, [user, navigate]);

  const fetchIncidents = async () => {
    setLoading(true); setError('');
    try {
      const filters = {};
      if (user.department) filters.department = user.department;
      const response = await incidentsAPI.list(filters);
      setIncidents((response.incidents || []).filter(i => i.status !== 'resolved'));
    } catch (err) {
      setError(err.message || 'Failed to load incidents');
    } finally { setLoading(false); }
  };

  const handleResolveIncident = async (incidentId) => {
    setResolving(incidentId);
    try {
      await incidentsAPI.updateStatus(incidentId, 'resolved');
      setIncidents(incidents.filter(i => i.id !== incidentId));
    } catch (err) {
      setError(err.message || 'Failed to mark incident as resolved');
    } finally { setResolving(null); }
  };

  if (!user) return null;

  if (user.role !== 'authority') {
    return (
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="alert alert-error">This page is only available to authority users.</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '1.5rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Authority Queue</h1>

      <div className="card card-static" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--accent)' }}>
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <p className="text-small text-muted" style={{ margin: 0 }}>
              Logged in as <strong style={{ color: 'var(--text-primary)' }}>{user.email}</strong>
            </p>
            <p className="text-small text-muted" style={{ margin: '0.25rem 0 0 0' }}>
              Department: <strong style={{ color: 'var(--text-primary)' }}>{DEPT_NAMES[user.department] || user.department || 'All'}</strong>
            </p>
          </div>
          <span className={'badge ' + (incidents.length > 0 ? 'badge-routed' : 'badge-resolved')}>
            {incidents.length} pending
          </span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="flex flex-center" style={{ padding: '3rem' }}>
          <div className="spinner"></div>
        </div>
      )}

      {!loading && incidents.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h3 style={{ marginBottom: '0.5rem' }}>All clear!</h3>
          <p className="text-muted">No pending incidents in your department.</p>
        </div>
      )}

      {!loading && incidents.length > 0 && incidents.map(incident => (
        <div key={incident.id} className="card" style={{ marginBottom: '0.75rem' }}>
          <div className="flex justify-between items-start" style={{ marginBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>
                {incident.issue_type?.replace(/_/g, ' ') || 'Unclassified'}
                <span className="text-small text-muted" style={{ marginLeft: '0.5rem' }}>({incident.severity})</span>
              </h3>
              <p className="text-small text-muted" style={{ margin: 0 }}>{incident.landmark_description}</p>
              <p className="text-small text-muted" style={{ margin: '0.25rem 0 0 0' }}>Reports: {incident.report_count || 1}</p>
            </div>
            <div className="flex gap-2" style={{ flexShrink: 0 }}>
              <button className="btn btn-secondary btn-small" onClick={() => navigate('/incident/' + incident.id)}>
                View
              </button>
              <button
                className="btn btn-success btn-small"
                onClick={() => handleResolveIncident(incident.id)}
                disabled={resolving === incident.id}
              >
                {resolving === incident.id ? '...' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}