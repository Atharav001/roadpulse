import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, incidentsAPI } from '../api/client';
import { useI18n } from '../i18n';

const DEPT_NAMES = {
  'municipal-roads': 'Municipal Road Dept',
  'drainage-dept': 'Drainage Dept',
  'traffic-police': 'Traffic Police',
};

export default function AuthorityQueue() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const user = getCurrentUser();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(null);
  const [filter, setFilter] = useState('open');

  useEffect(() => {
    if (!user?.user_id) {
      navigate('/login');
      return;
    }
    if (user.role !== 'authority') {
      navigate('/');
      return;
    }
    fetchIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id, user?.role, user?.department, filter]);

  const fetchIncidents = async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (user.department) filters.department = user.department;
      if (filter !== 'open' && filter !== 'all') filters.status = filter;
      const response = await incidentsAPI.list(filters);
      let list = response.incidents || [];
      if (filter === 'open') list = list.filter((i) => i.status !== 'resolved');
      setIncidents(list);
    } catch (err) {
      setError(err.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (incidentId) => {
    setResolving(incidentId);
    try {
      await incidentsAPI.updateStatus(incidentId, 'resolved');
      setIncidents((prev) => prev.filter((i) => i.id !== incidentId));
    } catch (err) {
      setError(err.message || 'Failed to resolve incident');
    } finally {
      setResolving(null);
    }
  };

  if (!user || user.role !== 'authority') return null;

  return (
    <div className="container page animate-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">{t('auth_authority')}</p>
          <h1>{t('authority_title')}</h1>
          <p className="text-small text-muted" style={{ margin: 0 }}>
            {user.email} · {DEPT_NAMES[user.department] || user.department || t('authority_sub')}
          </p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
          <option value="open">Open</option>
          <option value="reported">Reported</option>
          <option value="routed">Routed</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="panel" style={{ marginBottom: 16, borderLeft: '3px solid var(--primary)' }}>
        <div className="flex justify-between items-center">
          <span className="text-small text-muted">Pending in view</span>
          <span className="badge badge-routed">{incidents.filter((i) => i.status !== 'resolved').length}</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="flex flex-center" style={{ padding: 48 }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && incidents.length === 0 && (
        <div className="empty-state">
          <h3>Queue clear</h3>
          <p className="text-muted">No incidents match this filter for your department.</p>
        </div>
      )}

      {!loading &&
        incidents.map((incident) => (
          <div key={incident.id} className="panel" style={{ marginBottom: 12 }}>
            <div className="flex justify-between items-start gap-2" style={{ flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, textTransform: 'capitalize' }}>
                  {(incident.issue_type || 'unclassified').replace(/_/g, ' ')}
                  <span className={`severity-${incident.severity}`} style={{ marginLeft: 8, fontSize: '0.85rem' }}>
                    {incident.severity}
                  </span>
                </h3>
                <p className="text-small text-muted" style={{ margin: '6px 0 0' }}>
                  {incident.landmark_description}
                </p>
                <p className="text-small text-muted" style={{ margin: '4px 0 0' }}>
                  {incident.report_count || 1} reports · {incident.ward_id || 'unknown ward'}
                  {incident.is_escalated ? ' · escalated' : ''}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" className="btn btn-secondary btn-small" onClick={() => navigate(`/incident/${incident.id}`)}>
                  View
                </button>
                {incident.status !== 'resolved' && (
                  <button
                    type="button"
                    className="btn btn-success btn-small"
                    disabled={resolving === incident.id}
                    onClick={() => handleResolve(incident.id)}
                  >
                    {resolving === incident.id ? '…' : 'Resolve'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
