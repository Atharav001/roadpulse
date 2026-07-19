import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, getCurrentUser } from '../api/client';
import { useI18n } from '../i18n';
import {
  IconArrowRight,
  IconCamera,
  IconChart,
  IconCheck,
  IconLayers,
  IconMail,
  IconMapPin,
  IconMerge,
  IconShield,
  IconSpark,
} from '../components/Icons';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const user = getCurrentUser();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    dashboardAPI.getOverview().then(setMetrics).catch(() => setMetrics(null));
  }, []);

  const go = (path) => {
    if ((path === '/report' || path === '/my-reports') && !user) {
      navigate('/login', { state: { from: path } });
      return;
    }
    navigate(path);
  };

  const steps = [
    { icon: IconMapPin, title: t('home_step1_t'), desc: t('home_step1_d') },
    { icon: IconCamera, title: t('home_step2_t'), desc: t('home_step2_d') },
    { icon: IconChart, title: t('home_step3_t'), desc: t('home_step3_d') },
  ];

  const features = [
    { icon: IconShield, title: t('home_f1_t'), desc: t('home_f1_d') },
    { icon: IconMerge, title: t('home_f2_t'), desc: t('home_f2_d') },
    { icon: IconMapPin, title: t('home_f3_t'), desc: t('home_f3_d') },
    { icon: IconMail, title: t('home_f4_t'), desc: t('home_f4_d') },
    { icon: IconLayers, title: t('home_f5_t'), desc: t('home_f5_d') },
    { icon: IconCheck, title: t('home_f6_t'), desc: t('home_f6_d') },
  ];

  return (
    <div className="home">
      <section className="hero-band grid-bg animate-in">
        <div className="container hero-layout">
          <div className="hero-copy">
            <div className="pill-badge">
              <IconSpark />
              {t('home_badge')}
            </div>
            <h1 className="hero-title">
              {t('home_hero_1')}
              <em> {t('home_hero_2')}</em>
            </h1>
            <p className="hero-sub">{t('home_sub')}</p>
            <div className="hero-cta">
              <button type="button" className="btn btn-accent btn-lg" onClick={() => go('/report')}>
                {t('home_cta_report')} <IconArrowRight />
              </button>
              <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
                {t('home_cta_dash')}
              </button>
            </div>
          </div>

          <div className="hero-panel glass-panel">
            <div className="hero-panel-label">{t('home_pulse')}</div>
            <div className="metric-grid">
              <div>
                <span>{t('home_open')}</span>
                <strong>{metrics?.open_count ?? '—'}</strong>
              </div>
              <div>
                <span>{t('home_resolved')}</span>
                <strong>{metrics?.resolved_count ?? '—'}</strong>
              </div>
              <div>
                <span>{t('home_rate')}</span>
                <strong>{metrics ? `${metrics.resolution_rate_percent}%` : '—'}</strong>
              </div>
              <div>
                <span>{t('home_total')}</span>
                <strong>{metrics?.total_incidents ?? '—'}</strong>
              </div>
            </div>
            <div className="status-pills">
              {(metrics?.by_status || [
                { status: 'reported', count: 0 },
                { status: 'routed', count: 0 },
                { status: 'resolved', count: 0 },
              ]).map((s) => (
                <span key={s.status} className={`status-pill status-${s.status}`}>
                  {s.status.replace(/_/g, ' ')} · {s.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container section-block animate-in delay-1">
        <div className="section-head center">
          <p className="eyebrow">{t('home_how')}</p>
          <h2>{t('home_how_title')}</h2>
        </div>
        <div className="steps-row">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <article key={s.title} className="step-card">
                <div className="step-icon"><Icon /></div>
                <span className="step-num">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="container section-block animate-in delay-2">
        <div className="section-head">
          <p className="eyebrow">{t('home_cap')}</p>
          <h2>{t('home_cap_title')}</h2>
        </div>
        <div className="feature-grid">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <article key={f.title} className="feature-tile">
                <div className="feature-icon"><Icon /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="container section-block animate-in delay-3">
        <div className="cta-band glass-panel">
          <div>
            <h2>{t('home_cta_title')}</h2>
            <p>{t('home_cta_sub')}</p>
          </div>
          <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
              {t('nav_dashboard')} <IconArrowRight />
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/community')}>
              {t('home_cta_community')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
