import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function IncidentCard({ incident }) {
  const navigate = useNavigate();

  const severityColor = {
    low: '#16a34a',
    medium: '#eab308',
    high: '#dc2626',
    critical: '#7c2d12',
  };

  const statusBadgeClass = {
    reported: 'badge-reported',
    routed: 'badge-routed',
    in_progress: 'badge-in_progress',
    resolved: 'badge-resolved',
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="card list-item"
      onClick={() => navigate(`/incident/${incident.id}`)}
      style={{ cursor: 'pointer', marginBottom: '1rem' }}
    >
      <div className="flex justify-between" style={{ marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, flex: 1 }}>
          {incident.issue_type}
          <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: severityColor[incident.severity] }}>
            ({incident.severity})
          </span>
        </h3>
        <span className={`badge ${statusBadgeClass[incident.status]}`}>
          {incident.status}
        </span>
      </div>

      <p className="text-small text-muted" style={{ margin: '0.5rem 0' }}>
        📍 {incident.landmark_description || 'Unknown location'}
      </p>

      <p className="text-small text-muted" style={{ margin: '0.5rem 0' }}>
        Reports: {incident.report_count || 1}
      </p>

      <p className="text-small text-muted" style={{ margin: '0.5rem 0' }}>
        🕒 {formatDate(incident.first_reported_at || incident.created_at)}
      </p>
    </div>
  );
}
