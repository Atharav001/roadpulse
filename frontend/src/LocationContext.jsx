import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'roadpulse_last_location';
const LocationContext = createContext(null);

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.latitude == null || parsed?.longitude == null) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(loc) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
}

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(() => readStored());
  const [status, setStatus] = useState(location ? 'cached' : 'idle');
  const [error, setError] = useState('');
  const [accuracy, setAccuracy] = useState(location?.accuracy ?? null);

  const requestLocation = useCallback((opts = {}) => {
    const { force = false, maximumAge = force ? 0 : 60000 } = opts;
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const msg = 'Geolocation is not supported on this device/browser.';
        setError(msg);
        setStatus('unsupported');
        reject(new Error(msg));
        return;
      }

      setStatus('requesting');
      setError('');

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
            source: 'gps',
          };
          setLocation(next);
          setAccuracy(next.accuracy);
          persist(next);
          setStatus('ready');
          resolve(next);
        },
        (err) => {
          const cached = readStored();
          if (cached && !force) {
            setLocation(cached);
            setStatus('cached');
            setError('Live GPS unavailable — using your last saved location.');
            resolve(cached);
            return;
          }
          const msg =
            err.code === 1
              ? 'Location permission denied. Enable location for precise reporting and community issues.'
              : 'Could not read GPS. Enable location and try again.';
          setError(msg);
          setStatus('denied');
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge }
      );
    });
  }, []);

  // Ask for location when the site opens
  useEffect(() => {
    requestLocation({ force: false }).catch(() => {});
  }, [requestLocation]);

  const value = {
    location,
    status,
    error,
    accuracy,
    requestLocation,
    hasLocation: !!(location?.latitude != null && location?.longitude != null),
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
