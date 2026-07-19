import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CameraCapture from '../components/CameraCapture';
import { getCurrentUser, reportsAPI } from '../api/client';

export default function ReportForm() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [description, setDescription] = useState('');
  const [landmark, setLandmark] = useState('');
  const [wardId, setWardId] = useState('');
  const [draftEmail, setDraftEmail] = useState(null);
  const [submitMeta, setSubmitMeta] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [landmarkLoading, setLandmarkLoading] = useState(false);
  const [successIncidentId, setSuccessIncidentId] = useState(null);

  const fetchLandmark = useCallback(async (lat, lng) => {
    if (lat == null || lng == null) return;
    setLandmarkLoading(true);
    try {
      const result = await reportsAPI.previewLandmark(lat, lng);
      setLandmark(result.landmark_description || '');
      setWardId(result.ward_id || '');
    } catch {
      setLandmark(`Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setLandmarkLoading(false);
    }
  }, []);

  const handlePhotosCapture = (data) => {
    if (data.latitude == null || data.longitude == null) {
      setError('GPS location is required. Enable location access and retake your photos.');
      return;
    }
    setPhotos(data.photos);
    setLatitude(data.latitude);
    setLongitude(data.longitude);
    setTimestamp(data.timestamp);
    setError('');
    setStep(2);
  };

  useEffect(() => {
    if (step === 2 && latitude != null && longitude != null) {
      fetchLandmark(latitude, longitude);
    }
  }, [step, latitude, longitude, fetchLandmark]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!user) {
        setError('You must be signed in to submit a report');
        return;
      }

      const reportData = {
        photos: photos.map((p) => ({
          data: p.data,
          timestamp: p.timestamp,
          label: p.label,
          mimeType: 'image/jpeg',
        })),
        latitude,
        longitude,
        timestamp,
        captured_at: timestamp,
        text: description || '',
        text_description: description || '',
        user_id: user.user_id,
        landmark_description: landmark || '',
        ward_id: wardId || undefined,
      };

      const response = await reportsAPI.submit(reportData);
      setDraftEmail(response.draft_email);
      setSubmitMeta(response);
      setSuccessIncidentId(response.incident_id);
      setStep(4);
    } catch (err) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container page">
        <div className="alert alert-error">
          Please <a href="/login">sign in</a> to submit a report.
        </div>
      </div>
    );
  }

  return (
    <div className="container page animate-in" style={{ maxWidth: 640 }}>
      <p className="eyebrow">Citizen report</p>
      <h1>Report a road issue</h1>
      <p className="text-muted text-small" style={{ marginBottom: 20 }}>
        Three steps: capture → confirm location → submit.
      </p>

      <div className="stepper">
        <div className={`step-dot ${step > 1 ? 'done' : ''} ${step === 1 ? 'active' : ''}`} />
        <div className={`step-dot ${step > 2 ? 'done' : ''} ${step === 2 ? 'active' : ''}`} />
        <div className={`step-dot ${step > 3 ? 'done' : ''} ${step === 3 ? 'active' : ''}`} />
        <div className={`step-dot ${step === 4 ? 'active' : ''}`} />
      </div>

      {step === 1 && (
        <div className="panel">
          {error && <div className="alert alert-error">{error}</div>}
          <CameraCapture onCapture={handlePhotosCapture} maxPhotos={2} />
        </div>
      )}

      {step === 2 && (
        <div className="panel">
          <h2>Confirm location</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label htmlFor="description">What is the problem? (optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. deep pothole on the right lane"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="landmark">
              Landmark / location
              {landmarkLoading && <span className="text-muted"> · detecting…</span>}
            </label>
            <input
              id="landmark"
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Auto-detected from GPS"
            />
            <p className="text-small text-muted" style={{ marginTop: 8 }}>
              Edit if the landmark is wrong. Ward: {wardId || 'detecting…'}
            </p>
          </div>
          {latitude != null && longitude != null && (
            <p className="text-small text-muted">
              GPS at capture: {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </p>
          )}
          <div className="flex gap-1" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(3)} disabled={landmarkLoading}>
              Review
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="panel">
          <h2>Review & submit</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="image-gallery" style={{ marginBottom: 16 }}>
            {photos.map((photo, index) => (
              <div key={index} className="photo-thumb-wrap">
                <img src={photo.previewUrl} alt={photo.label} className="image-thumbnail" />
                <span className="photo-label">{photo.label}</span>
              </div>
            ))}
          </div>
          <p><strong>Description:</strong> {description || 'None'}</p>
          <p><strong>Location:</strong> {landmark || '—'}</p>
          <p><strong>GPS:</strong> {latitude?.toFixed(5)}, {longitude?.toFixed(5)}</p>
          <div className="flex gap-1" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Running AI pipeline…' : 'Submit report'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && successIncidentId && (
        <div className="panel">
          <div className="alert alert-success">
            Report submitted{submitMeta?.merged ? ' and merged into an existing incident' : ''}.
          </div>
          <p className="text-small text-muted">Incident ID: {successIncidentId}</p>
          {submitMeta && (
            <div className="grid grid-2" style={{ margin: '16px 0' }}>
              <div className="panel-quiet">
                <div className="stat-label">Issue type</div>
                <div className="font-bold" style={{ textTransform: 'capitalize' }}>
                  {(submitMeta.issue_type || '').replace(/_/g, ' ')}
                </div>
              </div>
              <div className="panel-quiet">
                <div className="stat-label">Severity</div>
                <div className="font-bold">{submitMeta.severity}</div>
              </div>
              <div className="panel-quiet">
                <div className="stat-label">Department</div>
                <div className="font-bold">{submitMeta.department || '—'}</div>
              </div>
              <div className="panel-quiet">
                <div className="stat-label">Reports on incident</div>
                <div className="font-bold">{submitMeta.report_count || 1}</div>
              </div>
            </div>
          )}
          {draftEmail && (
            <div style={{ marginBottom: 16 }}>
              <h3>Draft complaint email</h3>
              <p className="font-semibold text-small" style={{ marginBottom: 8 }}>
                {draftEmail.subject}
              </p>
              <div className="email-box">{draftEmail.body}</div>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                style={{ marginTop: 12 }}
                onClick={() => {
                  navigator.clipboard.writeText(`Subject: ${draftEmail.subject}\n\n${draftEmail.body}`);
                }}
              >
                Copy email
              </button>
            </div>
          )}
          <div className="flex gap-1">
            <button type="button" className="btn btn-primary" onClick={() => navigate(`/incident/${successIncidentId}`)}>
              View incident
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/my-reports')}>
              My reports
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
