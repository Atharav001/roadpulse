import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CameraCapture from '../components/CameraCapture';
import { reportsAPI, getCurrentUser } from '../api/client';

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
  const [draftEmail, setDraftEmail] = useState(null);
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
    } catch (err) {
      setLandmark(`Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setLandmarkLoading(false);
    }
  }, []);

  const handlePhotosCapture = (data) => {
    if (data.latitude == null || data.longitude == null) {
      setError('GPS location is required. Please enable location access and retake your photos.');
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
    if (step === 2 && latitude && longitude) {
      fetchLandmark(latitude, longitude);
    }
  }, [step, latitude, longitude, fetchLandmark]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!user) {
        setError('You must be logged in to submit a report');
        setLoading(false);
        return;
      }

      const reportData = {
        photos: photos.map(p => ({
          previewUrl: p.previewUrl,
          timestamp: p.timestamp,
        })),
        latitude,
        longitude,
        timestamp,
        text: description || '',
        user_id: user.user_id,
        landmark_description: landmark || '',
      };

      const response = await reportsAPI.submit(reportData);
      setDraftEmail(response.draft_email);
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
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="alert alert-error">
          Please <a href="/login">sign in</a> to submit a report.
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Report a Road Issue</h1>

      {step === 1 && (
        <div className="card">
          <p>Help us improve our roads by reporting issues. Take two photos of the problem area.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <CameraCapture onCapture={handlePhotosCapture} maxPhotos={2} />
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2>Describe the Issue</h2>
          {error && <div className="alert alert-error">{error}</div>}

          <form>
            <div className="form-group">
              <label htmlFor="description">Issue Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the road issue (e.g., large pothole, broken streetlight)"
                rows="4"
              />
            </div>

            <div className="form-group">
              <label htmlFor="landmark">
                Location/Landmark
                {landmarkLoading && <span className="text-small text-muted"> (detecting...)</span>}
              </label>
              <input
                id="landmark"
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Auto-detected from GPS..."
                style={{ borderColor: landmark && !landmarkLoading ? '#22c55e' : undefined }}
              />
              <p className="text-small text-muted">
                Auto-detected from your location. Edit if needed.
              </p>
            </div>

            {latitude && longitude && (
              <p className="text-small text-muted">
                GPS: {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </p>
            )}

            <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                &larr; Back
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(3)}
                disabled={landmarkLoading}>
                Next &rarr;
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h2>Review & Submit</h2>
          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ marginBottom: '1.5rem' }}>
            <h3>Photos ({photos.length})</h3>
            <div className="image-gallery">
              {photos.map((photo, index) => (
                <img key={index} src={photo.previewUrl} alt={`Photo ${index + 1}`} className="image-thumbnail" />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3>Details</h3>
            <p><strong>Description:</strong> {description || 'No description'}</p>
            <p><strong>Location:</strong> {landmark || 'No location specified'}</p>
            {latitude && longitude && (
              <p><strong>GPS:</strong> {latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
              &larr; Back
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && successIncidentId && (
        <div className="card">
          <div className="alert alert-success">
            <h2 style={{ margin: '0 0 1rem 0' }}>Report Submitted Successfully!</h2>
            <p>Thank you for helping improve our roads.</p>
            <p><strong>Incident ID:</strong> {successIncidentId}</p>
          </div>

          {draftEmail && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3>Email Complaint (for your records)</h3>
              <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
                <p><strong>Subject:</strong> {draftEmail.subject}</p>
                <p style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>{draftEmail.body}</p>
              </div>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => {
                const text = `Subject: ${draftEmail.subject}\n\n${draftEmail.body}`;
                navigator.clipboard.writeText(text);
                alert('Email copied to clipboard!');
              }}>
                Copy Email
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" className="btn btn-primary" onClick={() => navigate(`/incident/${successIncidentId}`)}>
              View on Dashboard
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/my-reports')}>
              My Reports
            </button>
          </div>
        </div>
      )}
    </div>
  );
}