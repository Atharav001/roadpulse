import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IncidentCard from '../components/IncidentCard';
import { getCurrentUser, reportsAPI } from '../api/client';
import { useI18n } from '../i18n';

export default function MyReports() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const user = getCurrentUser();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.user_id) {
      navigate('/login');
      return;
    }
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id]);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await reportsAPI.getByUser(user.user_id);
      setReports(response.reports || []);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container page animate-in">
      <div className="page-header">
        <div>
          <p className="eyebrow">{t('auth_citizen')}</p>
          <h1>{t('my_reports_title')}</h1>
          <p className="text-small text-muted" style={{ margin: 0 }}>{t('report_sub')}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/report')}>
          {t('home_cta_report')}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button type="button" className="btn btn-secondary btn-small" style={{ marginLeft: 12 }} onClick={fetchReports}>
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-center" style={{ padding: 48 }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="empty-state">
          <h3>{t('my_reports_empty')}</h3>
          <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/report')}>
            {t('home_cta_report')}
          </button>
        </div>
      )}

      {!loading && reports.length > 0 && (
        <div className="panel">
          <p className="text-small text-muted" style={{ marginBottom: 8 }}>
            {reports.length} submission{reports.length !== 1 ? 's' : ''}
          </p>
          {reports.map((r) => (
            <IncidentCard
              key={r.id}
              incident={{
                id: r.incident_id || r.id,
                issue_type: r.issue_type,
                severity: r.severity,
                landmark_description: r.landmark_description,
                status: r.status,
                report_count: r.report_count,
                first_reported_at: r.created_at,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
