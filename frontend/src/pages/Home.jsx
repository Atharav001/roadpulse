import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api/client';

const FEATURES = [
  {
    title: 'AI severity grading',
    desc: 'Two live photos + description classified into issue type and severity in one pass.',
  },
  {
    title: 'Duplicate merging',
    desc: 'Reports within ~30m of the same type merge into one incident so ward stats stay honest.',
  },
  {
    title: 'Landmark precision',
    desc: 'Nearby Places landmarks turn raw GPS into a location line authorities can actually find.',
  },
  {
    title: 'Auto complaint draft',
    desc: 'Routed to the right department with a formal email draft ready to copy.',
  },
  {
    title: 'Public accountability',
    desc: 'Ward dashboard shows resolution rate, pending queue, and 60-day escalations.',
  },
  {
    title: 'Authority queue',
    desc: 'One demo login. Department-scoped queue with resolve actions that update the dashboard.',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  return (
    <div className="container page">
      <section className="hero-home">
        <div className="page-kicker">Product Space × Code Benders</div>
        <h1>RoadPulse</h1>
        <p className="lede">
          The layer after reporting: AI severity, real duplicate merging, landmark-precise
          location, auto-drafted complaints, and a public dashboard that makes response time visible.
        </p>
        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
          {user ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => navigate('/report')}>
                Report an issue
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                Public dashboard
              </button>
              {user.role === 'authority' && (
                <button type="button" className="btn btn-accent" onClick={() => navigate('/authority')}>
                  Authority queue
                </button>
              )}
            </>
          ) : (
            <>
              <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
                Sign in to report
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                View dashboard
              </button>
            </>
          )}
        </div>
      </section>

      <div className="feature-list">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature-item">
            <h3>{f.title}</h3>
            <p className="text-small text-muted" style={{ margin: 0 }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
