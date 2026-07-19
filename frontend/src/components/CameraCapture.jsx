import React, { useRef, useState } from 'react';

export default function CameraCapture({ onCapture, maxPhotos = 2 }) {
  const inputRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [locationError, setLocationError] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const triggerCapture = () => {
    setLocationError(null);
    inputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    const timestamp = new Date().toISOString();
    const newPhoto = { file, previewUrl, timestamp };
    const newPhotos = [...photos, newPhoto];
    setPhotos(newPhotos);

    e.target.value = '';

    if (newPhotos.length === maxPhotos) {
      setGpsLoading(true);

      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser. Please use a device with GPS.');
        setGpsLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLoading(false);
          onCapture({
            photos: newPhotos,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date().toISOString(),
          });
        },
        () => {
          setGpsLoading(false);
          setLocationError(
            'Location permission denied. Please enable GPS/location access in your browser settings and try again.'
          );
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  };

  const removePhoto = (index) => {
    URL.revokeObjectURL(photos[index].previewUrl);
    setPhotos(photos.filter((_, i) => i !== index));
    setLocationError(null);
    setGpsLoading(false);
  };

  return (
    <div className="form-group">
      <label>Photo Capture ({photos.length}/{maxPhotos})</label>
      <p className="text-small text-muted">
        Take exactly {maxPhotos} photos using your device camera. Location is captured when the second photo is taken.
      </p>

      {locationError && <div className="alert alert-error">{locationError}</div>}
      {gpsLoading && (
        <div className="alert alert-info">Getting GPS location from your second photo…</div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {photos.length < maxPhotos && !gpsLoading && (
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={triggerCapture}
        >
          📸 {photos.length === 0 ? 'Take Photo 1' : 'Take Photo 2'}
        </button>
      )}

      {photos.length > 0 && (
        <div>
          <h4 style={{ marginBottom: '1rem', marginTop: '1rem' }}>Captured Photos</h4>
          <div className="image-gallery">
            {photos.map((photo, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <img
                  src={photo.previewUrl}
                  alt={`Photo ${index + 1}`}
                  className="image-thumbnail"
                />
                {!gpsLoading && photos.length < maxPhotos && (
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: 'rgba(255, 0, 0, 0.7)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                    }}
                  >
                    ✕
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
