import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import IncidentCard from '../components/IncidentCard';
import { dashboardAPI } from '../api/client';

const wards = [
  { id: 'Ward-A', name: 'Downtown Central Ward' },
  { id: 'Ward-B', name: 'East Side Industrial Ward' },
  { id: 'Ward-C', name: 'North Suburbs Residential Ward' },
  { id: 'Ward-D', name: 'Highway Corridor Ward' },
  { id: 'Ward-E', name: 'Beach Road Ward' },
];

const chartColors = {
  reported: '#f59e0b',
  routed: '#3b82f6',
  in_progress: '#8b5cf6',
  resolved: '#22c55e',
};

function StatusChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxCount = Math.max(...data.map(s => s.count), 1);

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: '1.25rem' }}>Status Breakdown</h3>
      <div style={{
        display: 'flex', gap: '1rem', alignItems: 'flex-end',
        minHeight: '180px', paddingTop: '0.5rem'
      }}>
        {data.map(s => {
          const pct = (s.count / maxCount) * 140;
          return (
            <div key={s.status} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '0.375rem'
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{s.count}</span>
              <div
                className="chart-bar"
                style={{
                  height: Math.max(pct, 6) + 'px',
                  width: '100%',
                  maxWidth: '56px',
                  background: chartColors[s.status] || '#94a3b8',
                }}
              />
              <span style={{
                fontSize: '0.7rem', textTransform: 'capitalize',
                color: 'var(--text-muted)', textAlign: 'center'
              }}>
                {s.status.replace(/_/g, ' ')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PendingSection({ title, incidents, emptyMessage, isEscalated }) {
  if (!incidents || incidents.length === 0) return null;
  return (
    <div className="card" style={{
      marginBottom: '1rem',
      borderLeft: isEscalated ? '3px solid var(--danger)' : '3px solid var(--warning)',
    }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span className="badge" style={{
          background: isEscalated ? 'var(--danger-light)' : 'var(--warning-light)',
          color: isEscalated ? 'var(--danger)' : 'var(--warning)',
        }}>
          {incidents.length}
        </span>
      </div>
      {incidents.length > 0 ? (
        incidents.slice(0, 5).map(i => <IncidentCard key={i.id} incident={i} />)
      ) : (
        <p className="text-muted text-small">{emptyMessage}</p>
      )}
      {incidents.length > 5 && (
        <p className="text-small text-muted" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          + {incidents.length - 5} more
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [selectedWard, setSelectedWard] = useState('Ward-A');
  const [stats, setStats] = useState(null);
  const [pendingIncidents, setPendingIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    <div className="container" style={{ padding: '1.5rem 1.5rem' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <select
          className="ward-select"
          value={selectedWard}
          onChange={e => setSelectedWard(e.target.value)}
          style={{ width: 'auto', minWidth: '220px' }}
        >
          {wards.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="flex flex-center" style={{ padding: '3rem' }}>
          <div className="spinner"></div>
        </div>
      )}

      {!loading && stats && (
        <>
          {stats.total_incidents === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <h2 style={{ marginBottom: '0.5rem' }}>No incidents reported here yet</h2>
              <p className="text-muted">Select another ward or submit a report to see data.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
                <StatCard title="Total Incidents" value={stats.total_incidents} icon="W" color="primary" />
                <StatCard title="Resolved" value={stats.resolved_count} icon="R" color="success" />
                <StatCard title="Resolution Rate" value={stats.resolution_rate_percent + '%'} icon="%" color={stats.resolution_rate_percent >= 80 ? 'success' : 'warning'} />
                <StatCard title="Avg Response" value={stats.avg_response_time_hours + 'h'} icon="T" color="accent" />
              </div>

              <StatusChart data={stats.by_status} />

              <PendingSection
                title="Pending Incidents"
                incidents={stats.pending_incidents_list}
                emptyMessage="No pending incidents in this ward."
                isEscalated={false}
              />

              <PendingSection
                title="Long-Standing Issues"
                incidents={pendingIncidents}
                emptyMessage="No long-standing issues."
                isEscalated={true}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}