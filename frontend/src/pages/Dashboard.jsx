import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import IncidentCard from '../components/IncidentCard';
import { ResolutionRing, SegmentPool } from '../components/PoolChart';
import { IconAlert, IconChart } from '../components/Icons';
import { dashboardAPI, wardsAPI } from '../api/client';

const STATUS_COLORS = {
  reported: '#C45C26',
  routed: '#1E4A7A',
  in_progress: '#5B7C99',
  resolved: '#2F6B4F',
};

const SEVERITY_COLORS = {
  critical: '#9B3B2E',
  high: '#C45C26',
  medium: '#A67C00',
  low: '#2F6B4F',
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'pending', label: 'Pending pool' },
  { id: 'escalated', label: 'Escalated' },
];

function StatusBars({ data }) {
  if (!data?.length) return <p className="text-muted text-small">No status data yet.</p>;
  const max = Math.max(...data.map((s) => s.count), 1);
  return (
    <div className="bar-chart">
      {data.map((s) => (
        <div key={s.status} className="bar-col">
          <span className="bar-value">{s.count}</span>
          <div
            className="bar-fill"
            style={{
              height: Math.max((s.count / max) * 140, 4),
              background: STATUS_COLORS[s.status] || 'var(--text-muted)',
            }}
          />
          <span className="bar-label">{s.status.replace(/_/g, ' ')}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [overview, setOverview] = useState(null);
  const [escalated, setEscalated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [wardRes, overviewRes] = await Promise.all([
          wardsAPI.list(),
          dashboardAPI.getOverview().catch(() => null),
        ]);
        if (cancelled) return;
        const list = wardRes.wards || [];
        setWards(list);
        setOverview(overviewRes);
        if (list.length) setSelectedWard(list[0].id);
      } catch {
        if (!cancelled) {
          const fallback = [
            { id: 'Ward-A', name: 'Tiger Circle & MIT Campus, Manipal' },
            { id: 'Ward-B', name: 'End Point Road, Manipal' },
            { id: 'Ward-C', name: 'KMC Hospital & Madhav Nagar, Manipal' },
            { id: 'Ward-D', name: 'Udupi-Manipal Highway (NH-169A)' },
            { id: 'Ward-E', name: 'Malpe Beach Road, Udupi' },
          ];
          setWards(fallback);
          setSelectedWard('Ward-A');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedWard) return;
    loadWard();
  }, [selectedWard]);

  const loadWard = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsResponse, pendingResponse] = await Promise.all([
        dashboardAPI.getWardStats(selectedWard),
        dashboardAPI.getPendingIncidents(60),
      ]);
      setStats(statsResponse);
      setEscalated((pendingResponse.pending_incidents || []).filter((i) => i.ward_id === selectedWard));
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const pending = stats?.pending_incidents_list || [];

  const statusSegments = useMemo(() => {
    const rows = stats?.by_status || [];
    return ['reported', 'routed', 'in_progress', 'resolved'].map((id) => ({
      id,
      label: id.replace(/_/g, ' '),
      value: rows.find((r) => r.status === id)?.count || 0,
      color: STATUS_COLORS[id],
    }));
  }, [stats]);

  const typeSegments = useMemo(() => {
    const palette = ['#1E4A7A', '#C45C26', '#2F6B4F', '#5B7C99', '#A67C00', '#6B7785'];
    return (stats?.by_issue_type || []).map((row, i) => ({
      id: row.issue_type,
      label: row.issue_type.replace(/_/g, ' '),
      value: row.count,
      color: palette[i % palette.length],
    }));
  }, [stats]);

  const severitySegments = useMemo(() => {
    const pool = {};
    pending.forEach((i) => {
      const key = i.severity || 'medium';
      pool[key] = (pool[key] || 0) + 1;
    });
    return Object.keys(SEVERITY_COLORS).map((id) => ({
      id,
      label: id,
      value: pool[id] || 0,
      color: SEVERITY_COLORS[id],
    }));
  }, [pending]);

  return (
    <div className="dash-shell grid-bg animate-in">
      <div className="container">
        <div className="dash-top">
          <div>
            <p className="eyebrow">Transparency console</p>
            <h1>Ward intelligence</h1>
            <p className="text-muted text-small" style={{ margin: 0 }}>
              Pooled issue representation · resolution performance · public escalation watch.
            </p>
          </div>
          <div className="dash-controls">
            <select
              id="ward"
              className="ward-select"
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              aria-label="Select ward"
            >
              {wards.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <button type="button" className="btn btn-accent" onClick={() => navigate('/report')}>
              Report issue
            </button>
          </div>
        </div>

        {overview && (
          <div className="city-strip">
            <div><span>City open</span><strong>{overview.open_count}</strong></div>
            <div><span>City resolved</span><strong>{overview.resolved_count}</strong></div>
            <div><span>Resolution rate</span><strong>{overview.resolution_rate_percent}%</strong></div>
            <div><span>Total incidents</span><strong>{overview.total_incidents}</strong></div>
          </div>
        )}

        <div className="dash-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'pending' && <em>{pending.length}</em>}
              {t.id === 'escalated' && <em>{escalated.length}</em>}
            </button>
          ))}
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
            <button type="button" className="btn btn-secondary btn-small" style={{ marginLeft: 12 }} onClick={loadWard}>
              Retry
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-center" style={{ padding: 56 }}>
            <div className="spinner" />
          </div>
        )}

        {!loading && stats && stats.total_incidents === 0 && (
          <div className="empty-state">
            <IconChart />
            <h3>No incidents in this ward yet</h3>
            <p className="text-muted">Choose another ward or file the first report.</p>
            <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/report')}>
              Report an issue
            </button>
          </div>
        )}

        {!loading && stats && stats.total_incidents > 0 && tab === 'overview' && (
          <>
            <div className="stat-grid">
              <StatCard title="Incidents" value={stats.total_incidents} hint={stats.ward_name || selectedWard} />
              <StatCard title="Resolved" value={stats.resolved_count} tone="success" hint="Closed by authority" />
              <StatCard
                title="Resolution rate"
                value={`${stats.resolution_rate_percent}%`}
                tone={stats.resolution_rate_percent >= 70 ? 'success' : 'warning'}
                hint="Resolved / total"
              />
              <StatCard title="Avg response" value={`${stats.avg_response_time_hours}h`} tone="muted" hint="Time to resolve" />
            </div>

            <div className="analytics-grid">
              <div className="panel analytics-hero">
                <div className="panel-head">
                  <h3>Resolution health</h3>
                </div>
                <div className="ring-row">
                  <ResolutionRing percent={stats.resolution_rate_percent} label="Resolved" />
                  <div className="ring-meta">
                    <p><strong>{stats.open_count}</strong> still open</p>
                    <p><strong>{stats.resolved_count}</strong> closed</p>
                    <p className="text-muted text-small">
                      Ward performance is public — rates update when authorities resolve incidents.
                    </p>
                  </div>
                </div>
              </div>

              <div className="panel">
                <SegmentPool title="Issue status pool" segments={statusSegments} />
              </div>

              <div className="panel">
                <SegmentPool title="Open issues by type" segments={typeSegments} emptyLabel="No open issue types." />
              </div>

              <div className="panel">
                <div className="panel-head"><h3>Status volume</h3></div>
                <StatusBars data={stats.by_status} />
              </div>
            </div>
          </>
        )}

        {!loading && stats && tab === 'pending' && (
          <div className="dash-layout">
            <div className="panel">
              <div className="panel-head">
                <h3>Pending severity pool</h3>
                <span className="badge badge-reported">{pending.length}</span>
              </div>
              <SegmentPool segments={severitySegments} emptyLabel="No open incidents in this ward." />
            </div>
            <div className="panel">
              <div className="panel-head">
                <h3>Open queue</h3>
              </div>
              {!pending.length ? (
                <div className="empty-inline">Queue clear for this ward.</div>
              ) : (
                pending.map((i) => <IncidentCard key={i.id} incident={i} />)
              )}
            </div>
          </div>
        )}

        {!loading && stats && tab === 'escalated' && (
          <div className="panel accent-edge">
            <div className="panel-head">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconAlert /> Escalated · 60+ days open
                </h3>
                <p className="text-small text-muted" style={{ margin: '6px 0 0' }}>
                  Long-standing issues flagged for public attention.
                </p>
              </div>
              <span className="badge badge-escalated">{escalated.length}</span>
            </div>
            {!escalated.length ? (
              <div className="empty-inline">No escalated incidents in this ward.</div>
            ) : (
              escalated.map((i) => <IncidentCard key={i.id} incident={i} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
