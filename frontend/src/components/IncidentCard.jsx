import React from 'react';
import { useNavigate } from 'react-router-dom';

const severityColors = {
  low: 'var(--success)',
  medium: 'var(--warning)',
  high: 'var(--danger)',
  critical: '#7c2d12',
};

const statusBadges = {
  reported: 'badge-reported',
  routed: 'badge-routed',
  in_progress: 'badge-in_progress',
  resolved: 'badge-resolved',
};

function formatDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function IncidentCard({ incident }) {
  const navigate = useNavigate();

  return (
    <div
      className="card"
      onClick={() => navigate('/incident/' + incident.id)}
      style={{ cursor: 'pointer', marginBottom: '0.75rem', padding: '1.25rem' }}
    >
      <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {incident.issue_type?.replace(/_/g, ' ') || 'Unclassified'}
            <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: severityColors[incident.severity] || 'var(--text-muted)' }}>
              {incident.severity}
            </span>
          </h3>
        </div>
        <span className={'badge ' + (statusBadges[incident.status] || 'badge-reported')}>
          {incident.status?.replace(/_/g, ' ')}
        </span>
      </div>

      <p className="text-small text-muted" style={{ margin: '0.25rem 0' }}>
        {incident.landmark_description || 'Unknown location'}
      </p>

      <div className="flex gap-4" style={{ marginTop: '0.5rem' }}>
        <span className="text-small text-muted">Reports: {incident.report_count || 1}</span>
        <span className="text-small text-muted">{formatDate(incident.first_reported_at || incident.created_at)}</span>
      </div>
    </div>
  );
}