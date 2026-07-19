import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import IncidentCard from '../components/IncidentCard';
import { incidentsAPI, getCurrentUser } from '../api/client';

export default function MyReports() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchReports();
  }, [user, navigate]);

  const fetchReports = async () => {
    setLoading(true); setError('');
    try {
      const response = await incidentsAPI.list({});
      setIncidents(response.incidents || []);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally { setLoading(false); }
  };

  if (!user) return null;

  return (
    <div className="container" style={{ padding: '1.5rem' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>My Reports</h1>
        <button className="btn btn-primary" onClick={() => navigate('/report')}>
          + New Report
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="flex flex-center" style={{ padding: '3rem' }}>
          <div className="spinner"></div>
        </div>
      )}

      {!loading && incidents.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No reports yet</h3>
          <p className="text-muted">Submit your first report to track it here.</p>
          <button className="btn btn-primary" onClick={() => navigate('/report')} style={{ marginTop: '1rem' }}>
            Report an Issue
          </button>
        </div>
      )}

      {!loading && incidents.length > 0 && (
        <div>
          <p className="text-small text-muted" style={{ marginBottom: '1rem' }}>
            {incidents.length} report{incidents.length !== 1 ? 's' : ''}
          </p>
          {incidents.map(i => <IncidentCard key={i.id} incident={i} />)}
        </div>
      )}
    </div>
  );
}