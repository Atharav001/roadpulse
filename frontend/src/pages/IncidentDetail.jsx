import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApiBaseUrl, getCurrentUser, incidentsAPI } from '../api/client';

const DEPT_NAMES = {
  'municipal-roads': 'Municipal Road Dept',
  'drainage-dept': 'Drainage Dept',
  'traffic-police': 'Traffic Police',
};

const VALID_STATUSES = ['reported', 'routed', 'in_progress', 'resolved'];
const STATUS_BADGES = {
  reported: 'badge-reported',
  routed: 'badge-routed',
  in_progress: 'badge-in_progress',
  resolved: 'badge-resolved',
};

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function resolvePhotoUrl(url) {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads/')) return `${getApiBaseUrl()}${url}`;
  return url;
}

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  useEffect(() => {
    fetchIncident();
  }, [id]);

  const fetchIncident = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await incidentsAPI.getById(id);
      setIncident(r);
      if (r.draft_email) {
        setEmailSubject(r.draft_email.subject);
        setEmailBody(r.draft_email.body);
      }
    } catch (err) {
      setError(err.message || 'Failed to load incident');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await incidentsAPI.updateStatus(id, newStatus);
      await fetchIncident();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="container page">
        <div className="flex flex-center" style={{ padding: 48 }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error && !incident) {
    return (
      <div className="container page">
        <div className="alert alert-error">{error}</div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to dashboard
        </button>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="container page">
        <div className="empty-state">
          <h3>Incident not found</h3>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const canEditStatus = user?.role === 'authority';
  const currentIdx = VALID_STATUSES.indexOf(incident.status);
  const nextStatus = currentIdx >= 0 && currentIdx < VALID_STATUSES.length - 1 ? VALID_STATUSES[currentIdx + 1] : null;

  return (
    <div className="container page">
      <button type="button" className="btn btn-secondary btn-small" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        Back
      </button>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="flex justify-between items-start gap-2" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <div className="page-kicker">Incident</div>
            <h1 style={{ margin: 0, textTransform: 'capitalize', fontSize: '1.5rem' }}>
              {(incident.issue_type || 'unclassified').replace(/_/g, ' ')}
              <span className={`severity-${incident.severity}`} style={{ marginLeft: 10, fontSize: '1rem' }}>
                {incident.severity}
              </span>
            </h1>
            <p className="text-muted text-small" style={{ marginTop: 8 }}>
              {incident.landmark_description}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge ${STATUS_BADGES[incident.status] || 'badge-reported'}`}>
              {(incident.status || '').replace(/_/g, ' ')}
            </span>
            {incident.is_escalated && (
              <div className="badge badge-escalated" style={{ display: 'block', marginTop: 8 }}>
                Pending {incident.days_pending} days
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-2" style={{ marginBottom: 16 }}>
          <div className="panel-quiet">
            <div className="stat-label">First reported</div>
            <div className="font-semibold text-small">{formatDate(incident.first_reported_at)}</div>
          </div>
          <div className="panel-quiet">
            <div className="stat-label">Department</div>
            <div className="font-semibold text-small">
              {DEPT_NAMES[incident.department] || incident.department || 'Unassigned'}
            </div>
          </div>
          <div className="panel-quiet">
            <div className="stat-label">Ward</div>
            <div className="font-semibold text-small">{incident.ward_id || 'unknown'}</div>
          </div>
          <div className="panel-quiet">
            <div className="stat-label">Merged reports</div>
            <div className="font-semibold text-small">{incident.report_count || incident.linked_reports?.length || 1}</div>
          </div>
        </div>

        {canEditStatus && nextStatus && (
          <button type="button" className="btn btn-primary btn-block" onClick={() => handleStatusUpdate(nextStatus)}>
            Mark as {nextStatus.replace(/_/g, ' ')}
          </button>
        )}
      </div>

      {incident.linked_reports?.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Merged reports ({incident.linked_reports.length})</h3>
          {incident.linked_reports.map((report, i) => (
            <div
              key={report.id}
              style={{
                padding: '16px 0',
                borderBottom: i < incident.linked_reports.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <p className="text-small text-muted font-semibold">Report {report.id.slice(0, 8)}</p>
              {report.text && <p style={{ fontSize: '0.9rem' }}>{report.text}</p>}
              {report.photos?.length > 0 && (
                <div className="image-gallery" style={{ marginTop: 8 }}>
                  {report.photos.map((photo, idx) => {
                    const src = resolvePhotoUrl(photo.url);
                    return src ? (
                      <div key={idx} className="photo-thumb-wrap">
                        <img src={src} alt={photo.label || `Photo ${idx + 1}`} className="image-thumbnail" />
                        {photo.label && <span className="photo-label">{photo.label}</span>}
                      </div>
                    ) : null;
                  })}
                </div>
              )}
              <p className="text-small text-muted" style={{ marginTop: 8 }}>
                {formatDate(report.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      {(incident.draft_email || emailSubject) && (
        <div className="panel" style={{ borderLeft: '3px solid var(--primary)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Draft complaint email</h3>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setEditingEmail((v) => !v)}>
              {editingEmail ? 'Done' : 'Edit'}
            </button>
          </div>
          <div className="form-group">
            <label>Subject</label>
            {editingEmail ? (
              <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            ) : (
              <p className="font-semibold" style={{ margin: 0 }}>
                {emailSubject}
              </p>
            )}
          </div>
          <div className="form-group">
            <label>Body</label>
            {editingEmail ? (
              <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={10} />
            ) : (
              <div className="email-box">{emailBody}</div>
            )}
          </div>
          <button type="button" className="btn btn-primary btn-small" onClick={handleCopyEmail}>
            {emailCopied ? 'Copied' : 'Copy email'}
          </button>
        </div>
      )}
    </div>
  );
}
