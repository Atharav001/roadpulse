import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'roadpulse_last_location';
/** Never trust a cached pin older than this — prevents Manipal leftover while you’re in Delhi */
const CACHE_MAX_AGE_MS = 2 * 60 * 1000;
const LocationContext = createContext(null);

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.latitude == null || parsed?.longitude == null) return null;
    const age = Date.now() - new Date(parsed.timestamp || 0).getTime();
    if (!Number.isFinite(age) || age > CACHE_MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { ...parsed, source: 'cached' };
  } catch {
    return null;
  }
}

function persist(loc) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
}

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [accuracy, setAccuracy] = useState(null);

  const requestLocation = useCallback((opts = {}) => {
    const { force = true } = opts;
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
            timestamp: new Date().toISOString(),
            source: 'gps',
          };
          setLocation(next);
          setAccuracy(next.accuracy);
          persist(next);
          setStatus('ready');
          resolve(next);
        },
        (err) => {
          // Never silently reuse a stale city (e.g. Manipal while you are in Delhi)
          if (!force) {
            const cached = readStored();
            if (cached) {
              setLocation(cached);
              setAccuracy(cached.accuracy ?? null);
              setStatus('cached');
              setError('Live GPS unavailable — using a very recent pin. Tap Refresh for a new reading.');
              resolve(cached);
              return;
            }
          }
          const msg =
            err.code === 1
              ? 'Location permission denied. Enable location for precise reporting.'
              : 'Could not read live GPS. Enable location / turn on precise location and try Refresh.';
          setError(msg);
          setStatus('denied');
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 25000,
          // Always prefer a fresh reading for reporting
          maximumAge: force ? 0 : 15000,
        }
      );
    });
  }, []);

  // Fresh GPS on app open — do not hydrate from old Manipal/Bangalore cache
  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY);
    requestLocation({ force: true }).catch(() => {});
  }, [requestLocation]);

  const clearCachedLocation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLocation(null);
    setStatus('idle');
  }, []);

  const value = {
    location,
    status,
    error,
    accuracy,
    requestLocation,
    clearCachedLocation,
    hasLocation: !!(location?.latitude != null && location?.longitude != null),
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
