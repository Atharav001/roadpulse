import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import IncidentCard from '../components/IncidentCard';
import { incidentsAPI, getCurrentUser } from '../api/client';

export default function AuthorityQueue() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'authority') {
      navigate('/');
      return;
    }

    fetchIncidents();
  }, [user, navigate]);

  const fetchIncidents = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await incidentsAPI.list({
        status: 'reported', // Show reported and in_progress incidents
      });
      setIncidents(
        (response.incidents || []).filter((i) => i.status !== 'resolved')
      );
    } catch (err) {
      setError(err.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveIncident = async (incidentId) => {
    setResolving(incidentId);

    try {
      await incidentsAPI.updateStatus(incidentId, 'resolved');
      // Remove from list
      setIncidents(incidents.filter((i) => i.id !== incidentId));
    } catch (err) {
      setError(err.message || 'Failed to mark incident as resolved');
    } finally {
      setResolving(null);
    }
  };

  if (!user) {
    return null;
  }

  if (user.role !== 'authority') {
    return (
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="alert alert-error">
          This page is only available to authority users.
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <h1>Authority Incident Queue</h1>

      <div className="card" style={{ marginBottom: '1rem', background: '#dbeafe' }}>
        <p>Logged in as: <strong>{user.email}</strong></p>
        <p>Review and resolve incidents assigned to your department.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="flex flex-center" style={{ padding: '2rem' }}>
          <div className="spinner"></div>
        </div>
      )}

      {!loading && incidents.length === 0 && (
        <div className="alert alert-success">
          ✓ All incidents resolved! No pending items in your queue.
        </div>
      )}

      {!loading && incidents.length > 0 && (
        <div>
          <p style={{ marginBottom: '1rem', color: 'var(--text-gray)' }}>
            Pending incidents: {incidents.length}
          </p>
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="card"
              style={{ marginBottom: '1rem' }}
            >
              <div className="flex justify-between" style={{ alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>
                    {incident.issue_type} ({incident.severity})
                  </h3>
                  <p className="text-muted text-small">📍 {incident.landmark_description}</p>
                  <p className="text-muted text-small">Reports: {incident.report_count || 1}</p>
                </div>
                <button
                  className="btn btn-success"
                  onClick={() => handleResolveIncident(incident.id)}
                  disabled={resolving === incident.id}
                >
                  {resolving === incident.id ? 'Resolving...' : '✓ Mark Resolved'}
                </button>
              </div>
              <button
                className="btn btn-secondary btn-small"
                onClick={() => navigate(`/incident/${incident.id}`)}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
