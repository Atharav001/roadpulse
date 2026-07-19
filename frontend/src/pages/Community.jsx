import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IncidentCard from '../components/IncidentCard';
import { useLocation } from '../LocationContext';
import { incidentsAPI } from '../api/client';

export default function Community() {
  const navigate = useNavigate();
  const { location, requestLocation, error: locError, hasLocation, status } = useLocation();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [radius, setRadius] = useState(2000);

  useEffect(() => {
    requestLocation({ force: false }).catch(() => {});
  }, [requestLocation]);

  useEffect(() => {
    if (!hasLocation) {
      setLoading(false);
      return;
    }
    loadNearby();
  }, [location?.latitude, location?.longitude, radius]);

  const loadNearby = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await incidentsAPI.nearby({
        lat: location.latitude,
        lng: location.longitude,
        radius_m: radius,
      });
      setIncidents(res.incidents || []);
    } catch (err) {
      setError(err.message || 'Failed to load community issues');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page animate-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">Around you</p>
          <h1>Community issues</h1>
          <p className="text-small text-muted" style={{ margin: 0 }}>
            Open reports near your location. Similar spots (~15m) are merged into one incident.
          </p>
        </div>
        <button type="button" className="btn btn-accent" onClick={() => navigate('/report')}>
          Report nearby
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="flex justify-between items-center gap-2" style={{ flexWrap: 'wrap' }}>
          <div>
            <div className="stat-label">Your location</div>
            {hasLocation ? (
              <p className="font-semibold text-small" style={{ margin: 0 }}>
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                {location.accuracy != null ? ` · ±${Math.round(location.accuracy)}m` : ''}
                {status === 'cached' ? ' · last saved' : ''}
              </p>
            ) : (
              <p className="text-small text-muted" style={{ margin: 0 }}>Location needed to show nearby issues</p>
            )}
          </div>
          <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              style={{ width: 'auto', borderRadius: 999 }}
              aria-label="Search radius"
            >
              <option value={500}>500 m</option>
              <option value={2000}>2 km</option>
              <option value={5000}>5 km</option>
            </select>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => requestLocation({ force: true }).then(loadNearby).catch(() => {})}
            >
              Refresh GPS
            </button>
          </div>
        </div>
        {(locError || error) && <div className="alert alert-error" style={{ marginTop: 12 }}>{error || locError}</div>}
      </div>

      {!hasLocation && (
        <div className="empty-state">
          <h3>Enable location to view your area</h3>
          <p className="text-muted">Community issues are filtered by where you are.</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => requestLocation({ force: true })}>
            Allow location
          </button>
        </div>
      )}

      {hasLocation && loading && (
        <div className="flex flex-center" style={{ padding: 48 }}>
          <div className="spinner" />
        </div>
      )}

      {hasLocation && !loading && incidents.length === 0 && (
        <div className="empty-state">
          <h3>No open issues nearby</h3>
          <p className="text-muted">Be the first to report a problem in this area.</p>
          <button type="button" className="btn btn-accent" style={{ marginTop: 16 }} onClick={() => navigate('/report')}>
            Report an issue
          </button>
        </div>
      )}

      {hasLocation && !loading && incidents.length > 0 && (
        <div className="panel">
          <p className="text-small text-muted" style={{ marginBottom: 8 }}>
            {incidents.length} open issue{incidents.length !== 1 ? 's' : ''} within {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
          </p>
          {incidents.map((i) => (
            <div key={i.id}>
              <IncidentCard incident={i} />
              {i.distance_m != null && (
                <p className="text-small text-muted" style={{ margin: '-8px 0 12px' }}>
                  ~{Math.round(i.distance_m)} m away · {i.report_count || 1} reporter{(i.report_count || 1) !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
