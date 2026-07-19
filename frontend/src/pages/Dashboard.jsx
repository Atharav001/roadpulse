import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import IncidentCard from '../components/IncidentCard';
import { dashboardAPI } from '../api/client';

export default function Dashboard() {
  const [selectedWard, setSelectedWard] = useState('Ward-A');
  const [stats, setStats] = useState(null);
  const [pendingIncidents, setPendingIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const wards = [
    { id: 'Ward-A', name: 'Downtown Central Ward' },
    { id: 'Ward-B', name: 'East Side Industrial Ward' },
    { id: 'Ward-C', name: 'North Suburbs Residential Ward' },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, [selectedWard]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
      const [statsResponse, pendingResponse] = await Promise.all([
        dashboardAPI.getWardStats(selectedWard),
        dashboardAPI.getPendingIncidents(),
      ]);

      setStats(statsResponse);
      setPendingIncidents(pendingResponse.pending_incidents || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <h1>Dashboard</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group" style={{ marginBottom: '2rem' }}>
        <label htmlFor="ward-selector">Select Ward</label>
        <select
          id="ward-selector"
          value={selectedWard}
          onChange={(e) => setSelectedWard(e.target.value)}
        >
          {wards.map((ward) => (
            <option key={ward.id} value={ward.id}>
              {ward.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex flex-center" style={{ padding: '2rem' }}>
          <div className="spinner"></div>
        </div>
      )}

      {!loading && stats && (
        <>
          <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
            <StatCard
              title="Total Incidents"
              value={stats.total_incidents}
              icon="📊"
              color="primary"
            />
            <StatCard
              title="Resolved"
              value={stats.resolved_count}
              icon="✓"
              color="success"
            />
            <StatCard
              title="Resolution Rate"
              value={`${stats.resolution_rate_percent}%`}
              icon="📈"
              color={stats.resolution_rate_percent >= 80 ? 'success' : 'warning'}
            />
          </div>

          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2>Pending Incidents (Reported within 60 days)</h2>
            {stats.pending_incidents_list && stats.pending_incidents_list.length > 0 ? (
              <div>
                <p style={{ color: 'var(--text-gray)', marginBottom: '1rem' }}>
                  Count: {stats.pending_incidents_list.length}
                </p>
                {stats.pending_incidents_list.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} />
                ))}
              </div>
            ) : (
              <p className="text-muted">No pending incidents in this ward.</p>
            )}
          </div>

          {pendingIncidents.length > 0 && (
            <div className="card alert alert-danger" style={{ background: 'var(--danger-light)' }}>
              <h2 style={{ color: 'var(--danger)' }}>⚠️ Long-Standing Issues</h2>
              <p style={{ color: 'var(--text-dark)', marginBottom: '1rem' }}>
                These incidents have been pending for more than 60 days.
              </p>
              {pendingIncidents.slice(0, 5).map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
              {pendingIncidents.length > 5 && (
                <p className="text-small text-muted">
                  ... and {pendingIncidents.length - 5} more
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
