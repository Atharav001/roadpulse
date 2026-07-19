import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { incidentsAPI, getCurrentUser } from '../api/client';

const DEPT_NAMES = {
  'municipal-roads': 'Municipal Road Dept',
  'drainage-dept': 'Drainage Dept',
  'traffic-police': 'Traffic Police',
};

const VALID_STATUSES = ['reported', 'routed', 'in_progress', 'resolved'];
const STATUS_COLORS = {
  low: 'var(--success)', medium: 'var(--warning)', high: 'var(--danger)', critical: '#7c2d12',
};

const STATUS_BADGES = {
  reported: 'badge-reported', routed: 'badge-routed',
  in_progress: 'badge-in_progress', resolved: 'badge-resolved',
};

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  useEffect(() => { fetchIncident(); }, [id]);

  const fetchIncident = async () => {
    setLoading(true); setError('');
    try {
      const r = await incidentsAPI.getById(id);
      setIncident(r);
      if (r.draft_email) {
        setEmailSubject(r.draft_email.subject);
        setEmailBody(r.draft_email.body);
      }
    } catch (err) {
      setError(err.message || 'Failed to load incident details');
    } finally { setLoading(false); }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('Subject: ' + emailSubject + '\n\n' + emailBody);
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

  if (loading) return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="flex flex-center" style={{ padding: '3rem' }}>
        <div className="spinner"></div>
      </div>
    </div>
  );

  if (error) return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="alert alert-error">{error}</div>
      <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
    </div>
  );

  if (!incident) return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="alert alert-error">Incident not found</div>
      <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
    </div>
  );

  const canEditStatus = user && user.role === 'authority';
  const currentIdx = VALID_STATUSES.indexOf(incident.status);
  const nextStatus = currentIdx < VALID_STATUSES.length - 1 ? VALID_STATUSES[currentIdx + 1] : null;

  return (
    <div className="container" style={{ padding: '1.5rem' }}>
      <button className="btn btn-secondary btn-small" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
        &larr; Back
      </button>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="flex justify-between items-start" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 0.25rem 0' }}>
              {incident.issue_type?.replace(/_/g, ' ') || 'Unclassified'}
              <span style={{ marginLeft: '0.75rem', fontSize: '1rem', color: STATUS_COLORS[incident.severity] || 'var(--text-muted)' }}>
                ({incident.severity})
              </span>
            </h2>
            <p className="text-muted text-small" style={{ margin: 0 }}>{incident.landmark_description}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span className={'badge ' + (STATUS_BADGES[incident.status] || 'badge-reported')}>
              {incident.status?.replace(/_/g, ' ')}
            </span>
            {incident.is_escalated && (
              <div className="badge" style={{ display: 'block', marginTop: '0.5rem', background: 'var(--danger-light)', color: 'var(--danger)' }}>
                Pending {incident.days_pending} days
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-2" style={{ marginBottom: '1.25rem', gap: '1rem' }}>
          <div className="card card-static" style={{ padding: '0.75rem 1rem' }}>
            <p className="text-small text-muted font-semibold" style={{ marginBottom: '0.25rem' }}>Reported</p>
            <p className="font-bold" style={{ margin: 0, fontSize: '0.9rem' }}>{formatDate(incident.first_reported_at || incident.created_at)}</p>
          </div>
          <div className="card card-static" style={{ padding: '0.75rem 1rem' }}>
            <p className="text-small text-muted font-semibold" style={{ marginBottom: '0.25rem' }}>Department</p>
            <p className="font-bold" style={{ margin: 0, fontSize: '0.9rem' }}>{DEPT_NAMES[incident.department] || incident.department || 'Unassigned'}</p>
          </div>
          <div className="card card-static" style={{ padding: '0.75rem 1rem' }}>
            <p className="text-small text-muted font-semibold" style={{ marginBottom: '0.25rem' }}>Last Updated</p>
            <p className="font-bold" style={{ margin: 0, fontSize: '0.9rem' }}>{formatDate(incident.updated_at)}</p>
          </div>
          <div className="card card-static" style={{ padding: '0.75rem 1rem' }}>
            <p className="text-small text-muted font-semibold" style={{ marginBottom: '0.25rem' }}>Ward</p>
            <p className="font-bold" style={{ margin: 0, fontSize: '0.9rem' }}>{incident.ward_id}</p>
          </div>
        </div>

        {canEditStatus && nextStatus && (
          <button className="btn btn-primary" onClick={() => handleStatusUpdate(nextStatus)} style={{ width: '100%' }}>
            Mark as {nextStatus.replace(/_/g, ' ')} &rarr;
          </button>
        )}
      </div>

      {incident.linked_reports && incident.linked_reports.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Linked Reports ({incident.report_count || incident.linked_reports.length})</h3>
          {incident.linked_reports.map((report, i) => (
            <div key={report.id} style={{
              padding: '1rem 0',
              borderBottom: i < incident.linked_reports.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <p className="text-small text-muted font-semibold" style={{ marginBottom: '0.25rem' }}>
                Report #{report.id.slice(0, 8)}
              </p>
              {report.text && <p style={{ fontSize: '0.9rem' }}>{report.text}</p>}
              {report.photos && report.photos.length > 0 && (
                <div className="image-gallery" style={{ marginTop: '0.5rem' }}>
                  {report.photos.map((photo, idx) => (
                    <img key={idx} src={photo.url} alt={'Photo ' + (idx + 1)} className="image-thumbnail" />
                  ))}
                </div>
              )}
              <p className="text-small text-muted" style={{ marginTop: '0.5rem' }}>{formatDate(report.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {incident.draft_email && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--accent)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Draft Complaint Email</h3>
            <button className="btn btn-secondary btn-small" onClick={() => setEditingEmail(!editingEmail)}>
              {editingEmail ? 'Done' : 'Edit'}
            </button>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <p className="text-small text-muted font-semibold" style={{ marginBottom: '0.25rem' }}>Subject</p>
            {editingEmail ? (
              <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
            ) : (
              <p className="font-bold" style={{ margin: 0, fontSize: '0.9rem' }}>{emailSubject}</p>
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p className="text-small text-muted font-semibold" style={{ marginBottom: '0.25rem' }}>Message</p>
            {editingEmail ? (
              <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows="10"
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
            ) : (
              <div style={{
                background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.75rem',
                fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap',
                border: '1px solid var(--border)'
              }}>
                {emailBody}
              </div>
            )}
          </div>

          <button className="btn btn-primary btn-small" onClick={handleCopyEmail}>
            {emailCopied ? 'Copied!' : 'Copy Email'}
          </button>
        </div>
      )}
    </div>
  );
}