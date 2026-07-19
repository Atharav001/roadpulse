import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { incidentsAPI } from '../api/client';

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emailCopied, setEmailCopied] = useState(false);

  useEffect(() => {
    fetchIncident();
  }, [id]);

  const fetchIncident = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await incidentsAPI.getById(id);
      setIncident(response);
    } catch (err) {
      setError(err.message || 'Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = () => {
    if (incident && incident.draft_email) {
      const text = `Subject: ${incident.draft_email.subject}\n\n${incident.draft_email.body}`;
      navigator.clipboard.writeText(text);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

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

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="flex flex-center" style={{ padding: '2rem' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="alert alert-error">Incident not found</div>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <button
        className="btn btn-secondary btn-small"
        onClick={() => navigate(-1)}
        style={{ marginBottom: '1rem' }}
      >
        ← Back
      </button>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="flex justify-between" style={{ marginBottom: '1rem', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0' }}>
              {incident.issue_type}
              <span style={{ marginLeft: '1rem', fontSize: '1.25rem', color: severityColor[incident.severity] }}>
                ({incident.severity})
              </span>
            </h1>
            <p className="text-muted">📍 {incident.landmark_description}</p>
          </div>
          <span className={`badge ${statusBadgeClass[incident.status]}`}>
            {incident.status}
          </span>
        </div>

        <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
          <div>
            <p className="text-small text-muted">Reported</p>
            <p className="font-bold">{formatDate(incident.first_reported_at || incident.created_at)}</p>
          </div>
          <div>
            <p className="text-small text-muted">Last Updated</p>
            <p className="font-bold">{formatDate(incident.updated_at)}</p>
          </div>
          <div>
            <p className="text-small text-muted">Department</p>
            <p className="font-bold">{incident.department || 'Unassigned'}</p>
          </div>
          <div>
            <p className="text-small text-muted">Ward</p>
            <p className="font-bold">{incident.ward_id}</p>
          </div>
        </div>
      </div>

      {incident.linked_reports && incident.linked_reports.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2>Linked Reports ({incident.report_count || incident.linked_reports.length})</h2>
          {incident.linked_reports.map((report, index) => (
            <div
              key={report.id}
              style={{
                padding: '1rem',
                borderBottom: index < incident.linked_reports.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <p className="text-small text-muted">Report #{report.id}</p>
              {report.text && <p>{report.text}</p>}
              {report.photos && report.photos.length > 0 && (
                <div className="image-gallery" style={{ marginTop: '0.5rem' }}>
                  {report.photos.map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo.url}
                      alt={`Report photo ${idx + 1}`}
                      className="image-thumbnail"
                    />
                  ))}
                </div>
              )}
              <p className="text-small text-muted" style={{ marginTop: '0.5rem' }}>
                {formatDate(report.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      {incident.draft_email && (
        <div className="card alert alert-info" style={{ background: '#dbeafe' }}>
          <h2>Draft Complaint Email</h2>
          <div style={{ marginBottom: '1rem' }}>
            <p className="text-small text-muted">Subject</p>
            <p className="font-bold">{incident.draft_email.subject}</p>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <p className="text-small text-muted">Message</p>
            <p style={{ whiteSpace: 'pre-wrap', background: 'white', padding: '1rem', borderRadius: '0.375rem' }}>
              {incident.draft_email.body}
            </p>
          </div>
          <button
            className="btn btn-primary btn-small"
            onClick={handleCopyEmail}
          >
            {emailCopied ? '✓ Copied!' : '📋 Copy Email'}
          </button>
        </div>
      )}
    </div>
  );
}
