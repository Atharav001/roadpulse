import React, { useEffect, useRef, useState } from 'react';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: new Date().toISOString(),
        }),
      () =>
        reject(
          new Error(
            'Location permission denied. Enable GPS/location access and try again.'
          )
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

/**
 * Live camera capture (prefer getUserMedia). Gallery blocked via capture="environment" fallback.
 * GPS + timestamp recorded at each shutter press. Photo 1 = closeup, Photo 2 = context.
 */
export default function CameraCapture({ onCapture, maxPhotos = 2 }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const streamRef = useRef(null);

  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [liveReady, setLiveReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setUseFallback(true);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setLiveReady(true);
        }
      } catch {
        setUseFallback(true);
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const finishIfReady = (nextPhotos, gps) => {
    if (nextPhotos.length < maxPhotos) return;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture({
      photos: nextPhotos,
      latitude: gps.latitude,
      longitude: gps.longitude,
      timestamp: gps.timestamp,
    });
  };

  const captureFromLive = async () => {
    setError('');
    setBusy(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !liveReady) throw new Error('Camera not ready');

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const gps = await getGps();

      const label = photos.length === 0 ? 'closeup' : 'context';
      const next = [
        ...photos,
        {
          data: dataUrl,
          previewUrl: dataUrl,
          timestamp: gps.timestamp,
          label,
          latitude: gps.latitude,
          longitude: gps.longitude,
        },
      ];
      setPhotos(next);
      finishIfReady(next, gps);
    } catch (err) {
      setError(err.message || 'Capture failed');
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const gps = await getGps();
      const label = photos.length === 0 ? 'closeup' : 'context';
      const next = [
        ...photos,
        {
          data: dataUrl,
          previewUrl: dataUrl,
          timestamp: gps.timestamp,
          label,
          latitude: gps.latitude,
          longitude: gps.longitude,
        },
      ];
      setPhotos(next);
      finishIfReady(next, gps);
    } catch (err) {
      setError(err.message || 'Capture failed');
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setError('');
  };

  return (
    <div className="form-group">
      <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
        <label style={{ margin: 0 }}>
          Live capture ({photos.length}/{maxPhotos})
        </label>
        <span className="text-small text-muted">
          {photos.length === 0 ? 'Close-up shot' : photos.length === 1 ? 'Context shot' : 'Ready'}
        </span>
      </div>
      <p className="text-small text-muted" style={{ marginBottom: 16 }}>
        Two live photos required. GPS and time are locked at each shutter press. Gallery upload is not used.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {!useFallback && (
        <div className="camera-stage">
          <video ref={videoRef} playsInline muted className="camera-video" />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {!liveReady && (
            <div className="camera-overlay">
              <div className="spinner" />
              <span>Starting camera…</span>
            </div>
          )}
        </div>
      )}

      {useFallback && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      )}

      {photos.length < maxPhotos && (
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={busy || (!useFallback && !liveReady)}
          onClick={() => (useFallback ? inputRef.current?.click() : captureFromLive())}
          style={{ marginTop: 12 }}
        >
          {busy
            ? 'Capturing location…'
            : photos.length === 0
              ? 'Capture close-up'
              : 'Capture context photo'}
        </button>
      )}

      {photos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="image-gallery">
            {photos.map((photo, index) => (
              <div key={index} className="photo-thumb-wrap">
                <img src={photo.previewUrl} alt={photo.label} className="image-thumbnail" />
                <span className="photo-label">{photo.label}</span>
                {photos.length < maxPhotos && (
                  <button type="button" className="photo-remove" onClick={() => removePhoto(index)}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
