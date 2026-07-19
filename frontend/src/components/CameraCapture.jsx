import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from '../LocationContext';

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 4;
const LABELS = ['closeup', 'context', 'angle-3', 'angle-4'];

function stampOntoCanvas(canvas, gps) {
  const ctx = canvas.getContext('2d');
  const stamp = [
    `RoadPulse LIVE`,
    `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`,
    gps.timestamp,
    gps.accuracy != null ? `±${Math.round(gps.accuracy)}m` : '',
  ]
    .filter(Boolean)
    .join('  ·  ');

  const pad = 10;
  ctx.font = 'bold 14px ui-monospace, monospace';
  const width = Math.min(canvas.width - 16, ctx.measureText(stamp).width + pad * 2);
  const height = 28;
  const x = 8;
  const y = canvas.height - height - 8;
  ctx.fillStyle = 'rgba(15, 26, 40, 0.72)';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(stamp, x + pad, y + 18);
}

/**
 * Location must be confirmed BEFORE camera opens.
 * Live camera only (getUserMedia). Min 2 / max 4 photos.
 * Each shutter stamps GPS + timestamp onto the image for credibility.
 */
export default function CameraCapture({ onCapture, minPhotos = MIN_PHOTOS, maxPhotos = MAX_PHOTOS }) {
  const { location, requestLocation, error: locError } = useLocation();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [phase, setPhase] = useState('location'); // location | camera
  const [confirmedLoc, setConfirmedLoc] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [liveReady, setLiveReady] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const refreshLocation = async () => {
    setLocLoading(true);
    setError('');
    try {
      const loc = await requestLocation({ force: true });
      setConfirmedLoc(loc);
    } catch (err) {
      setError(err.message || 'Location required');
    } finally {
      setLocLoading(false);
    }
  };

  useEffect(() => {
    if (phase === 'location' && location && !confirmedLoc) {
      setConfirmedLoc(location);
    }
  }, [phase, location, confirmedLoc]);

  const openCamera = async () => {
    setError('');
    if (!confirmedLoc) {
      setError('Confirm your exact location before opening the camera.');
      return;
    }
    setPhase('camera');
    setLiveReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Live camera is required. Use a modern browser with camera access (gallery uploads are blocked).');
      setPhase('location');
      return;
    }

    try {
      // Re-check location when camera opens
      await requestLocation({ force: true }).catch(() => confirmedLoc);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setLiveReady(true);
      }
    } catch {
      setError('Camera permission denied or unavailable. Live capture is required — gallery is not allowed.');
      setPhase('location');
    }
  };

  const captureFromLive = async () => {
    setError('');
    setBusy(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !liveReady) throw new Error('Camera not ready');

      // Fresh GPS at shutter — critical for anti-fraud
      let gps;
      try {
        gps = await requestLocation({ force: true });
      } catch {
        gps = confirmedLoc;
      }
      if (!gps) throw new Error('GPS required at shutter. Enable location and retry.');

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      stampOntoCanvas(canvas, gps);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

      const label = LABELS[photos.length] || `photo-${photos.length + 1}`;
      const next = [
        ...photos,
        {
          data: dataUrl,
          previewUrl: dataUrl,
          timestamp: gps.timestamp,
          label,
          latitude: gps.latitude,
          longitude: gps.longitude,
          accuracy: gps.accuracy,
          live_capture: true,
        },
      ];
      setPhotos(next);
      setConfirmedLoc(gps);
    } catch (err) {
      setError(err.message || 'Capture failed');
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    if (photos.length < minPhotos) {
      setError(`At least ${minPhotos} live photos are required.`);
      return;
    }
    const last = photos[photos.length - 1];
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture({
      photos,
      latitude: last.latitude,
      longitude: last.longitude,
      timestamp: last.timestamp,
      accuracy: last.accuracy,
      location_confirmed: true,
    });
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setError('');
  };

  if (phase === 'location') {
    return (
      <div className="form-group">
        <label>Step 1 · Confirm exact location</label>
        <p className="text-small text-muted" style={{ marginBottom: 12 }}>
          Location is required before the camera opens. This prevents gallery / AI uploads from
          another place and helps authorities find the spot.
        </p>
        {(error || locError) && <div className="alert alert-error">{error || locError}</div>}
        {confirmedLoc ? (
          <div className="panel-quiet" style={{ marginBottom: 12 }}>
            <div className="stat-label">Detected GPS</div>
            <p className="font-semibold" style={{ margin: '4px 0' }}>
              {confirmedLoc.latitude.toFixed(6)}, {confirmedLoc.longitude.toFixed(6)}
            </p>
            <p className="text-small text-muted" style={{ margin: 0 }}>
              {confirmedLoc.accuracy != null ? `Accuracy ±${Math.round(confirmedLoc.accuracy)}m · ` : ''}
              {new Date(confirmedLoc.timestamp).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="alert alert-warning">Waiting for location permission…</div>
        )}
        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={refreshLocation} disabled={locLoading}>
            {locLoading ? 'Reading GPS…' : 'Refresh location'}
          </button>
          <button type="button" className="btn btn-accent" onClick={openCamera} disabled={!confirmedLoc || locLoading}>
            Confirm location & open camera
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-group">
      <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
        <label style={{ margin: 0 }}>
          Live capture ({photos.length}/{maxPhotos})
        </label>
        <span className="text-small text-muted">Min {minPhotos} · Max {maxPhotos}</span>
      </div>
      <p className="text-small text-muted" style={{ marginBottom: 12 }}>
        Live camera only. Each photo is stamped with GPS + time at shutter. Gallery / AI images are not accepted.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="camera-stage">
        <video ref={videoRef} playsInline muted className="camera-video" />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {!liveReady && (
          <div className="camera-overlay">
            <div className="spinner" />
            <span>Starting live camera…</span>
          </div>
        )}
      </div>

      <div className="flex gap-1" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        {photos.length < maxPhotos && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !liveReady}
            onClick={captureFromLive}
          >
            {busy ? 'Stamping GPS…' : `Capture photo ${photos.length + 1}`}
          </button>
        )}
        {photos.length >= minPhotos && (
          <button type="button" className="btn btn-accent" onClick={finish}>
            Use these {photos.length} photos
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
            setPhase('location');
            setLiveReady(false);
          }}
        >
          Change location
        </button>
      </div>

      {photos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="image-gallery">
            {photos.map((photo, index) => (
              <div key={index} className="photo-thumb-wrap">
                <img src={photo.previewUrl} alt={photo.label} className="image-thumbnail" />
                <span className="photo-label">{photo.label}</span>
                <button type="button" className="photo-remove" onClick={() => removePhoto(index)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
