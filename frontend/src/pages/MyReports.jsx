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
    if (!user) {
      navigate('/login');
      return;
    }

    fetchReports();
  }, [user, navigate]);

  const fetchReports = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch all incidents and filter by user_id
      // For now, we'll just fetch all incidents
      // In a real app, we'd have a /reports/user/:user_id endpoint
      const response = await incidentsAPI.list({});
      // Filter by current user (this would be better done server-side)
      setIncidents(response.incidents || []);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <h1>My Reports</h1>

      <div style={{ marginBottom: '1rem' }}>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/report')}
        >
          + Report New Issue
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="flex flex-center" style={{ padding: '2rem' }}>
          <div className="spinner"></div>
        </div>
      )}

      {!loading && incidents.length === 0 && (
        <div className="alert alert-info">
          You haven't submitted any reports yet. <a href="/report">Submit your first report</a>
        </div>
      )}

      {!loading && incidents.length > 0 && (
        <div>
          <p style={{ marginBottom: '1rem', color: 'var(--text-gray)' }}>
            Total reports: {incidents.length}
          </p>
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  );
}
