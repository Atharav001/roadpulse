import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IncidentCard from '../components/IncidentCard';
import { useLocation } from '../LocationContext';
import { incidentsAPI } from '../api/client';
import { useI18n } from '../i18n';

export default function Community() {
  const navigate = useNavigate();
  const { t } = useI18n();
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
          <p className="eyebrow">{t('comm_eyebrow')}</p>
          <h1>{t('comm_title')}</h1>
          <p className="text-small text-muted" style={{ margin: 0 }}>
            {t('comm_sub')}
          </p>
        </div>
        <button type="button" className="btn btn-accent" onClick={() => navigate('/report')}>
          {t('comm_report')}
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="flex justify-between items-center gap-2" style={{ flexWrap: 'wrap' }}>
          <div>
            <div className="stat-label">{t('comm_your_loc')}</div>
            {hasLocation ? (
              <p className="font-semibold text-small" style={{ margin: 0 }}>
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                {location.accuracy != null ? ` · ±${Math.round(location.accuracy)}m` : ''}
                {status === 'cached' ? ' · last saved' : ''}
              </p>
            ) : (
              <p className="text-small text-muted" style={{ margin: 0 }}>{t('comm_need_loc')}</p>
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
              {t('comm_refresh')}
            </button>
          </div>
        </div>
        {(locError || error) && <div className="alert alert-error" style={{ marginTop: 12 }}>{error || locError}</div>}
      </div>

      {!hasLocation && (
        <div className="empty-state">
          <h3>{t('comm_enable_title')}</h3>
          <p className="text-muted">{t('comm_enable_sub')}</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => requestLocation({ force: true })}>
            {t('comm_allow')}
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
          <h3>{t('comm_none_title')}</h3>
          <p className="text-muted">{t('comm_none_sub')}</p>
          <button type="button" className="btn btn-accent" style={{ marginTop: 16 }} onClick={() => navigate('/report')}>
            {t('comm_none_cta')}
          </button>
        </div>
      )}

      {hasLocation && !loading && incidents.length > 0 && (
        <div className="incident-list">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  );
}
