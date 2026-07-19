import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, getCurrentUser } from '../api/client';
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

const STEPS = [
  {
    icon: IconCamera,
    title: 'Capture on-site',
    desc: 'Two live photos with GPS locked at shutter — close-up and context.',
  },
  {
    icon: IconSpark,
    title: 'AI classifies & routes',
    desc: 'Severity grading, landmark detection, duplicate merge, department routing.',
  },
  {
    icon: IconChart,
    title: 'Track in public',
    desc: 'Follow your ticket and see ward resolution performance, openly.',
  },
];

const FEATURES = [
  { icon: IconShield, title: 'AI severity grading', desc: 'Every report scored for urgency before it enters the queue.' },
  { icon: IconMerge, title: 'Duplicate merging', desc: 'Same issue within ~30m becomes one incident — honest ward stats.' },
  { icon: IconMapPin, title: 'Landmark precision', desc: 'GPS becomes a findable location line for field teams.' },
  { icon: IconMail, title: 'Complaint email draft', desc: 'Formal email ready for the assigned department.' },
  { icon: IconLayers, title: 'Public transparency', desc: 'Pending queues and 60-day escalations visible to everyone.' },
  { icon: IconCheck, title: 'Authority resolve', desc: 'Department queue with status updates that refresh the dashboard.' },
];

export default function Home() {
  const navigate = useNavigate();
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

  return (
    <div className="home">
      <section className="hero-band grid-bg animate-in">
        <div className="container hero-layout">
          <div className="hero-copy">
            <div className="pill-badge">
              <IconSpark />
              Civic accountability platform
            </div>
            <h1 className="hero-title">
              Report road damage.
              <em> See it get fixed.</em>
            </h1>
            <p className="hero-sub">
              RoadPulse is the layer after capture — AI severity, real duplicate merging,
              landmark-precise location, and a public dashboard that makes response time visible.
            </p>
            <div className="hero-cta">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => go('/report')}>
                Report an issue <IconArrowRight />
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/dashboard')}>
                Open dashboard
              </button>
            </div>
          </div>

          <div className="hero-panel glass-panel">
            <div className="hero-panel-label">Live city pulse</div>
            <div className="metric-grid">
              <div>
                <span>Open issues</span>
                <strong>{metrics?.open_count ?? '—'}</strong>
              </div>
              <div>
                <span>Resolved</span>
                <strong>{metrics?.resolved_count ?? '—'}</strong>
              </div>
              <div>
                <span>Resolution rate</span>
                <strong>{metrics ? `${metrics.resolution_rate_percent}%` : '—'}</strong>
              </div>
              <div>
                <span>Total tracked</span>
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
          <p className="eyebrow">How it works</p>
          <h2>Three steps. Full transparency.</h2>
        </div>
        <div className="steps-row">
          {STEPS.map((s, i) => {
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
          <p className="eyebrow">Capabilities</p>
          <h2>Built for accountability, not just intake</h2>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => {
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
            <h2>Public ward performance, always on</h2>
            <p>Resolution rates, pending queues, and escalated issues — visible without a login.</p>
          </div>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
            View transparency dashboard <IconArrowRight />
          </button>
        </div>
      </section>
    </div>
  );
}
