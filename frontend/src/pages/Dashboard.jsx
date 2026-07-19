import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import IncidentCard from '../components/IncidentCard';
import { dashboardAPI, wardsAPI } from '../api/client';

const STATUS_COLORS = {
  reported: 'var(--chart-2)',
  routed: 'var(--chart-1)',
  in_progress: 'var(--chart-3)',
  resolved: 'var(--chart-4)',
};

function StatusChart({ data }) {
  if (!data?.length) {
    return <p className="text-muted text-small">No status data for this ward yet.</p>;
  }
  const maxCount = Math.max(...data.map((s) => s.count), 1);

  return (
    <div className="bar-chart">
      {data.map((s) => {
        const height = Math.max((s.count / maxCount) * 140, 4);
        return (
          <div key={s.status} className="bar-col">
            <span className="bar-value">{s.count}</span>
            <div
              className="bar-fill"
              style={{ height, background: STATUS_COLORS[s.status] || 'var(--text-muted)' }}
            />
            <span className="bar-label">{s.status.replace(/_/g, ' ')}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [stats, setStats] = useState(null);
  const [escalated, setEscalated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await wardsAPI.list();
        const list = res.wards || [];
        if (!cancelled) {
          setWards(list);
          if (list.length) setSelectedWard(list[0].id);
        }
      } catch {
        if (!cancelled) {
          setWards([
            { id: 'Ward-A', name: 'Tiger Circle & MIT Campus, Manipal' },
            { id: 'Ward-B', name: 'End Point Road, Manipal' },
            { id: 'Ward-C', name: 'KMC Hospital & Madhav Nagar, Manipal' },
            { id: 'Ward-D', name: 'Udupi-Manipal Highway (NH-169A)' },
            { id: 'Ward-E', name: 'Malpe Beach Road, Udupi' },
          ]);
          setSelectedWard('Ward-A');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedWard) return;
    fetchDashboardData();
  }, [selectedWard]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsResponse, pendingResponse] = await Promise.all([
        dashboardAPI.getWardStats(selectedWard),
        dashboardAPI.getPendingIncidents(60),
      ]);
      setStats(statsResponse);
      const wardEscalated = (pendingResponse.pending_incidents || []).filter(
        (i) => i.ward_id === selectedWard
      );
      setEscalated(wardEscalated);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <div className="page-kicker">Public accountability</div>
          <h1>Ward performance</h1>
          <p className="text-muted text-small" style={{ margin: 0 }}>
            Resolution rates, pending queue, and escalated issues by ward.
          </p>
        </div>
        <select
          className="ward-select"
          value={selectedWard}
          onChange={(e) => setSelectedWard(e.target.value)}
          aria-label="Select ward"
        >
          {wards.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button type="button" className="btn btn-secondary btn-small" style={{ marginLeft: 12 }} onClick={fetchDashboardData}>
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-center" style={{ padding: 48 }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && stats && stats.total_incidents === 0 && (
        <div className="empty-state">
          <h3>No incidents in this ward yet</h3>
          <p className="text-muted">Select another ward, or submit a report to populate the dashboard.</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/report')}>
            Report an issue
          </button>
        </div>
      )}

      {!loading && stats && stats.total_incidents > 0 && (
        <>
          <div className="stat-grid">
            <StatCard title="Total incidents" value={stats.total_incidents} hint={stats.ward_name || selectedWard} />
            <StatCard title="Resolved" value={stats.resolved_count} tone="success" hint="Closed by authority" />
            <StatCard
              title="Resolution rate"
              value={`${stats.resolution_rate_percent}%`}
              tone={stats.resolution_rate_percent >= 70 ? 'success' : 'warning'}
              hint="Resolved / total"
            />
            <StatCard
              title="Avg response"
              value={`${stats.avg_response_time_hours}h`}
              tone="muted"
              hint="Time to resolve"
            />
          </div>

          <div className="dash-layout">
            <div className="panel chart-panel">
              <h3>Status breakdown</h3>
              <StatusChart data={stats.by_status} />
              {stats.by_issue_type?.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h3>Open by issue type</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                    {stats.by_issue_type.map((row) => (
                      <div key={row.issue_type} className="flex justify-between items-center">
                        <span className="text-small" style={{ textTransform: 'capitalize' }}>
                          {row.issue_type.replace(/_/g, ' ')}
                        </span>
                        <span className="font-bold text-small">{row.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="panel">
              <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Pending queue</h3>
                <span className="badge badge-reported">{stats.pending_incidents_list?.length || 0}</span>
              </div>
              {!stats.pending_incidents_list?.length ? (
                <p className="text-muted text-small">No open incidents in this ward.</p>
              ) : (
                stats.pending_incidents_list.slice(0, 6).map((i) => (
                  <IncidentCard key={i.id} incident={i} />
                ))
              )}
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16, borderLeft: '3px solid var(--accent)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
              <div>
                <h3 style={{ margin: 0 }}>Escalated (60+ days)</h3>
                <p className="text-small text-muted" style={{ margin: '4px 0 0' }}>
                  Long-standing open issues that need attention.
                </p>
              </div>
              <span className="badge badge-escalated">{escalated.length}</span>
            </div>
            {escalated.length === 0 ? (
              <p className="text-muted text-small">No escalated incidents in this ward.</p>
            ) : (
              escalated.map((i) => <IncidentCard key={i.id} incident={i} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}
