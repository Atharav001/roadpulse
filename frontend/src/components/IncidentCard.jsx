import React from 'react';
import { useNavigate } from 'react-router-dom';

const statusBadges = {
  reported: 'badge-reported',
  routed: 'badge-routed',
  in_progress: 'badge-in_progress',
  resolved: 'badge-resolved',
};

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function IncidentCard({ incident }) {
  const navigate = useNavigate();
  if (!incident) return null;

  return (
    <div
      className="list-row"
      onClick={() => navigate(`/incident/${incident.id || incident.incident_id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/incident/${incident.id || incident.incident_id}`);
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="list-title">
          {(incident.issue_type || 'unclassified').replace(/_/g, ' ')}
          <span className={`severity-${incident.severity || 'medium'}`} style={{ marginLeft: 8, fontSize: '0.8rem' }}>
            {incident.severity || '—'}
          </span>
        </div>
        <p className="text-small text-muted" style={{ margin: '4px 0 0' }}>
          {incident.landmark_description || 'Unknown location'}
        </p>
        <p className="text-small text-muted" style={{ margin: '4px 0 0' }}>
          {incident.report_count || 1} report{(incident.report_count || 1) !== 1 ? 's' : ''} ·{' '}
          {formatDate(incident.first_reported_at || incident.created_at)}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        {incident.status && (
          <span className={`badge ${statusBadges[incident.status] || 'badge-reported'}`}>
            {incident.status.replace(/_/g, ' ')}
          </span>
        )}
        {incident.is_escalated && <span className="badge badge-escalated">Escalated</span>}
      </div>
    </div>
  );
}
