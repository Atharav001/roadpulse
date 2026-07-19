import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from '../LocationContext';
import { useI18n } from '../i18n';

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 4;
const LABELS = ['closeup', 'context', 'angle-3', 'angle-4'];
const MAX_VIDEO_MS = 10000;

function stampOntoCanvas(canvas, gps) {
  const ctx = canvas.getContext('2d');
  const stamp = [
    'RoadPulse LIVE',
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

export default function CameraCapture({
  onCapture,
  minPhotos = MIN_PHOTOS,
  maxPhotos = MAX_PHOTOS,
  initialPhotos = [],
  skipGuide = false,
}) {
  const { t } = useI18n();
  const { requestLocation, error: locError } = useLocation();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [phase, setPhase] = useState(() => (skipGuide || initialPhotos.length ? 'camera' : 'guide'));
  const [confirmedLoc, setConfirmedLoc] = useState(null);
  const [photos, setPhotos] = useState(() => initialPhotos || []);
  const [videoClip, setVideoClip] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [liveReady, setLiveReady] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [hint, setHint] = useState('');

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  // Resume capture after deleting a photo on review
  useEffect(() => {
    if (phase === 'camera' && (skipGuide || initialPhotos.length)) {
      openCameraFromResume();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCameraFromResume = async () => {
    setLiveReady(false);
    try {
      const fresh = await requestLocation({ force: true });
      setConfirmedLoc(fresh);
      await startCameraStream();
      setHint(t('remove_retake'));
    } catch (err) {
      setError(err.message || 'Could not reopen camera');
      setPhase('location');
    }
  };

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
    if (phase === 'location') {
      refreshLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startCameraStream = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Live camera is required. Gallery uploads are blocked.');
    }
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
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
  };

  const openCamera = async () => {
    setError('');
    setHint('');
    if (!confirmedLoc) {
      setError('Confirm your exact location before opening the camera.');
      return;
    }
    setPhase('camera');
    setLiveReady(false);
    try {
      const fresh = await requestLocation({ force: true }).catch(() => confirmedLoc);
      if (fresh) setConfirmedLoc(fresh);
      await startCameraStream();
    } catch {
      setError('Camera permission denied. Live capture is required.');
      setPhase('location');
    }
  };

  const captureFromLive = async () => {
    setError('');
    setHint('');
    setBusy(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !liveReady) throw new Error('Camera not ready');

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
      setPhotos((prev) => [
        ...prev,
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
      ]);
      setConfirmedLoc(gps);
    } catch (err) {
      setError(err.message || 'Capture failed');
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setError('');
    setHint(t('remove_retake'));
    if (phase !== 'camera') {
      setPhase('camera');
      setLiveReady(false);
      try {
        await startCameraStream();
      } catch {
        setError('Could not reopen camera. Try again.');
      }
    } else if (!liveReady) {
      try {
        await startCameraStream();
      } catch {
        /* ignore */
      }
    }
  };

  const toggleVideo = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (!streamRef.current || photos.length < minPhotos) {
      setError(`Take at least ${minPhotos} photos before recording video.`);
      return;
    }
    try {
      chunksRef.current = [];
      const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoClip({ blob, previewUrl: url, timestamp: new Date().toISOString() });
        setRecording(false);
      };
      recorder.start();
      setRecording(true);
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, MAX_VIDEO_MS);
    } catch {
      setError('Video recording is not supported on this browser.');
    }
  };

  const finish = () => {
    if (photos.length < minPhotos) {
      setError(`At least ${minPhotos} live photos are required.`);
      return;
    }
    const last = photos[photos.length - 1];
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    onCapture({
      photos,
      video: videoClip || null,
      latitude: last.latitude,
      longitude: last.longitude,
      timestamp: last.timestamp,
      accuracy: last.accuracy,
      location_confirmed: true,
    });
  };

  if (phase === 'guide') {
    return (
      <div className="form-group">
        <label>{t('report_howto_title')}</label>
        <ol className="howto-list">
          <li>{t('report_howto_1')}</li>
          <li>{t('report_howto_2')}</li>
          <li>{t('report_howto_3')}</li>
          <li>{t('report_howto_video')}</li>
        </ol>
        <button type="button" className="btn btn-primary btn-block" onClick={() => setPhase('location')}>
          {t('confirm_gps')}
        </button>
      </div>
    );
  }

  if (phase === 'location') {
    return (
      <div className="form-group">
        <label>{t('step_gps')}</label>
        <p className="text-small text-muted" style={{ marginBottom: 12 }}>
          {t('step_gps_help')}
        </p>
        {(error || locError) && <div className="alert alert-error">{error || locError}</div>}
        {confirmedLoc ? (
          <div className="panel-quiet" style={{ marginBottom: 12 }}>
            <div className="stat-label">Live GPS</div>
            <p className="font-semibold" style={{ margin: '4px 0' }}>
              {confirmedLoc.latitude.toFixed(6)}, {confirmedLoc.longitude.toFixed(6)}
            </p>
            <p className="text-small text-muted" style={{ margin: 0 }}>
              {confirmedLoc.accuracy != null ? `Accuracy ±${Math.round(confirmedLoc.accuracy)}m · ` : ''}
              {new Date(confirmedLoc.timestamp).toLocaleString()}
              {confirmedLoc.source === 'gps' ? ' · live' : ''}
            </p>
          </div>
        ) : (
          <div className="alert alert-warning">{t('waiting_gps')}</div>
        )}
        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={refreshLocation} disabled={locLoading}>
            {locLoading ? t('reading_gps') : t('refresh_gps')}
          </button>
          <button type="button" className="btn btn-accent" onClick={openCamera} disabled={!confirmedLoc || locLoading}>
            {t('confirm_gps')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setPhase('guide')}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-group">
      <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
        <label style={{ margin: 0 }}>
          {t('capture_title')} ({photos.length}/{maxPhotos})
        </label>
        <span className="text-small text-muted">Min {minPhotos} · Max {maxPhotos}</span>
      </div>
      <p className="text-small text-muted" style={{ marginBottom: 12 }}>
        {photos.length === 0 && t('report_howto_1')}
        {photos.length === 1 && t('report_howto_2')}
        {photos.length >= 2 && t('capture_hint')}
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {hint && <div className="alert alert-info">{hint}</div>}

      <div className="camera-stage">
        <video ref={videoRef} playsInline muted className="camera-video" />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {!liveReady && (
          <div className="camera-overlay">
            <div className="spinner" />
            <span>Starting live camera…</span>
          </div>
        )}
        {recording && <div className="rec-badge">REC</div>}
      </div>

      <div className="flex gap-1" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        {photos.length < maxPhotos && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !liveReady || recording}
            onClick={captureFromLive}
          >
            {busy ? 'Stamping GPS…' : `${t('capture_btn')} ${photos.length + 1}`}
          </button>
        )}
        {photos.length >= minPhotos && photos.length < maxPhotos && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || !liveReady || recording}
            onClick={captureFromLive}
          >
            {t('add_more')}
          </button>
        )}
        {photos.length >= minPhotos && (
          <button
            type="button"
            className={`btn ${recording ? 'btn-danger' : 'btn-secondary'}`}
            disabled={!liveReady}
            onClick={toggleVideo}
          >
            {recording ? t('stop_video') : t('record_video')}
          </button>
        )}
        {photos.length >= minPhotos && (
          <button type="button" className="btn btn-accent" onClick={finish} disabled={recording}>
            {t('use_photos')} ({photos.length})
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            streamRef.current?.getTracks().forEach((tr) => tr.stop());
            setPhase('location');
            setLiveReady(false);
            setHint('');
          }}
        >
          {t('change_location')}
        </button>
      </div>

      {photos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="image-gallery">
            {photos.map((photo, index) => (
              <div key={`${photo.timestamp}-${index}`} className="photo-thumb-wrap">
                <img src={photo.previewUrl} alt={photo.label} className="image-thumbnail" />
                <span className="photo-label">{photo.label}</span>
                <button
                  type="button"
                  className="photo-remove"
                  aria-label="Remove photo"
                  onClick={() => removePhoto(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {videoClip && (
        <div style={{ marginTop: 12 }}>
          <video src={videoClip.previewUrl} controls className="video-preview" />
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setVideoClip(null)}>
            Remove video
          </button>
        </div>
      )}
    </div>
  );
}
